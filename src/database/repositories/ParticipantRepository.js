import { generateUuid } from "../../utils/uuid";
import db from "../db";
import { enqueueSync } from "../../services/syncEnqueue";
import { uploadEntity, hydrateEntity } from "../../services/supabaseSync";

const ParticipantRepository = {
  async createParticipant(data) {
    const participant = {
      id: generateUuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };

    await db.participants.add(participant);

    await enqueueSync("participants", participant.id, "CREATE", participant);

    if (navigator.onLine) {
      uploadEntity('participants', participant).catch((error) => {
        console.error('[ParticipantRepository] createParticipant upload error:', error);
      });
    }

    return participant;
  },

  async createMany(participants) {
    const data = participants.map((participant) => ({
      id: generateUuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...participant,
    }));

    await db.participants.bulkAdd(data);

    for (const participant of data) {
      await enqueueSync("participants", participant.id, "CREATE", participant);

      if (navigator.onLine) {
        uploadEntity('participants', participant).catch((error) => {
          console.error('[ParticipantRepository] createMany upload error:', error);
        });
      }
    }
  },

  async getParticipantsByTrip(tripId) {
    return await db.participants
      .where("tripId")
      .equals(tripId)
      .toArray();
  },
  async updateParticipant(id, data) {
    await db.participants.update(id, {
      ...data,

      updatedAt: new Date().toISOString(),
    });

    const updated = await db.participants.get(id);

    await enqueueSync("participants", id, "UPDATE", { ...data, updatedAt: new Date().toISOString() });

    if (navigator.onLine && updated) {
      uploadEntity('participants', updated).catch((error) => {
        console.error('[ParticipantRepository] updateParticipant upload error:', error);
      });
    }
  },

  async deleteParticipant(id) {
    await db.participants.delete(id);

    await enqueueSync("participants", id, "DELETE", { id });
  },

async hydrateParticipantsFromSupabase(userId) {
    if (!userId) return [];
    const { data } = await hydrateEntity(userId, 'participants');
    return data || [];
  },

  async getFinancialReferences(participantId) {
    const allocations = await db.expensePaymentAllocations
      .where("participantId")
      .equals(participantId)
      .toArray();

    const contributions = await db.contributions
      .where("participantId")
      .equals(participantId)
      .toArray();

    return { allocations, contributions };
  },

  async hasFinancialRecords(participantId) {
    const { allocations, contributions } = await this.getFinancialReferences(participantId);
    return allocations.length > 0 || contributions.length > 0;
  },

  async deleteParticipant(id) {
    await db.participants.delete(id);

    await enqueueSync("participants", id, "DELETE", { id });
  },

  async deleteParticipantWithReassignment(participantId, reassignments) {
    await db.transaction("rw", [
      db.participants,
      db.expensePaymentAllocations,
      db.contributions,
      db.pendingSync,
    ], async () => {
      for (const { allocationId, newType, newId } of reassignments.allocations) {
        const updates = {
          paymentSourceType: newType,
          participantId: null,
          donorId: null,
          updatedAt: new Date().toISOString(),
        };
        if (newType === "participant") {
          updates.participantId = newId;
        } else if (newType === "donor") {
          updates.donorId = newId;
        }
        await db.expensePaymentAllocations.update(allocationId, updates);
        const full = await db.expensePaymentAllocations.get(allocationId);
        await enqueueSync("expensePaymentAllocations", allocationId, "UPDATE", full);
      }

      for (const { contributionId, newType, newId } of reassignments.contributions) {
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
      }

      await db.participants.delete(participantId);
      await enqueueSync("participants", participantId, "DELETE", { id: participantId });
    });
  },
};

export default ParticipantRepository;
