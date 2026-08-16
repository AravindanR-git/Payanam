import { ulid } from "ulid";
import db from "../db";
import { enqueueSync } from "../../services/syncEnqueue";

const ContributionRepository = {

  async createContribution(data) {

    const contribution = {
      id: ulid(),
      createdAt: new Date().toISOString(),
      ...data,
    };

    await db.contributions.add(contribution);

    enqueueSync("contributions", contribution.id, "CREATE", contribution);

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