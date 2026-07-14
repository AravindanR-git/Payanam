import { ulid } from "ulid";
import db from "../db";

const ExpenseRepository = {
  async createExpense(data) {
    const expense = {
      id: ulid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: "PENDING",
      ...data,
    };

    await db.expenses.add(expense);

    return expense;
  },

  async getExpensesByTrip(tripId) {
    return await db.expenses
      .where("tripId")
      .equals(tripId)
      .toArray();
  },

  async getRecentExpenses(tripId, limit = 10) {
    const expenses = await db.expenses
      .where("tripId")
      .equals(tripId)
      .toArray();

    return expenses
      .sort(
        (a, b) =>
          new Date(b.expenseTime) -
          new Date(a.expenseTime)
      )
      .slice(0, limit);
  },

  async getTotalSpent(tripId) {
    const expenses = await db.expenses
      .where("tripId")
      .equals(tripId)
      .toArray();

    return expenses.reduce(
      (sum, expense) =>
        sum + Number(expense.amount || 0),
      0
    );
  },
async getExpenseById(id) {

  return await db.expenses.get(id);

},
  async updateExpense(id, data) {
    await db.expenses.update(id, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  },

  async deleteExpense(id) {
    await db.expenses.delete(id);
  },
};

export default ExpenseRepository;