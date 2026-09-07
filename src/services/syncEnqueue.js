import SyncRepository from "../database/repositories/SyncRepository";
import { schedulePendingSupabaseSync } from "./supabaseSync";

export async function enqueueSync(tableName, recordId, operation, payload = null) {
  const entry = await SyncRepository.enqueue(tableName, recordId, operation, payload);
  // Deliberately don't await network work: Dexie is the commit point for CRUD.
  if (entry && typeof navigator !== "undefined" && navigator.onLine) {
    schedulePendingSupabaseSync();
  }
  return entry;
}
