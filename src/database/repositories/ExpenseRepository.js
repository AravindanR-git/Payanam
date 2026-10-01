import { generateUuid } from "../../utils/uuid";
import db from "../db";
import ItemRepository from "./ItemRepository";
import CategoryRepository from "./CategoryRepository";
import LocationService from "../../services/LocationService";
import PaymentAllocationRepository from "./PaymentAllocationRepository";
import { enqueueSync } from "../../services/syncEnqueue";
import { uploadEntity, hydrateEntity } from "../../services/supabaseSync";
import { calculateRemainingDonorBalance, donorAllocationExceedsBalance } from "../../utils/donorBalance";

const ExpenseRepository = {
  async createExpense(data) {
    const expense = {
      id: generateUuid(),

      createdAt: new Date().toISOString(),

      updatedAt: new Date().toISOString(),

      syncStatus: "PENDING",

      latitude: null,

      longitude: null,

      locationName: "",

      ...data,
    };

    await this.validateDonorAllocations(data.allocations || []);

    await db.expenses.add(expense);

    await ItemRepository.markUsed(
      (expense.selectedItems || []).map(
        (item) => item.id
      )
    );

    if (expense.categoryId) {
      await CategoryRepository.markUsed(expense.categoryId);
    }

    if (data.allocations && data.allocations.length > 0) {
      for (const allocation of data.allocations) {
        await PaymentAllocationRepository.createAllocation({
          expenseId: expense.id,
          ...allocation,
        });
      }
    }

    await enqueueSync("expenses", expense.id, "CREATE", expense);

    if (navigator.onLine) {
      uploadEntity('expenses', expense).catch((error) => {
        console.error('[ExpenseRepository] createExpense upload error:', error);
      });
    }

    return expense;
  },

  async getExpensesByTrip(tripId) {
    const list = await db.expenses
      .where("tripId")
      .equals(tripId)
      .toArray();

    return list.sort(
      (a, b) =>
        new Date(
          b.expenseTime ||
            b.updatedAt ||
            b.createdAt
        ) -
        new Date(
          a.expenseTime ||
            a.updatedAt ||
            a.createdAt
        )
    );
  },

  async getRecentExpenses(
    tripId,
    limit = 10
  ) {
    const list =
      await this.getExpensesByTrip(tripId);

    return list.slice(0, limit);
  },

  async getExpenseById(id) {
    return await db.expenses.get(id);
  },

  async getTotalSpent(tripId) {
    const list =
      await this.getExpensesByTrip(tripId);

    return list.reduce(
      (sum, expense) =>
        sum + Number(expense.amount || 0),
      0
    );
  },

  async getDonorAvailability(donorId, { excludeExpenseId = null } = {}) {
    const contribution =
      await db.contributions.get(donorId);

    if (!contribution || !contribution.donorName) {
      return 0;
    }

    const allocations = await PaymentAllocationRepository.getAllocationsByDonor(donorId);

    // Older expenses may identify their donor without an allocation row.
    // Count those once so historical spending cannot restore the original balance.
    const legacyExpenses = await db.expenses
      .where("paidByDonorId")
      .equals(donorId)
      .toArray();
    return calculateRemainingDonorBalance({
      contributionAmount: contribution.amount,
      allocations,
      expenses: legacyExpenses,
      excludeExpenseId,
    });
  },

  async validateDonorAllocations(allocations = [], { excludeExpenseId = null } = {}) {
    const totals = new Map();
    for (const allocation of allocations) {
      if (allocation.paymentSourceType !== "donor" || !allocation.donorId) continue;
      totals.set(allocation.donorId, (totals.get(allocation.donorId) || 0) + Number(allocation.amount || 0));
    }
    for (const [donorId, amount] of totals) {
      const available = await this.getDonorAvailability(donorId, { excludeExpenseId });
      if (donorAllocationExceedsBalance(amount, available)) {
        const donor = await db.contributions.get(donorId);
        throw new Error(`${donor?.donorName || "This donor"} has only ₹${available.toLocaleString("en-IN")} available.`);
      }
    }
    return true;
  },

  async getExpenseAllocations(expenseId) {
    return await PaymentAllocationRepository.getAllocationsByExpense(expenseId);
  },

  async updateExpense(id, data) {
    if (data.allocations) {
      await this.validateDonorAllocations(data.allocations, { excludeExpenseId: id });
    }

    await db.expenses.update(id, {
      ...data,

      updatedAt:
        new Date().toISOString(),

      syncStatus: "PENDING",
    });

    const updated = await db.expenses.get(id);

    if (data.allocations) {
      await PaymentAllocationRepository.deleteAllocationsByExpense(id);

      for (const allocation of data.allocations) {
        await PaymentAllocationRepository.createAllocation({
          expenseId: id,
          ...allocation,
        });
      }
    }

    await enqueueSync("expenses", id, "UPDATE", { ...data, updatedAt: new Date().toISOString() });

    if (navigator.onLine && updated) {
      uploadEntity('expenses', updated).catch((error) => {
        console.error('[ExpenseRepository] updateExpense upload error:', error);
      });
    }

    return updated;
  },

async deleteExpense(id) {
    await PaymentAllocationRepository.deleteAllocationsByExpense(id);

    await db.expenses.delete(id);

    await enqueueSync("expenses", id, "DELETE", { id });
  },

  async getAllocationsForParticipant(participantId) {
    return await PaymentAllocationRepository.getAllocationsByParticipant(participantId);
  },

  async reassignAllocation(allocationId, newType, newId) {
    const updates = {
      paymentSourceType: newType,
      participantId: null,
      donorId: null,
    };
    if (newType === "participant") {
      updates.participantId = newId;
    } else if (newType === "donor") {
      updates.donorId = newId;
    }
    return await PaymentAllocationRepository.updateAllocation(allocationId, updates);
  },

  async hydrateExpensesFromSupabase(userId) {
    if (!userId) return [];
    const { data } = await hydrateEntity(userId, 'expenses');
    return data || [];
  },

  async resolveMissingManualLocations(limit = 10) {
    if (!navigator.onLine) {
      return 0;
    }

    const unresolvedExpenses = await db.expenses
      .filter(
        (expense) =>
          expense.locationSource === "manual" &&
          Boolean(expense.locationName?.trim()) &&
          (expense.latitude === null ||
            expense.latitude === undefined ||
            expense.longitude === null ||
            expense.longitude === undefined)
      )
      .limit(limit)
      .toArray();

    let resolvedCount = 0;

    for (const expense of unresolvedExpenses) {
      try {
        const [result] =
          await LocationService.searchLocations(
            expense.locationName
          );

        if (!result) continue;

        await db.expenses.update(expense.id, {
          latitude: result.latitude,
          longitude: result.longitude,
          locationResolvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: "PENDING",
        });

        resolvedCount += 1;
      } catch {
        // Keep the manual entry unchanged and try again next time online.
      }
    }

    return resolvedCount;
  },
};

export default ExpenseRepository;
