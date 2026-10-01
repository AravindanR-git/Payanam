import { generateUuid } from "../../utils/uuid";
import db from "../db";
import { enqueueSync } from "../../services/syncEnqueue";
import { uploadEntity, deleteEntity, hydrateEntity } from "../../services/supabaseSync";
import { resolveLocalToRemote } from "../../services/entityIdMap";

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

  async createDonation(data) {

    const donation = {
      id: generateUuid(),
      participantId: null,
      donorName: data.donorName.trim(),
      donorNote: data.donorNote || null,
      amount: Number(data.amount) || 0,
      tripId: data.tripId,
      userId: data.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.contributions.add(donation);

    await enqueueSync("contributions", donation.id, "CREATE", donation);

    if (navigator.onLine) {
      uploadEntity('contributions', donation).catch((error) => {
        console.error('[ContributionRepository] createDonation upload error:', error);
      });
    }

    return donation;
  },

  async updateDonation(id, data) {

    const existing = await db.contributions.get(id);

    if (!existing) {
      throw new Error('Donation not found');
    }

    const updated = {
      donorName: data.donorName.trim(),
      donorNote: data.donorNote || null,
      amount: Number(data.amount) || 0,
      updatedAt: new Date().toISOString(),
    };

    await db.contributions.update(id, updated);

    const fullRecord = await db.contributions.get(id);

    await enqueueSync("contributions", id, "UPDATE", fullRecord);

    if (navigator.onLine) {
      uploadEntity('contributions', fullRecord).catch((error) => {
        console.error('[ContributionRepository] updateDonation upload error:', error);
      });
    }

    return fullRecord;
  },

  async deleteDonation(id) {

    const remoteId = await resolveLocalToRemote('contributions', id);

    await db.contributions.delete(id);

    await enqueueSync("contributions", id, "DELETE", { id, remoteId });

    if (navigator.onLine) {
      deleteEntity('contributions', remoteId || id).catch((error) => {
        console.error('[ContributionRepository] deleteDonation error:', error);
      });
    }
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

  async getDonorsByTrip(tripId) {

    return await db.contributions
      .where("tripId")
      .equals(tripId)
      .toArray()
      .then((rows) => rows.filter((r) => r.donorName));

  },

async hydrateContributionsFromSupabase(userId) {
    if (!userId) return [];
    const { data } = await hydrateEntity(userId, 'contributions');
    return data || [];
  },

  async getContributionsByParticipant(participantId) {
    return await db.contributions
      .where("participantId")
      .equals(participantId)
      .toArray();
  },

  async getDonorContributionsByTrip(tripId) {
    return await db.contributions
      .where("tripId")
      .equals(tripId)
      .toArray()
      .then((rows) => rows.filter((r) => r.donorName));
  },

  async reassignContribution(contributionId, newType, newId) {
    const updates = {
      participantId: null,
      donorName: null,
      updatedAt: new Date().toISOString(),
    };
    if (newType === "participant") {
      updates.participantId = newId;
    } else if (newType === "donor") {
      updates.donorName = newId;
    }
    await db.contributions.update(contributionId, updates);
    const full = await db.contributions.get(contributionId);
    await enqueueSync("contributions", contributionId, "UPDATE", full);
    if (navigator.onLine && full) {
      uploadEntity('contributions', full).catch(() => {});
    }
    return full;
  },

  async deleteContribution(contributionId) {
    const remoteId = await resolveLocalToRemote('contributions', contributionId);
    await db.contributions.delete(contributionId);
    await enqueueSync("contributions", contributionId, "DELETE", { id: contributionId, remoteId });
if (navigator.onLine) {
      deleteEntity('contributions', remoteId || contributionId).catch(() => {});
    }
  },
};

export default ContributionRepository;
