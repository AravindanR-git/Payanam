import supabase from './supabaseClient';
import db from '../database/db';
import SyncRepository from '../database/repositories/SyncRepository';
import { mapLocalRecordToRemote, mapRemoteRowToLocal, resolveLocalToRemote, resolveRemoteToLocal } from './entityIdMap';

const SYNC_COOLDOWN_MS = 2000;

const recentlySynced = new Map();
const entitySubscriptions = new Map();
let scheduledSync = null;

function markRecentlySynced(entityKey, recordId) {
  const key = `${entityKey}:${recordId}`;
  recentlySynced.set(key, true);
  setTimeout(() => {
    recentlySynced.delete(key);
  }, SYNC_COOLDOWN_MS);
}

function isRecentlySynced(entityKey, recordId) {
  return recentlySynced.has(`${entityKey}:${recordId}`);
}

function getTableName(entity) {
  const map = {
    trips: 'trips',
    expenseCategories: 'expense_categories',
    expenseItems: 'expense_items',
    participants: 'participants',
    contributions: 'contributions',
    expenses: 'expenses',
    places: 'places',
    activities: 'activities',
  };
  return map[entity] || entity;
}

function getUserIdField(entity) {
  const map = {
    trips: 'user_id',
    expenseCategories: 'user_id',
    expenseItems: 'user_id',
    participants: 'user_id',
    contributions: 'user_id',
    expenses: 'user_id',
    places: 'user_id',
    activities: 'user_id',
  };
  return map[entity] || 'user_id';
}

function toIsoString(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

export async function mapSupabaseRowToLocalRow(entity, row, userId) {
  const id = String(row.id);
  const userIdStr = String(row.user_id || userId || '');
  const createdAt = toIsoString(row.created_at) || new Date().toISOString();
  const updatedAt = toIsoString(row.updated_at) || createdAt;

  switch (entity) {
    case 'trips':
      return {
        id: await resolveRemoteToLocal('trips', id, userIdStr),
        userId: userIdStr,
        tripName: String(row.trip_name ?? ''),
        tripType: String(row.trip_type ?? 'friends'),
        status: String(row.status ?? 'ACTIVE'),
        defaultContributionPerPerson: toNumber(row.default_contribution_per_person, 0),
        endedAt: toIsoString(row.ended_at),
        endDate: toIsoString(row.end_date),
        continuationClosedAt: toIsoString(row.continuation_closed_at),
        createdAt,
        updatedAt,
      };
    case 'expenseCategories':
    case 'expenseItems':
    case 'expenses':
      return mapRemoteRowToLocal(entity, row, userIdStr);
    case 'participants':
      return {
        id: await resolveRemoteToLocal('participants', id, userIdStr),
        userId: userIdStr,
        tripId: await resolveRemoteToLocal('trips', row.trip_id, userIdStr),
        type: String(row.type ?? 'friend'),
        name: String(row.name ?? ''),
        adults: toNumber(row.adults, 1),
        children: toNumber(row.children, 0),
        memberCount: toNumber(row.member_count, 1),
        initialContribution: toNumber(row.initial_contribution, 0),
        createdAt,
        updatedAt,
      };
    case 'contributions':
      return {
        id: await resolveRemoteToLocal('contributions', id, userIdStr),
        userId: userIdStr,
        tripId: await resolveRemoteToLocal('trips', row.trip_id, userIdStr),
        participantId: await resolveRemoteToLocal('participants', row.participant_id, userIdStr),
        amount: toNumber(row.amount, 0),
        createdAt,
        updatedAt,
      };
    case 'places':
      return {
        id: await resolveRemoteToLocal('places', id, userIdStr),
        userId: userIdStr,
        name: String(row.name ?? ''),
        displayOrder: toNumber(row.display_order, 0),
        createdAt,
        updatedAt,
      };
    case 'activities':
      return {
        id: await resolveRemoteToLocal('activities', id, userIdStr),
        userId: userIdStr,
        tripId: await resolveRemoteToLocal('trips', row.trip_id, userIdStr),
        type: String(row.type ?? 'expense'),
        createdAt,
        updatedAt,
      };
    default:
      return { id, userId: userIdStr, createdAt, updatedAt };
  }
}

export function validateRecordForDexie(record) {
  for (const key of Object.keys(record)) {
    try {
      structuredClone({ [key]: record[key] });
    } catch {
      return { key, value: record[key], type: typeof record[key] };
    }
  }
  return null;
}

export function sanitizeError(error) {
  if (!error) return null;
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

export async function processPendingSupabase(entity) {
  const pending = await SyncRepository.getPending(50);
  const failed = await SyncRepository.getFailed();
  const entries = [...pending, ...failed].filter((e) => e.tableName === entity);

  const results = { uploaded: 0, failed: 0, skipped: 0 };

  for (const entry of entries) {
    if (entry.operation === 'DELETE') {
      const result = await deleteEntity(entity, entry.recordId);

      if (result.error) {
        results.failed++;
        await markSyncFailure(entry.id, result.error);
      } else {
        results.uploaded++;
        await SyncRepository.markSynced(entry.id);
      }
      continue;
    }

    const localRecord = await db.table(entity).get(entry.recordId);

    if (!localRecord) {
      await SyncRepository.markSynced(entry.id);
      results.skipped++;
      continue;
    }

    const result = await uploadEntity(entity, localRecord);

    if (result.error) {
      results.failed++;
      await markSyncFailure(entry.id, result.error);
    } else {
      results.uploaded++;
      await SyncRepository.markSynced(entry.id);
    }
  }

  return results;
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));
}

