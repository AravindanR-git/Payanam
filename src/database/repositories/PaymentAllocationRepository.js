import { generateUuid } from "../../utils/uuid";
import db from "../db";
import { enqueueSync } from "../../services/syncEnqueue";
import { uploadEntity, hydrateEntity } from "../../services/supabaseSync";

const PaymentAllocationRepository = {

  async createAllocation(data) {
    const allocation = {
      id: generateUuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };

    await db.expensePaymentAllocations.add(allocation);

    await enqueueSync("expensePaymentAllocations", allocation.id, "CREATE", allocation);

    return allocation;
  },

  async getAllocationsByExpense(expenseId) {
    return await db.expensePaymentAllocations
      .where("expenseId")
      .equals(expenseId)
      .toArray();
  },

  async getAllocationsByDonor(donorId) {
    return await db.expensePaymentAllocations
      .where("donorId")
      .equals(donorId)
      .toArray();
  },

  async getAllocationsByParticipant(participantId) {
    return await db.expensePaymentAllocations
      .where("participantId")
      .equals(participantId)
      .toArray();
  },

  async updateAllocation(id, updates) {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await db.expensePaymentAllocations.update(id, payload);
    const full = await db.expensePaymentAllocations.get(id);
    await enqueueSync("expensePaymentAllocations", id, "UPDATE", full);
    return full;
  },

  async deleteAllocationsByExpense(expenseId) {
    const rows = await db.expensePaymentAllocations.where("expenseId").equals(expenseId).toArray();
    if (!rows.length) return;
    for (const row of rows) await enqueueSync("expensePaymentAllocations", row.id, "DELETE", { id: row.id });
    await db.expensePaymentAllocations.bulkDelete(rows.map((row) => row.id));
  },

  async deleteAllocation(id) {
    await db.expensePaymentAllocations.delete(id);
    await enqueueSync("expensePaymentAllocations", id, "DELETE", { id });
  },

  async hydrateAllocationsFromSupabase(userId) {
    if (!userId) return [];
    const { data } = await hydrateEntity(userId, 'expensePaymentAllocations');
    return data || [];
  },
};

export default PaymentAllocationRepository;
