import SyncRepository from "../database/repositories/SyncRepository";

export async function enqueueSync(tableName, recordId, operation, payload = null) {
  return await SyncRepository.enqueue(tableName, recordId, operation, payload);
}