export async function uploadEntity(entity, record) {
  const tableName = getTableName(entity);
  const userId = await resolveRecordUserId(entity, record);

  console.log(`[SupabaseSync] uploadEntity called: entity=${entity}, id=${record.id}, userId=${userId}, table=${tableName}`);

  if (!userId) {
    console.error(`[SupabaseSync] uploadEntity MISSING userId for ${entity} ${record.id}`);
    return { error: `Missing userId for ${entity} ${record.id}` };
  }

  const isDemoUser = userId === 'demo-user' || !isValidUuid(userId);
  if (isDemoUser) {
    console.error(`[SupabaseSync] uploadEntity DEMO USER REJECTED for ${entity} ${record.id}, userId=${userId}`);
    return { error: `Invalid userId for ${entity} ${record.id}: must be authenticated Supabase user` };
  }

  markRecentlySynced(entity, record.id);

  let mappedPayload;
  switch (entity) {
    case 'trips':
      mappedPayload = {
        id: record.id,
        user_id: userId,
        trip_name: record.tripName,
        trip_type: record.tripType,
        status: record.status,
        default_contribution_per_person: toNumber(record.defaultContributionPerPerson, 0),
        ended_at: toIsoString(record.endedAt),
        end_date: toIsoString(record.endDate),
        continuation_closed_at: toIsoString(record.continuationClosedAt),
        created_at: toIsoString(record.createdAt),
        updated_at: toIsoString(record.updatedAt || record.createdAt),
      };
      break;
    case 'expenseCategories':
      mappedPayload = {
        id: record.id,
        user_id: userId,
        name: record.name,
        icon: record.icon,
        color: record.color,
        trip_types: record.tripTypes || [],
        display_order: toNumber(record.displayOrder, 0),
        is_default: Boolean(record.isDefault),
        usage_count: toNumber(record.usageCount, 0),
        last_used: toIsoString(record.lastUsed),
        created_at: toIsoString(record.createdAt),
        updated_at: toIsoString(record.updatedAt || record.createdAt),
      };
      break;
    case 'expenseItems':
      mappedPayload = {
        id: record.id,
        category_id: record.categoryId,
        user_id: userId,
        name: record.name,
        icon: record.icon,
        display_order: toNumber(record.displayOrder, 0),
        is_default: Boolean(record.isDefault),
        usage_count: toNumber(record.usageCount, 0),
        last_used: toIsoString(record.lastUsed),
        created_at: toIsoString(record.createdAt),
        updated_at: toIsoString(record.updatedAt || record.createdAt),
      };
      break;
    case 'participants':
      mappedPayload = {
        id: record.id,
        trip_id: record.tripId,
        user_id: userId,
        type: record.type,
        name: record.name,
        adults: toNumber(record.adults, 1),
        children: toNumber(record.children, 0),
        member_count: toNumber(record.memberCount, 1),
        initial_contribution: toNumber(record.initialContribution, 0),
        created_at: toIsoString(record.createdAt),
        updated_at: toIsoString(record.updatedAt || record.createdAt),
      };
      break;
    case 'contributions':
      mappedPayload = {
        id: record.id,
        trip_id: record.tripId,
        participant_id: record.participantId,
        user_id: userId,
        amount: toNumber(record.amount, 0),
        created_at: toIsoString(record.createdAt),
        updated_at: toIsoString(record.updatedAt || record.createdAt),
      };
      break;
    case 'expenses':
      mappedPayload = {
        id: record.id,
        trip_id: record.tripId,
        user_id: userId,
        category_id: record.categoryId,
        item_id: record.itemId,
        category_name: record.categoryName,
        selected_items: record.selectedItems || [],
        expense_time: toIsoString(record.expenseTime),
        amount: toNumber(record.amount, 0),
        notes: record.notes,
        payment_source: record.paymentSource || 'fund',
        paid_by_participant_id: record.paidByParticipantId,
        latitude: record.latitude,
        longitude: record.longitude,
        location_name: record.locationName,
        location_source: record.locationSource || 'none',
        created_at: toIsoString(record.createdAt),
        updated_at: toIsoString(record.updatedAt || record.createdAt),
      };
      break;
    case 'places':
      mappedPayload = {
        id: record.id,
        user_id: userId,
        name: record.name,
        display_order: toNumber(record.displayOrder, 0),
        created_at: toIsoString(record.createdAt),
        updated_at: toIsoString(record.updatedAt || record.createdAt),
      };
      break;
    case 'activities':
      mappedPayload = {
        id: record.id,
        trip_id: record.tripId,
        user_id: userId,
        type: record.type || 'expense',
        created_at: toIsoString(record.createdAt),
        updated_at: toIsoString(record.updatedAt || record.createdAt),
      };
      break;
    default:
      return { error: `Unknown entity: ${entity}` };
  }

  const remotePayload = await mapLocalRecordToRemote(entity, mappedPayload);
  const invalidColumn = validateRemotePayload(entity, remotePayload, mappedPayload);
  if (invalidColumn) {
    return { data: null, error: `PERMANENT: Invalid ${invalidColumn} mapping for ${entity} ${record.id}` };
  }

  const { data, error } = await supabase
    .from(tableName)
    .upsert(remotePayload)
    .select();

  if (error) {
    console.error(`[SupabaseSync] upload ${entity} FAILED:`, {
      id: record.id,
      userId: record.userId,
      table: tableName,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      payload: remotePayload,
    });
    return { data: null, error: error.message || String(error) };
  }

  console.log(`[SupabaseSync] upload ${entity} SUCCESS:`, {
    id: record.id,
    userId: record.userId,
    table: tableName,
  });

  return { data, error: null };
}

