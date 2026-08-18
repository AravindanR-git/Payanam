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

    enqueueSync("participants", participant.id, "CREATE", participant);

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
      enqueueSync("participants", participant.id, "CREATE", participant);

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

    enqueueSync("participants", id, "UPDATE", { ...data, updatedAt: new Date().toISOString() });

    if (navigator.onLine && updated) {
      uploadEntity('participants', updated).catch((error) => {
        console.error('[ParticipantRepository] updateParticipant upload error:', error);
      });
    }
  },

  async deleteParticipant(id) {
    await db.participants.delete(id);

    enqueueSync("participants", id, "DELETE", { id });
  },

  async hydrateParticipantsFromSupabase(userId) {
    if (!userId) return [];
    const { data } = await hydrateEntity(userId, 'participants');
    return data || [];
  },
};

export default ParticipantRepository;