import { ulid } from "ulid";
import db from "../db";

const ContributionRepository = {

  async createContribution(data) {

    const contribution = {
      id: ulid(),
      createdAt: new Date().toISOString(),
      ...data,
    };

    await db.contributions.add(contribution);

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

  }

};

export default ContributionRepository;