export async function pullEntity(userId, entity) {
  const tableName = getTableName(entity);

  let query = supabase.from(tableName).select('*');

  if (entity === 'expenseCategories') {
    query = query.eq('user_id', userId);
  } else {
    query = query.eq(getUserIdField(entity), userId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error(`[SupabaseSync] pull ${entity} FAILED:`, {
      userId,
      table: tableName,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return { data: null, error: error.message || String(error) };
  }

  console.log(`[SupabaseSync] pull ${entity} SUCCESS:`, {
    userId,
    table: tableName,
    count: data?.length || 0,
  });

  return { data: data || [], error: null };
}

export async function hydrateEntity(userId, entity) {
  if (!userId) return [];

  const { data, error } = await pullEntity(userId, entity);

  if (error || !data || data.length === 0) {
    return [];
  }

  const localRecords = await db.table(entity).toArray();
  const localMap = new Map(localRecords.map((r) => [r.id, r]));
  // Mapping may resolve persisted IDs or default keys. Do it before opening a
  // Dexie transaction: Supabase/Dexie awaits inside a transaction cause
  // PrematureCommitError.
  const mappedRows = await Promise.all(data.map((row) => mapSupabaseRowToLocalRow(entity, row, userId)));
  const outstandingIds = new Set((await Promise.all(
    mappedRows.map(async (mapped) => (
      (await SyncRepository.hasOutstandingForRecord(entity, mapped.id)) ? mapped.id : null
    )),
  )).filter(Boolean));

  await db.transaction('rw', db.table(entity), async () => {
    for (const mapped of mappedRows) {
      const localRecord = localMap.get(mapped.id);
      const hasOutstandingLocalChange = localRecord && outstandingIds.has(mapped.id);
      const cloudUpdatedAt = new Date(mapped.updatedAt).getTime();
      const localUpdatedAt = localRecord ? new Date(localRecord.updatedAt).getTime() : 0;

      if (hasOutstandingLocalChange || (localRecord && cloudUpdatedAt <= localUpdatedAt)) {
        continue;
      }

      if (localRecord) {
        await db.table(entity).update(mapped.id, mapped);
      } else {
        await db.table(entity).add(mapped);
      }
    }
  });

  return data;
}

function validateRemotePayload(entity, payload, original) {
  const uuidFields = {
    trips: ['id'], participants: ['id', 'trip_id'], contributions: ['id', 'trip_id', 'participant_id'],
    expenseCategories: ['id'], expenseItems: ['id', 'category_id'],
    expenses: ['id', 'trip_id'],
  };
  for (const field of uuidFields[entity] || []) {
    if (!isValidUuid(payload[field])) return field;
  }
  for (const field of ['category_id', 'item_id', 'paid_by_participant_id']) {
    if (original[field] && !isValidUuid(payload[field])) return field;
  }
  return null;
}

export function subscribeToEntity(entity, userId, callback) {
  if (!userId) {
    return { unsubscribe: () => {} };
  }

  const tableName = getTableName(entity);
  const channelName = `${entity}:${userId}`;

  if (entitySubscriptions.has(channelName)) {
    supabase.removeChannel(entitySubscriptions.get(channelName));
  }

  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: tableName,
      filter: `user_id=eq.${userId}`,
    }, async (payload) => {
      console.log(`[Realtime] ${entity} ${payload.eventType} id=${payload.new?.id || payload.old?.id}`);

      if (payload.eventType === 'DELETE') {
        const deletedId = String(payload.old?.id || payload.record?.id || '');
        if (deletedId && isValidUuid(deletedId)) {
          const localId = await resolveRemoteToLocal(entity, deletedId, userId);
          const deleteId = localId || deletedId;
          db.table(entity).delete(deleteId).then(() => {
            console.log(`[Realtime] ${entity} Dexie delete success id=${deleteId}`);
            callback(deleteId, 'DELETE');
          }).catch((error) => {
            console.error(`[SupabaseSync] Realtime DELETE ${entity} failed:`, error);
          });
        }
        return;
      }

      const mapped = await mapSupabaseRowToLocalRow(entity, payload.new, userId);

      const nonCloneable = validateRecordForDexie(mapped);
      if (nonCloneable) {
        console.error(`[SupabaseSync] Non-cloneable property in ${entity} Realtime:`, nonCloneable);
        return;
      }

      db.table(entity).put(mapped).then(() => {
        console.log(`[Realtime] ${entity} Dexie upsert success id=${mapped.id}`);
        callback(mapped.id, payload.eventType);
      });
    })
    .subscribe((status, err) => {
      console.log(`[Realtime] ${entity} subscription status=${status}`);
      if (err) {
        console.error(`[Realtime] ${entity} subscription error:`, err);
      }
    });

  entitySubscriptions.set(channelName, channel);

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
      entitySubscriptions.delete(channelName);
    },
  };
}

