import { generateUuid } from "../../utils/uuid";
import db from "../db";
import { enqueueSync } from "../../services/syncEnqueue";
import { uploadEntity, hydrateEntity } from "../../services/supabaseSync";

const ActivityRepository = {

  async addActivity(data) {

    const activity = {

      id: generateUuid(),

      createdAt: new Date().toISOString(),

      ...data,
    };

    await db.activities.add(activity);

    await enqueueSync("activities", activity.id, "CREATE", activity);

    if (navigator.onLine) {
      uploadEntity('activities', activity).catch((error) => {
        console.error('[ActivityRepository] addActivity upload error:', error);
      });
    }

  },

  async getActivities(tripId) {

    return await db.activities
      .where("tripId")
      .equals(tripId)
      .orderBy("createdAt")
      .reverse()
      .toArray();

  },

  async hydrateActivitiesFromSupabase(userId) {
    if (!userId) return [];
    const { data } = await hydrateEntity(userId, 'activities');
    return data || [];
  }

};

export default ActivityRepository;
