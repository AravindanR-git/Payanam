import supabase from './supabaseClient';
import db from '../database/db';
import SyncRepository from '../database/repositories/SyncRepository';

const MAX_SYNC_RETRIES = 3;
const SYNC_COOLDOWN_MS = 2000;

const recentlySynced = new Map();
const entitySubscriptions = new Map();

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

export function mapSupabaseRowToLocalRow(entity, row) {
  const id = String(row.id);
  const userId = String(row.user_id || '');
  const createdAt = toIsoString(row.created_at) || new Date().toISOString();
  const updatedAt = toIsoString(row.updated_at) || createdAt;

  switch (entity) {
    case 'trips':
      return {
        id,
        userId,
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
      return {
        id,
        userId,
        name: String(row.name ?? ''),
        icon: String(row.icon ?? '📂'),
        color: String(row.color ?? '#666666'),
        tripTypes: Array.isArray(row.trip_types) ? row.trip_types : [],
        displayOrder: toNumber(row.display_order, 0),
        isDefault: Boolean(row.is_default),
        usageCount: toNumber(row.usage_count, 0),
        lastUsed: toIsoString(row.last_used),
        createdAt,
        updatedAt,
      };
    case 'expenseItems':
      return {
        id,
        categoryId: String(row.category_id || ''),
        userId,
        name: String(row.name ?? ''),
        icon: String(row.icon ?? '📦'),
        displayOrder: toNumber(row.display_order, 0),
        isDefault: Boolean(row.is_default),
        usageCount: toNumber(row.usage_count, 0),
        lastUsed: toIsoString(row.last_used),
        createdAt,
        updatedAt,
      };
    case 'participants':
      return {
        id,
        tripId: String(row.trip_id || ''),
        userId,
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
        id,
        tripId: String(row.trip_id || ''),
        participantId: String(row.participant_id || ''),
        userId,
        amount: toNumber(row.amount, 0),
        createdAt,
        updatedAt,
      };
    case 'expenses': {
      const mapped = {
        id,
        tripId: String(row.trip_id || ''),
        userId,
        categoryId: row.category_id ? String(row.category_id) : null,
        itemId: row.item_id ? String(row.item_id) : null,
        categoryName: String(row.category_name ?? ''),
        selectedItems: row.selected_items || [],
        expenseTime: toIsoString(row.expense_time),
        amount: toNumber(row.amount, 0),
        notes: String(row.notes ?? ''),
        paymentSource: String(row.payment_source ?? 'fund'),
        paidByParticipantId: row.paid_by_participant_id ? String(row.paid_by_participant_id) : null,
        latitude: row.latitude != null ? toNumber(row.latitude) : null,
        longitude: row.longitude != null ? toNumber(row.longitude) : null,
        locationName: String(row.location_name ?? ''),
        locationSource: String(row.location_source ?? 'none'),
        syncStatus: 'SYNCED',
        createdAt,
        updatedAt,
      };
      return mapped;
    }
    case 'places':
      return {
        id,
        userId,
        name: String(row.name ?? ''),
        displayOrder: toNumber(row.display_order, 0),
        createdAt,
        updatedAt,
      };
    case 'activities':
      return {
        id,
        tripId: String(row.trip_id || ''),
        userId,
        type: String(row.type ?? 'expense'),
        createdAt,
        updatedAt,
      };
    default:
      return { id, userId, createdAt, updatedAt };
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
    const attempts = Number(entry.attempts) || 0;
    if (attempts >= MAX_SYNC_RETRIES) {
      results.skipped++;
      continue;
    }

    if (entry.operation === 'DELETE') {
      const result = await deleteEntity(entity, entry.recordId);

      if (result.error) {
        results.failed++;
        await SyncRepository.markFailed(entry.id, result.error);
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
      await SyncRepository.markFailed(entry.id, result.error);
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
  const userId = record.userId || record.user_id;

  console.log(`[SupabaseSync] uploadEntity called: entity=${entity}, id=${record.id}, userId=${userId}, table=${tableName}`);

  if (!userId) {
    console.error(`[SupabaseSync] uploadEntity MISSING userId for ${entity} ${record.id}`);
    return { error: `Missing userId for ${entity} ${record.id}` };
  }

  const isDemoUser = userId === 'demo-user' || !String(userId).includes('-');
  if (isDemoUser) {
    console.error(`[SupabaseSync] uploadEntity DEMO USER REJECTED for ${entity} ${record.id}, userId=${userId}`);
    return { error: `Invalid userId for ${entity} ${record.id}: must be authenticated Supabase user` };
  }

  if (!isValidUuid(record.id)) {
    console.error(`[SupabaseSync] uploadEntity INVALID UUID for ${entity} ${record.id}`);
    return { error: `Invalid UUID format for ${entity} ${record.id}: ${record.id}. This record was created before UUID adoption and cannot be uploaded to Supabase.` };
  }

  markRecentlySynced(entity, record.id);

  let mappedPayload;
  switch (entity) {
    case 'trips':
      mappedPayload = {
        id: record.id,
        user_id: record.userId,
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
        user_id: record.userId,
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
        user_id: record.userId,
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
        user_id: record.userId,
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
        user_id: record.userId,
        amount: toNumber(record.amount, 0),
        created_at: toIsoString(record.createdAt),
        updated_at: toIsoString(record.updatedAt || record.createdAt),
      };
      break;
    case 'expenses':
      mappedPayload = {
        id: record.id,
        trip_id: record.tripId,
        user_id: record.userId,
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
        user_id: record.userId,
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
        user_id: record.userId,
        type: record.type || 'expense',
        created_at: toIsoString(record.createdAt),
        updated_at: toIsoString(record.updatedAt || record.createdAt),
      };
      break;
    default:
      return { error: `Unknown entity: ${entity}` };
  }

  const { data, error } = await supabase
    .from(tableName)
    .upsert(mappedPayload)
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
      payload: mappedPayload,
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

  await db.transaction('rw', db.table(entity), async () => {
    for (const cloudRow of data) {
      const mapped = mapSupabaseRowToLocalRow(entity, cloudRow);
      const localRecord = localMap.get(mapped.id);
      const cloudUpdatedAt = new Date(mapped.updatedAt).getTime();
      const localUpdatedAt = localRecord ? new Date(localRecord.updatedAt).getTime() : 0;

      if (localRecord && cloudUpdatedAt <= localUpdatedAt) {
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
    }, (payload) => {
      console.log(`[Realtime] ${entity} ${payload.eventType} id=${payload.new?.id || payload.old?.id}`);

      if (payload.eventType === 'DELETE') {
        const deletedId = String(payload.old?.id || payload.record?.id || '');
        if (deletedId && isValidUuid(deletedId)) {
          db.table(entity).delete(deletedId).then(() => {
            console.log(`[Realtime] ${entity} Dexie delete success id=${deletedId}`);
            callback(deletedId, 'DELETE');
          }).catch((error) => {
            console.error(`[SupabaseSync] Realtime DELETE ${entity} failed:`, error);
          });
        }
        return;
      }

      const mapped = mapSupabaseRowToLocalRow(entity, payload.new);

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

export function unsubscribeAll() {
  for (const [, channel] of entitySubscriptions) {
    supabase.removeChannel(channel);
  }
  entitySubscriptions.clear();
}

export async function deleteEntity(entity, recordId) {
  const tableName = getTableName(entity);

  markRecentlySynced(entity, recordId);

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', recordId);

  if (error) {
    console.error(`[SupabaseSync] delete ${entity} FAILED:`, {
      id: recordId,
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
    table: tableName,
  });

  return { error: null };
}

export { recentlySynced, isRecentlySynced, markRecentlySynced };
