import { generateUuid } from "../../utils/uuid";
import db from "../db";
import { enqueueSync } from "../../services/syncEnqueue";
import { uploadEntity, hydrateEntity } from "../../services/supabaseSync";

const ContributionRepository = {

  async createContribution(data) {

    const contribution = {
      id: generateUuid(),
      createdAt: new Date().toISOString(),
      ...data,
    };

    await db.contributions.add(contribution);

    await enqueueSync("contributions", contribution.id, "CREATE", contribution);

    if (navigator.onLine) {
      uploadEntity('contributions', contribution).catch((error) => {
        console.error('[ContributionRepository] createContribution upload error:', error);
      });
    }

    return contribution;
  },

  async getByParticipant(participantId) {

    return await db.contributions
      .where("participantId")
      .equals(participantId)
      .toArray();

  },

  async getByTrip(tripId) {

    return await db.contributions
      .where("tripId")
      .equals(tripId)
      .toArray();

  },

  async hydrateContributionsFromSupabase(userId) {
    if (!userId) return [];
    const { data } = await hydrateEntity(userId, 'contributions');
    return data || [];
  }

};

export default ContributionRepository;
