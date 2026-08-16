import { ulid } from "ulid";
import db from "../db";

const SyncRepository = {
  async enqueue(tableName, recordId, operation, payload = null) {
    const entry = {
      id: ulid(),
      tableName,
      recordId,
      operation, // CREATE | UPDATE | DELETE
      payload,
      status: "PENDING",
      attempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.pendingSync.add(entry);

    return entry;
  },

  async getPending(limit = 50) {
    return await db.pendingSync
      .where("status")
      .equals("PENDING")
      .sortBy("createdAt");
  },

  async getFailed() {
    return await db.pendingSync
      .where("status")
      .equals("FAILED")
      .sortBy("createdAt");
  },

  async markSynced(id) {
    await db.pendingSync.update(id, {
      status: "SYNCED",
      updatedAt: new Date().toISOString(),
    });
  },

  async markFailed(id, error = null) {
    await db.pendingSync.update(id, {
      status: "FAILED",
      error: error ? String(error) : null,
      attempts: db.pendingSync.get(id).then(r => (r?.attempts || 0) + 1),
      updatedAt: new Date().toISOString(),
    });
  },

  async clearSynced() {
    await db.pendingSync
      .where("status")
      .equals("SYNCED")
      .delete();
  },

  async getCounts() {
    const pending = await db.pendingSync.where("status").equals("PENDING").count();
    const failed = await db.pendingSync.where("status").equals("FAILED").count();
    const synced = await db.pendingSync.where("status").equals("SYNCED").count();

    return { pending, failed, synced };
  },

  async getAll() {
    return await db.pendingSync.orderBy("createdAt").reverse().toArray();
  },

  async deleteById(id) {
    await db.pendingSync.delete(id);
  },
};

export default SyncRepository;
