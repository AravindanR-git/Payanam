import { ulid } from "ulid";
import db from "../db";

const TripRepository = {
  async createTrip(data) {
    const trip = {
      id: ulid(),
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };

    await db.trips.add(trip);

    return trip;
  },

  async getActiveTrip() {
    return await db.trips
      .where("status")
      .equals("ACTIVE")
      .first();
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

  async endTrip(id) {
    await db.trips.update(id, {
      status: "COMPLETED",
      endDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
};

export default TripRepository;