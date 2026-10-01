import SyncRepository from "../database/repositories/SyncRepository";
import { schedulePendingSupabaseSync } from "./supabaseSync";

export async function enqueueSync(tableName, recordId, operation, payload = null) {
  // Read the active account through Dexie so this helper also remains safe
  // inside an existing Dexie transaction (auth calls would close that txn).
  const activeAccount = await SyncRepository.getActiveAccount();
  const userId = payload?.userId || payload?.user_id || activeAccount?.userId || null;
  const entry = await SyncRepository.enqueue(tableName, recordId, operation, payload, userId);
  // Deliberately don't await network work: Dexie is the commit point for CRUD.
  if (entry && typeof navigator !== "undefined" && navigator.onLine) {
    schedulePendingSupabaseSync();
  }
  return entry;
}
