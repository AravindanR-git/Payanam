import { generateUuid } from "../../utils/uuid";
import db from "../db";
import { enqueueSync } from "../../services/syncEnqueue";
import { uploadEntity, pullEntity, mapSupabaseRowToLocalRow, validateRecordForDexie } from "../../services/supabaseSync";

const CONTINUE_WINDOW_MS = 24 * 60 * 60 * 1000;

const TripRepository = {
  async createTrip(data) {
    const activeTrip = await this.getActiveTrip();

    if (activeTrip) {
      throw new Error(
        "Finish the active journey before creating another one."
      );
    }

    const now = new Date().toISOString();

    const trip = {
      id: generateUuid(),
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      ...data,
    };

    await db.transaction("rw", db.trips, async () => {
      const completedTrips =
        await db.trips
          .where("status")
          .equals("COMPLETED")
          .toArray();

      const now = Date.now();

      for (const completedTrip of completedTrips) {
        const endedAt = completedTrip.endedAt || completedTrip.endDate;

        if (
          !completedTrip.continuationClosedAt &&
          endedAt &&
          now - new Date(endedAt).getTime() <= CONTINUE_WINDOW_MS
        ) {
          await db.trips.update(completedTrip.id, {
            continuationClosedAt: now,
          });
        }
      }

      await db.trips.add(trip);
    });

    // Keep the Dexie transaction Dexie-only; enqueueing may schedule sync work.
    await enqueueSync("trips", trip.id, "CREATE", trip);

    console.log('[TripRepository] createTrip: tripId=', trip.id, 'name=', trip.tripName, 'userId=', trip.userId, 'online=', navigator.onLine);

    if (navigator.onLine) {
      uploadEntity('trips', trip).catch((error) => {
        console.error('[TripRepository] createTrip upload error:', error);
      });
    } else {
      console.log('[TripRepository] createTrip: offline, skipping upload');
    }

    return trip;
  },

  async getActiveTrip() {
    const activeTrips = await db.trips
      .where("status")
      .equals("ACTIVE")
      .toArray();

    return activeTrips.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0];
  },

  async getTrip(id) {
    return await db.trips.get(id);
  },

  async getAllTrips() {
    return await db.trips
      .orderBy("createdAt")
      .reverse()
      .toArray();
  },

  async getCompletedTrips() {
    const trips = await db.trips
      .where("status")
      .equals("COMPLETED")
      .toArray();

    return trips.sort(
      (a, b) =>
        new Date(b.endedAt || b.endDate || b.updatedAt) -
        new Date(a.endedAt || a.endDate || a.updatedAt)
    );
  },

  async endTrip(id) {
    const endedAt = new Date().toISOString();

    await db.trips
      .where("status")
      .equals("ACTIVE")
      .modify((trip) => {
        trip.status = "COMPLETED";
        trip.endedAt = endedAt;
        trip.endDate = endedAt;
        trip.updatedAt = endedAt;
      });

    const updatedTrip = await this.getTrip(id);

    await enqueueSync("trips", id, "UPDATE", { status: "COMPLETED", endedAt, endDate: endedAt });

    console.log('[TripRepository] endTrip: tripId=', id, 'online=', navigator.onLine);

    if (navigator.onLine) {
      uploadEntity('trips', updatedTrip).catch((error) => {
        console.error('[TripRepository] endTrip upload error:', error);
      });
    } else {
      console.log('[TripRepository] endTrip: offline, skipping upload');
    }
  },

  canContinueTrip(trip) {
    const endedAt = trip.endedAt || trip.endDate;

    return (
      !trip.continuationClosedAt &&
      endedAt &&
      Date.now() - new Date(endedAt).getTime() <=
        CONTINUE_WINDOW_MS
    );
  },

  async continueTrip(id) {
    const trip = await this.getTrip(id);

    if (!trip || !this.canContinueTrip(trip)) {
      throw new Error("This journey can no longer be continued.");
    }

    const activeTrip = await this.getActiveTrip();

    if (activeTrip && activeTrip.id !== id) {
      throw new Error("Finish the current journey before continuing another one.");
    }

    await db.trips.update(id, {
      status: "ACTIVE",
      endedAt: null,
      endDate: null,
      updatedAt: new Date().toISOString(),
    });

    const updated = await this.getTrip(id);

    console.log('[TripRepository] continueTrip: tripId=', id, 'online=', navigator.onLine);

    if (navigator.onLine) {
      uploadEntity('trips', updated).catch((error) => {
        console.error('[TripRepository] continueTrip upload error:', error);
      });
    } else {
      console.log('[TripRepository] continueTrip: offline, skipping upload');
    }

    return updated;
  },

  async hydrateTripsFromSupabase(userId) {
    if (!userId) return [];

    console.log('[TripRepository] hydrateTripsFromSupabase: userId=', userId);

    const { data, error } = await pullEntity(userId, 'trips');

    if (error || !data || data.length === 0) {
      console.log('[TripRepository] hydrateTripsFromSupabase: no data or error, data=', data?.length || 0, 'error=', error);
      return [];
    }

    const localTrips = await db.trips.toArray();
    const localMap = new Map(localTrips.map((t) => [t.id, t]));

    console.log('[TripRepository] hydrateTripsFromSupabase: local trips before=', localTrips.length, 'cloud trips=', data.length);

    // Resolve identity mappings before the Dexie transaction. Mapping may read
    // syncIdMap, and awaiting that inside the transaction can commit it early.
    const mappedTrips = await Promise.all(data.map((cloudTrip) => mapSupabaseRowToLocalRow('trips', cloudTrip, userId)));

    await db.transaction("rw", db.trips, async () => {
      for (const mapped of mappedTrips) {
        const localTrip = localMap.get(mapped.id);
        const cloudUpdatedAt = new Date(mapped.updatedAt).getTime();
        const localUpdatedAt = localTrip ? new Date(localTrip.updatedAt).getTime() : 0;

        console.log('[TripRepository] hydrating trip id=', mapped.id, 'name=', mapped.tripName, 'status=', mapped.status);
        console.log('[TripRepository] mapped trip=', JSON.stringify(mapped));

        const nonCloneable = validateRecordForDexie(mapped);
        if (nonCloneable) {
          console.error('[TripRepository] NON-CLONEABLE PROPERTY DETECTED:', nonCloneable);
          throw new Error(`Non-cloneable property in mapped trip: ${nonCloneable.key} (type: ${nonCloneable.type})`);
        }

        try {
          structuredClone(mapped);
          console.log('[TripRepository] structuredClone=SUCCESS for trip', mapped.id);
        } catch (cloneError) {
          console.error('[TripRepository] structuredClone=FAILED for trip', mapped.id, 'error=', cloneError);
          throw cloneError;
        }

        if (localTrip && cloudUpdatedAt <= localUpdatedAt) {
          console.log('[TripRepository] hydrateTripsFromSupabase: skipping', mapped.id, 'local newer');
          continue;
        }

        if (localTrip) {
          await db.trips.update(mapped.id, mapped);
          console.log('[TripRepository] hydrateTripsFromSupabase: updated local', mapped.id);
        } else {
          await db.trips.add(mapped);
          console.log('[TripRepository] hydrateTripsFromSupabase: added local', mapped.id);
        }
      }
    });

    const afterTrips = await db.trips.toArray();
    console.log('[TripRepository] hydrateTripsFromSupabase: local trips after=', afterTrips.length);

    return data;
  },
};

export default TripRepository;
