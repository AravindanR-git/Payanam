import TripRepository from "./TripRepository";
import ParticipantRepository from "./ParticipantRepository";
import ExpenseRepository from "./ExpenseRepository";
import ContributionRepository from "./ContributionRepository";
import CategoryRepository from "./CategoryRepository";
import ItemRepository from "./ItemRepository";

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

  async getAIInsights(tripId) {
    const trip = await TripRepository.getTrip(tripId);

    if (!trip) {
      return {
        trip: null,
        daysActive: 0,
        totalSpent: 0,
        balance: 0,
        topCategories: [],
        topLocations: [],
        perHeadSpent: 0,
        totalHeadcount: 0,
        participantContributions: [],
        familyGroups: [],
        individualParticipants: [],
        settlement: [],
        overpaid: [],
        underpaid: [],
        insights: [
          {
            type: "info",
            title: "No Trip Found",
            message: "Create a trip to see AI-powered insights.",
          },
        ],
      };
    }

    const participants =
      await ParticipantRepository.getParticipantsByTrip(tripId);

    const expenses = await ExpenseRepository.getExpensesByTrip(tripId);

    const contributions =
      await ContributionRepository.getByTrip(tripId);

    const categories = await CategoryRepository.getCategories(
      trip?.tripType,
      trip?.userId
    );

    const items = [];
    for (const category of categories) {
      const categoryItems = await ItemRepository.getItems(
        category.id
      );
      items.push(...categoryItems);
    }

    const collected = participants.reduce(
      (sum, p) => sum + Number(p.initialContribution || 0),
      0
    );

    const totalSpent = expenses.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );

    const balance = collected - totalSpent;

    const tripStart = trip?.createdAt
      ? new Date(trip.createdAt)
      : new Date();
    const tripEnd = trip?.endedAt
      ? new Date(trip.endedAt)
      : new Date();
    const daysActive =
      Math.max(
        1,
        Math.ceil(
          (tripEnd - tripStart) / (1000 * 60 * 60 * 24)
        ) || 1
      );

    const categorySpend = {};
    expenses.forEach((expense) => {
      const catId = expense.categoryId || "uncategorized";
      categorySpend[catId] =
        (categorySpend[catId] || 0) + Number(expense.amount || 0);
    });

    const topCategories = Object.entries(categorySpend)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([catId, amount]) => {
        const category = categories.find((c) => c.id === catId);
        return {
          id: catId,
          name: category?.name || "Others",
          amount,
          percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
        };
      });

    const locationSpend = {};
    expenses.forEach((expense) => {
      if (expense.locationName) {
        locationSpend[expense.locationName] =
          (locationSpend[expense.locationName] || 0) +
          Number(expense.amount || 0);
      }
    });

    const topLocations = Object.entries(locationSpend)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({
        name,
        amount,
      }));

    const participantContributions = participants.map((p) => {
      const initial = Number(p.initialContribution || 0);

      const personalPayments = expenses
        .filter(
          (e) =>
            e.paidByParticipantId === p.id &&
            e.paymentSource === "participant"
        )
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      return {
        id: p.id,
        name: p.name,
        type: p.type,
        memberCount: p.memberCount || 1,
        contribution: initial,
        personalPayments,
      };
    });

    const familyGroups = participantContributions.filter(
      (p) => p.type === "family"
    );

    const individualParticipants = participantContributions.filter(
      (p) => p.type !== "family"
    );

    const totalCollected = participantContributions.reduce(
      (sum, p) => sum + p.contribution,
      0
    );

    const totalHeadcount = participantContributions.reduce(
      (sum, p) => sum + p.memberCount,
      0
    );

    const perHeadSpent =
      totalHeadcount > 0 ? totalSpent / totalHeadcount : 0;

    const memberCount = participantContributions.length;

    const getContributionPercentage = (p) => {
      if (totalCollected > 0) {
        return (p.contribution / totalCollected) * 100;
      }

      return memberCount > 0 ? 100 / memberCount : 0;
    };

    const settlementDetails = participantContributions.map((p) => {
      const sharePercentage = getContributionPercentage(p);
      const fairShare = totalSpent * (sharePercentage / 100);
      const net = p.contribution - fairShare + p.personalPayments;

      return {
        ...p,
        sharePercentage,
        fairShare,
        net,
        balance: net,
      };
    });

    const settlement = [];
    const payers = settlementDetails
      .filter((p) => p.net < 0)
      .sort((a, b) => a.net - b.net);

    const receivers = settlementDetails
      .filter((p) => p.net > 0)
      .sort((a, b) => b.net - a.net);

    let payerIndex = 0;
    let receiverIndex = 0;

    while (payerIndex < payers.length && receiverIndex < receivers.length) {
      const payer = payers[payerIndex];
      const receiver = receivers[receiverIndex];
      const amount = Math.min(
        Math.abs(payer.net),
        receiver.net
      );

      if (amount > 0) {
        settlement.push({
          from: payer.name,
          to: receiver.name,
          amount,
        });
      }

      payer.balance += amount;
      receiver.balance -= amount;

      if (payer.balance >= 0) payerIndex++;
      if (receiver.balance <= 0) receiverIndex++;
    }

    const overpaid = settlementDetails.filter(
      (c) => c.contribution > c.fairShare
    );

    const underpaid = settlementDetails.filter(
      (c) => c.contribution < c.fairShare
    );

    const surplus = totalCollected - totalSpent;
    const fairSharePerMember =
      memberCount > 0 ? totalSpent / memberCount : 0;

    const insights = [];

    if (balance > 0) {
      insights.push({
        type: "success",
        title: "Surplus in Common Fund",
        message: `₹${balance.toLocaleString("en-IN")} will be distributed back based on contribution share.`,
      });
    } else if (balance < 0) {
      insights.push({
        type: "warning",
        title: "Common Fund Deficit",
        message: `₹${Math.abs(balance).toLocaleString("en-IN")} extra was spent. Participants need to cover their share based on contribution percentage.`,
      });
    }

    if (settlement.length > 0) {
      insights.push({
        type: "warning",
        title: "Settlement Required",
        message: `${settlement.length} payment(s) needed to settle expenses. Check the Settlements section below.`,
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: "info",
        title: "No Insights Yet",
        message: "Add some expenses to see AI-powered insights.",
      });
    }

    return {
      trip,
      daysActive,
      totalSpent,
      balance,
      topCategories,
      topLocations,
      perHeadSpent,
      totalHeadcount,
      participantContributions: settlementDetails,
      familyGroups,
      individualParticipants,
      settlement,
      settlementDetails,
      overpaid,
      underpaid,
      totalCollected,
      surplus,
      fairSharePerMember,
      insights,
    };
  },
};

export default ReportRepository;
