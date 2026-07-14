import { ulid } from "ulid";
import db from "../db";

const ActivityRepository = {

  async addActivity(data) {

    await db.activities.add({
      id: ulid(),
      createdAt: new Date().toISOString(),
      ...data,
    });

  },

  async getActivities(tripId) {

    return await db.activities
      .where("tripId")
      .equals(tripId)
      .reverse()
      .sortBy("createdAt");

  }

};

export default ActivityRepository;