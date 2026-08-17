import SyncRepository from "../database/repositories/SyncRepository";
import db from "../database/db";
import { processPendingSupabaseTrips } from "./supabaseSync";

const API_BASE = import.meta.env.VITE_API_BASE || "";
const SYNC_INTERVAL_MS = 30 * 1000;
const MAX_RETRIES = 3;

function getAuthToken() {
  try {
    return localStorage.getItem("tripledger_token") || "";
  } catch {
    return "";
  }
}

function getAuthHeaders() {
  const token = getAuthToken();

  if (!token) return {};

  return { Authorization: `Bearer ${token}` };
}

const TABLE_REPOSITORIES = {};

async function getRepository(tableName) {
  if (!TABLE_REPOSITORIES[tableName]) {
    switch (tableName) {
      case "trips":
        TABLE_REPOSITORIES[tableName] = (await import("../database/repositories/TripRepository.js")).default;
        break;
      case "participants":
        TABLE_REPOSITORIES[tableName] = (await import("../database/repositories/ParticipantRepository.js")).default;
        break;
      case "contributions":
        TABLE_REPOSITORIES[tableName] = (await import("../database/repositories/ContributionRepository.js")).default;
        break;
      case "expenses":
        TABLE_REPOSITORIES[tableName] = (await import("../database/repositories/ExpenseRepository.js")).default;
        break;
      case "expenseCategories":
        TABLE_REPOSITORIES[tableName] = (await import("../database/repositories/CategoryRepository.js")).default;
        break;
      case "expenseItems":
        TABLE_REPOSITORIES[tableName] = (await import("../database/repositories/ItemRepository.js")).default;
        break;
      case "places":
        TABLE_REPOSITORIES[tableName] = (await import("../database/repositories/PlaceRepository.js")).default;
        break;
      case "activities":
        TABLE_REPOSITORIES[tableName] = (await import("../database/repositories/ActivityRepository.js")).default;
        break;
      default:
        return null;
    }
  }

  return TABLE_REPOSITORIES[tableName];
}

function tableNameToModel(tableName) {
  const map = {
    trips: "trip",
    participants: "participant",
    contributions: "contribution",
    expenses: "expense",
    expenseCategories: "category",
    expenseItems: "item",
    places: "place",
    activities: "activity",
  };

  return map[tableName] || tableName;
}

async function resolveConflict(localRecord, remoteRecord, operation) {
  if (operation === "DELETE") {
    return remoteRecord.deletedAt ? null : remoteRecord;
  }

  if (!remoteRecord) {
    return localRecord;
  }

  const localTime = new Date(localRecord.updatedAt || localRecord.createdAt).getTime();
  const remoteTime = new Date(remoteRecord.updatedAt || remoteRecord.createdAt).getTime();

  if (remoteTime > localTime) {
    return remoteRecord;
  }

  if (localTime > remoteTime) {
    return localRecord;
  }

  return localRecord;
}

async function pushChange(syncEntry) {
  if (!API_BASE) return false;

  const repository = getRepository(syncEntry.tableName);

  if (!repository) {
    await SyncRepository.markFailed(syncEntry.id, "No repository for table");

    return false;
  }

  const model = tableNameToModel(syncEntry.tableName);

  try {
    const response = await fetch(`${API_BASE}/sync/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        model,
        operation: syncEntry.operation,
        recordId: syncEntry.recordId,
        payload: syncEntry.payload,
        createdAt: syncEntry.createdAt,
      }),
    });

    if (!response.ok) {
      const text = await response.text();

      await SyncRepository.markFailed(syncEntry.id, text);

      return false;
    }

    await SyncRepository.markSynced(syncEntry.id);

    if (syncEntry.operation === "DELETE") {
      await db.table(syncEntry.tableName).delete(syncEntry.recordId);
    } else {
      await db.table(syncEntry.tableName).update(syncEntry.recordId, {
        syncStatus: "SYNCED",
        updatedAt: new Date().toISOString(),
      });
    }

    return true;
  } catch (error) {
    await SyncRepository.markFailed(syncEntry.id, error.message);

    return false;
  }
}

async function pullChanges(lastSyncAt = new Date(0).toISOString()) {
  if (!API_BASE) return [];

  try {
    const response = await fetch(`${API_BASE}/sync/pull?lastSyncAt=${encodeURIComponent(lastSyncAt)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) return [];

    const data = await response.json();

    return data.changes || [];
  } catch {
    return [];
  }
}

async function applyRemoteChange(change) {
  const { model, operation, recordId, payload } = change;
  const tableName = Object.keys(TABLE_REPOSITORIES).find(
    key => tableNameToModel(key) === model
  );

  if (!tableName) return;

  const table = db.table(tableName);

  if (operation === "DELETE") {
    await table.delete(recordId);

    await SyncRepository.enqueue(tableName, recordId, "DELETE", payload);
  } else {
    const existing = await table.get(recordId);

    if (existing) {
      const resolved = await resolveConflict(existing, payload, operation);

      if (resolved) {
        await table.put({ ...resolved, syncStatus: "SYNCED" });

        await SyncRepository.enqueue(tableName, recordId, "UPDATE", resolved);
      }
    } else {
      await table.put({ ...payload, syncStatus: "SYNCED" });

      await SyncRepository.enqueue(tableName, recordId, "CREATE", payload);
    }
  }
}

const SyncService = {
  async enqueue(tableName, recordId, operation, payload = null) {
    return await SyncRepository.enqueue(tableName, recordId, operation, payload);
  },

  async syncNow() {
    if (!navigator.onLine) {
      return { pushed: 0, pulled: 0, failed: 0 };
    }

    await processPendingSupabaseTrips();

    const pending = await SyncRepository.getPending(50);

    let pushed = 0;
    let failed = 0;

    for (const entry of pending) {
      if (entry.attempts >= MAX_RETRIES) {
        await SyncRepository.markFailed(entry.id, "Max retries exceeded");

        failed++;

        continue;
      }

      const success = await pushChange(entry);

      if (success) {
        pushed++;
      } else {
        failed++;
      }
    }

    const remoteChanges = await pullChanges();

    let pulled = 0;

    for (const change of remoteChanges) {
      await applyRemoteChange(change);

      pulled++;
    }

    await SyncRepository.clearSynced();

    return { pushed, pulled, failed };
  },

  async getSyncStatus() {
    return await SyncRepository.getCounts();
  },

  async startAutoSync() {
    const trySync = async () => {
      if (navigator.onLine) {
        await this.syncNow();
      }
    };

    await trySync();

    const interval = setInterval(trySync, SYNC_INTERVAL_MS);

    window.addEventListener("online", trySync);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", trySync);
    };
  },
};

export default SyncService;