export async function processAllPendingSupabase() {
  const entities = [
    'trips',
    'expenseCategories',
    'expenseItems',
    'participants',
    'contributions',
    'expenses',
    'places',
    'activities',
  ];

  const totalResults = {
    uploaded: 0,
    failed: 0,
    skipped: 0,
  };

  for (const entity of entities) {
    const results = await processPendingSupabase(entity);
    totalResults.uploaded += results.uploaded;
    totalResults.failed += results.failed;
    totalResults.skipped += results.skipped;
  }

  return totalResults;
}

export function schedulePendingSupabaseSync() {
  if (scheduledSync || typeof navigator === 'undefined' || !navigator.onLine) return;
  scheduledSync = setTimeout(async () => {
    scheduledSync = null;
    await SyncRepository.retryFailed();
    await processAllPendingSupabase();
    await SyncRepository.clearSynced();
  }, 0);
}

async function resolveRecordUserId(entity, record) {
  const recordUserId = record.userId || record.user_id;
  if (recordUserId && recordUserId !== 'demo-user' && isValidUuid(recordUserId)) return recordUserId;

  const tripId = record.tripId || record.trip_id;
  if (tripId) {
    const trip = await db.trips.get(tripId);
    if (trip?.userId) return trip.userId;
  }

  const participantId = record.participantId || record.participant_id;
  if (entity === 'contributions' && participantId) {
    const participant = await db.participants.get(participantId);
    if (participant?.userId) return participant.userId;
    if (participant?.tripId) return (await db.trips.get(participant.tripId))?.userId || null;
  }

  // A root demo trip has no trustworthy owner relationship. Preserve its queue
  // entry as BLOCKED rather than silently assigning it to the current account.
  if (recordUserId === 'demo-user') return recordUserId;

  // Default categories/items are global local templates. Their cloud copies
  // belong to whichever authenticated account is currently syncing them.
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || recordUserId || null;
}

