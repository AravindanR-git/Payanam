import { generateUuid } from "../../utils/uuid";
import db from "../db";

const SyncRepository = {
  async enqueue(tableName, recordId, operation, payload = null) {
    try {
      const entry = {
        id: generateUuid(),
        tableName,
        recordId,
        operation,
        payload,
        status: "PENDING",
        attempts: 0,
        error: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.pendingSync.add(entry);
      return entry;
    } catch (error) {
      if (error?.name === 'NotFoundError') {
        console.error('[SyncRepository] pendingSync table missing. Ensure Dexie schema includes pendingSync.');
      } else {
        console.error('[SyncRepository] enqueue error:', error);
      }
      return null;
    }
  },

  async getPending(limit = 50) {
    try {
      return await db.pendingSync
        .where("status")
        .equals("PENDING")
        .sortBy("createdAt")
        .then(rows => rows.slice(0, limit));
    } catch (error) {
      if (error?.name === 'NotFoundError') {
        console.error('[SyncRepository] getPending: pendingSync table missing');
      }
      return [];
    }
  },

  async getFailed() {
    try {
      return await db.pendingSync
        .where("status")
        .equals("FAILED")
        .sortBy("createdAt");
    } catch (error) {
      if (error?.name === 'NotFoundError') {
        console.error('[SyncRepository] getFailed: pendingSync table missing');
      }
      return [];
    }
  },

  async markSynced(id) {
    try {
      await db.pendingSync.update(id, {
        status: "SYNCED",
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SyncRepository] markSynced error:', error);
    }
  },

  async markFailed(id, error = null) {
    try {
      const existing = await db.pendingSync.get(id);
      await db.pendingSync.update(id, {
        status: "FAILED",
        error: error ? String(error) : null,
        attempts: (existing?.attempts || 0) + 1,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SyncRepository] markFailed error:', error);
    }
  },

  async clearSynced() {
    try {
      await db.pendingSync
        .where("status")
        .equals("SYNCED")
        .delete();
    } catch {
      // Ignore clear errors
    }
  },

  async getCounts() {
    try {
      const pending = await db.pendingSync.where("status").equals("PENDING").count();
      const failed = await db.pendingSync.where("status").equals("FAILED").count();
      const synced = await db.pendingSync.where("status").equals("SYNCED").count();

      return { pending, failed, synced };
    } catch {
      return { pending: 0, failed: 0, synced: 0 };
    }
  },

  async getAll() {
    try {
      return await db.pendingSync.orderBy("createdAt").reverse().toArray();
    } catch {
      return [];
    }
  },

  async deleteById(id) {
    try {
      await db.pendingSync.delete(id);
    } catch {
      // Ignore delete errors
    }
  },
};

export default SyncRepository;
