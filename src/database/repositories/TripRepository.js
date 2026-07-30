import { ulid } from "ulid";
import db from "../db";

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
      await db.trips
        .where("status")
        .equals("COMPLETED")
        .modify((completedTrip) => {
          completedTrip.continuationClosedAt ??= now;
        });

      await db.trips.add(trip);
    });

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

    return this.getTrip(id);
  },
};

export default TripRepository;
