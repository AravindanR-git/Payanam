import { ulid } from "ulid";
import db from "../db";
import { enqueueSync } from "../../services/syncEnqueue";

const ParticipantRepository = {
  async createParticipant(data) {
    const participant = {
      id: ulid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };

    await db.participants.add(participant);

    enqueueSync("participants", participant.id, "CREATE", participant);

    return participant;
  },

  async createMany(participants) {
    const data = participants.map((participant) => ({
      id: ulid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...participant,
    }));

    await db.participants.bulkAdd(data);

    for (const participant of data) {
      enqueueSync("participants", participant.id, "CREATE", participant);
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

    enqueueSync("participants", id, "UPDATE", { ...data, updatedAt: new Date().toISOString() });
  },

  async deleteParticipant(id) {
    await db.participants.delete(id);

    enqueueSync("participants", id, "DELETE", { id });
  },
};

export default ParticipantRepository;