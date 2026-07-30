import TripRepository from "./TripRepository";
import ParticipantRepository from "./ParticipantRepository";
import ExpenseRepository from "./ExpenseRepository";
import ContributionRepository from "./ContributionRepository";

const ReportRepository = {
  async getOverview(tripId) {
    const trip = await TripRepository.getTrip(tripId);

    const participants =
      await ParticipantRepository.getParticipantsByTrip(tripId);

    const expenses = await ExpenseRepository.getExpensesByTrip(tripId);

    const contributions =
      await ContributionRepository.getByTrip(tripId);

    const initialContributions = participants.reduce(
      (sum, participant) =>
        sum + Number(participant.initialContribution || 0),
      0
    );

    const additionalContributions = contributions.reduce(
      (sum, contribution) =>
        sum + Number(contribution.amount || 0),
      0
    );

    const collected =
      initialContributions + additionalContributions;

    const spent = expenses.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );

    const locations = new Set(
      expenses
        .map((e) => e.locationName)
        .filter(Boolean)
    ).size;

    return {
      trip,
      collected,
      spent,
      balance: collected - spent,
      expenseCount: expenses.length,
      memberCount: participants.length,
      locationCount: locations,
      recentExpenses: expenses.slice(0, 5),
    };
  },
};

export default ReportRepository;
