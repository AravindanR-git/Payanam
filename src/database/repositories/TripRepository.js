import { ulid } from "ulid";
import db from "../db";
import { enqueueSync } from "../../services/syncEnqueue";
import { uploadTrip, pullTrips } from "../../services/supabaseSync";

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
      id: ulid(),
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

      enqueueSync("trips", trip.id, "CREATE", trip);
    });

    console.log('[TripRepository] createTrip: tripId=', trip.id, 'name=', trip.tripName, 'userId=', trip.userId, 'online=', navigator.onLine);

    if (navigator.onLine) {
      uploadTrip(trip).catch((error) => {
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

    enqueueSync("trips", id, "UPDATE", { status: "COMPLETED", endedAt, endDate: endedAt });

    console.log('[TripRepository] endTrip: tripId=', id, 'online=', navigator.onLine);

    if (navigator.onLine) {
      uploadTrip(updatedTrip).catch((error) => {
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
      uploadTrip(updated).catch((error) => {
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

    const { data, error } = await pullTrips(userId);

    if (error || !data || data.length === 0) {
      console.log('[TripRepository] hydrateTripsFromSupabase: no data or error, data=', data?.length || 0, 'error=', error);
      return [];
    }

    const localTrips = await db.trips.toArray();
    const localMap = new Map(localTrips.map((t) => [t.id, t]));

    console.log('[TripRepository] hydrateTripsFromSupabase: local trips before=', localTrips.length, 'cloud trips=', data.length);

    await db.transaction("rw", db.trips, async () => {
      for (const cloudTrip of data) {
        const localTrip = localMap.get(cloudTrip.id);
        const cloudUpdatedAt = new Date(cloudTrip.updated_at).getTime();
        const localUpdatedAt = localTrip ? new Date(localTrip.updatedAt).getTime() : 0;

        if (localTrip && cloudUpdatedAt <= localUpdatedAt) {
          console.log('[TripRepository] hydrateTripsFromSupabase: skipping', cloudTrip.id, 'local newer');
          continue;
        }

        const mapped = {
          id: cloudTrip.id,
          userId: cloudTrip.user_id,
          tripName: cloudTrip.trip_name,
          tripType: cloudTrip.trip_type,
          status: cloudTrip.status,
          defaultContributionPerPerson: cloudTrip.default_contribution_per_person || 0,
          endedAt: cloudTrip.ended_at,
          endDate: cloudTrip.end_date,
          continuationClosedAt: cloudTrip.continuation_closed_at,
          createdAt: cloudTrip.created_at,
          updatedAt: cloudTrip.updated_at,
        };

        if (localTrip) {
          await db.trips.update(cloudTrip.id, mapped);
          console.log('[TripRepository] hydrateTripsFromSupabase: updated local', cloudTrip.id);
        } else {
          await db.trips.add(mapped);
          console.log('[TripRepository] hydrateTripsFromSupabase: added local', cloudTrip.id);
        }
      }
    });

    const afterTrips = await db.trips.toArray();
    console.log('[TripRepository] hydrateTripsFromSupabase: local trips after=', afterTrips.length);

    return data;
  },
};

export default TripRepository;