function isPermanentSyncError(error) {
  const message = String(error || '');
  return message.startsWith('PERMANENT:') ||
    message.includes("Could not find the '") ||
    message.includes('schema cache') ||
    message.includes('PGRST204');
}

async function markSyncFailure(entryId, error) {
  if (isPermanentSyncError(error)) {
    await SyncRepository.markBlocked(entryId, error);
  } else {
    await SyncRepository.markFailed(entryId, error);
  }
}

export function unsubscribeAll() {
  for (const [, channel] of entitySubscriptions) {
    supabase.removeChannel(channel);
  }
  entitySubscriptions.clear();
}

export async function deleteEntity(entity, recordId) {
  const tableName = getTableName(entity);

  const remoteId = await resolveLocalToRemote(entity, recordId);
  const deleteId = remoteId || recordId;

  markRecentlySynced(entity, deleteId);

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', deleteId);

  if (error) {
    console.error(`[SupabaseSync] delete ${entity} FAILED:`, {
      id: recordId,
      remoteId: deleteId,
      table: tableName,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return { error: error.message || String(error) };
  }

  console.log(`[SupabaseSync] delete ${entity} SUCCESS:`, {
    id: recordId,
    remoteId: deleteId,
    table: tableName,
  });

  return { error: null };
}

export { recentlySynced, isRecentlySynced, markRecentlySynced };
