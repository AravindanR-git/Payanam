import { generateUuid } from "../../utils/uuid";
import db from "../db";
import ItemRepository from "./ItemRepository";
import CategoryRepository from "./CategoryRepository";
import LocationService from "../../services/LocationService";
import { enqueueSync } from "../../services/syncEnqueue";
import { uploadEntity, hydrateEntity } from "../../services/supabaseSync";

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

    await db.expenses.add(expense);

    await ItemRepository.markUsed(
      (expense.selectedItems || []).map(
        (item) => item.id
      )
    );

    if (expense.categoryId) {
      await CategoryRepository.markUsed(expense.categoryId);
    }

    enqueueSync("expenses", expense.id, "CREATE", expense);

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

  async updateExpense(id, data) {
    await db.expenses.update(id, {
      ...data,

      updatedAt:
        new Date().toISOString(),

      syncStatus: "PENDING",
    });

    const updated = await db.expenses.get(id);

    enqueueSync("expenses", id, "UPDATE", { ...data, updatedAt: new Date().toISOString() });

    if (navigator.onLine && updated) {
      uploadEntity('expenses', updated).catch((error) => {
        console.error('[ExpenseRepository] updateExpense upload error:', error);
      });
    }

    return updated;
  },

  async deleteExpense(id) {
    await db.expenses.delete(id);

    enqueueSync("expenses", id, "DELETE", { id });
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
