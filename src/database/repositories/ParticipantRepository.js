import { ulid } from "ulid";
import db from "../db";

const ParticipantRepository = {
  async createParticipant(data) {
    const participant = {
      id: ulid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };

    await db.participants.add(participant);

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
  },

  async deleteParticipant(id) {
    await db.participants.delete(id);
  },
};

export default ParticipantRepository;