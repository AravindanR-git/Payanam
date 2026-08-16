import { ulid } from "ulid";
import db from "../db";
import SyncService from "../../services/syncService";

const ActivityRepository = {

  async addActivity(data) {

    const activity = {

      id: ulid(),

      createdAt: new Date().toISOString(),

      ...data,
    };

    await db.activities.add(activity);

    SyncService.enqueue("activities", activity.id, "CREATE", activity);

  },

  async getActivities(tripId) {

    return await db.activities
      .where("tripId")
      .equals(tripId)
      .orderBy("createdAt")
      .reverse()
      .toArray();

  }

};

export default ActivityRepository;