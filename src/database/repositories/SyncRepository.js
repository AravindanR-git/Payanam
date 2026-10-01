import { generateUuid } from "../../utils/uuid";
import db from "../db";

const SyncRepository = {
  async getActiveAccount() {
    try { return await db.activeAccount.get("active"); } catch { return null; }
  },

  async enqueue(tableName, recordId, operation, payload = null, userId = null) {
    try {
      const entry = {
        id: generateUuid(),
        tableName,
        recordId,
        operation,
        payload,
        userId: userId || payload?.userId || payload?.user_id || null,
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

  async hasOutstandingForRecord(tableName, recordId) {
    try {
      const rows = await db.pendingSync
        .where("status")
        .anyOf("PENDING", "FAILED")
        .toArray();
      return rows.some((row) => row.tableName === tableName && row.recordId === recordId);
    } catch {
      return false;
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

  async markBlocked(id, error = null) {
    try {
      await db.pendingSync.update(id, {
        status: "BLOCKED",
        error: error ? String(error) : null,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SyncRepository] markBlocked error:', error);
    }
  },

  async retryFailed() {
    try {
      await db.pendingSync.where("status").equals("FAILED").modify({
        status: "PENDING",
        error: null,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // The queue is best-effort; a later online event can retry again.
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
      const blocked = await db.pendingSync.where("status").equals("BLOCKED").count();

      return { pending, failed, synced, blocked };
    } catch {
      return { pending: 0, failed: 0, synced: 0, blocked: 0 };
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
