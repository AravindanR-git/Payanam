import { ulid } from "ulid";
import db from "../db";
import ItemRepository from "./ItemRepository";

const ExpenseRepository = {
  async createExpense(data) {
    const expense = {
      id: ulid(),

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

    return await db.expenses.get(id);
  },

  async deleteExpense(id) {
    await db.expenses.delete(id);
  },
};

export default ExpenseRepository;