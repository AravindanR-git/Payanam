import supabase from './supabaseClient';
import db from '../database/db';
import SyncRepository from '../database/repositories/SyncRepository';
import { mapLocalRecordToRemote, mapRemoteRowToLocal, resolveLocalToRemote, resolveRemoteToLocal } from './entityIdMap';

const SYNC_COOLDOWN_MS = 2000;

export const SYNC_ENTITIES = [
  'profiles', 'trips', 'expenseCategories', 'expenseItems', 'participants', 'contributions',
  'expenses', 'expensePaymentAllocations', 'places', 'placeCategories', 'activities', 'transports',
];

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
    profiles: 'profiles',
    trips: 'trips',
    transports: 'transports',
    expenseCategories: 'expense_categories',
    expenseItems: 'expense_items',
    participants: 'participants',
    contributions: 'contributions',
    expenses: 'expenses',
    expensePaymentAllocations: 'expense_payment_allocations',
    places: 'places',
    placeCategories: 'place_categories',
    syncTombstones: 'sync_tombstones',
    activities: 'activities',
  };
  return map[entity] || entity;
}

function getUserIdField(entity) {
  const map = {
    profiles: 'id',
    trips: 'user_id',
    transports: 'user_id',
    expenseCategories: 'user_id',
    expenseItems: 'user_id',
    participants: 'user_id',
    contributions: 'user_id',
    expenses: 'user_id',
    expensePaymentAllocations: 'user_id',
    places: 'user_id',
    placeCategories: 'user_id',
    syncTombstones: 'user_id',
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
    case 'profiles':
      return { id, userId: id, display_name: row.display_name || '', phone: row.phone || null, avatar_url: row.avatar_url || null, createdAt, updatedAt };
    case 'trips':
      return {
        id: await resolveRemoteToLocal('trips', id, userIdStr),
        userId: userIdStr,
        tripName: String(row.trip_name ?? ''),
        templeName: String(row.temple_name ?? ''),
        tripType: String(row.trip_type ?? 'friends'),
        status: String(row.status ?? 'ACTIVE'),
        defaultContributionPerPerson: toNumber(row.default_contribution_per_person, 0),
        endedAt: toIsoString(row.ended_at),
        endDate: toIsoString(row.end_date),
        continuationClosedAt: toIsoString(row.continuation_closed_at),
        transport: row.transport_snapshot || null,
        irumudi: row.irumudi_snapshot || null,
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
        participantId: row.participant_id ? await resolveRemoteToLocal('participants', row.participant_id, userIdStr) : null,
        donorName: row.donor_name || null,
        donorNote: row.donor_note || null,
        amount: toNumber(row.amount, 0),
        createdAt,
        updatedAt,
      };
    case 'places':
      return {
        id: await resolveRemoteToLocal('places', id, userIdStr),
        userId: userIdStr,
        tripId: await resolveRemoteToLocal('trips', row.trip_id, userIdStr),
        name: String(row.name ?? ''),
        categoryName: String(row.category_name ?? 'Other'),
        latitude: row.latitude == null ? null : Number(row.latitude),
        longitude: row.longitude == null ? null : Number(row.longitude),
        accuracy: row.accuracy == null ? null : Number(row.accuracy),
        address: row.address || '',
        rating: row.rating == null ? null : Number(row.rating),
        description: row.description || '',
        photo: row.photo || null,
        capturedAt: toIsoString(row.captured_at) || createdAt,
        displayOrder: toNumber(row.display_order, 0),
        createdAt,
        updatedAt,
      };
    case 'transports':
      return { id, userId: userIdStr, name: row.name || "", vehicleType: row.vehicle_type || "", vehicleNumber: row.vehicle_number || "", ownership: row.ownership || "own", pricingMode: row.pricing_mode || "perKm", ratePerKm: toNumber(row.rate_per_km, 0), packageAmount: toNumber(row.package_amount, 0), driverName: row.driver_name || "", driverPhone: row.driver_phone || "", additionalPhone: row.additional_phone || "", driverBetaPerDay: toNumber(row.driver_beta_per_day, 0), photo: row.photo || null, createdAt, updatedAt };
    case 'placeCategories':
      return { id, userId: userIdStr, name: String(row.name || ''), displayOrder: toNumber(row.display_order, 0), isDefault: Boolean(row.is_default), createdAt, updatedAt };
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
  const pending = await SyncRepository.getPending(1000);
  const failed = await SyncRepository.getFailed();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return { uploaded: 0, failed: 0, skipped: 0 };
  const entries = [...pending, ...failed].filter((e) => e.tableName === entity && (!e.userId || e.userId === session.user.id));

  const results = { uploaded: 0, failed: 0, skipped: 0 };

  for (const entry of entries) {
    if (entry.operation === 'DELETE') {
      const deleteId = entry.payload?.remoteId || entry.recordId;
      if (!isValidUuid(deleteId)) {
        await SyncRepository.markBlocked(entry.id, `PERMANENT: invalid UUID for delete: ${deleteId}`);
        results.failed++;
        continue;
      }
      const result = await deleteEntity(entity, deleteId, entry.userId || entry.payload?.userId || entry.payload?.user_id);

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

    if (entity === 'expensePaymentAllocations') {
      const expenseId = localRecord.expenseId;
      if (expenseId) {
        const expenseSync = await db.pendingSync
          .where('tableName').equals('expenses')
          .and(e => e.recordId === expenseId)
          .first();
        if (expenseSync && expenseSync.status !== 'SYNCED') {
          results.skipped++;
          continue;
        }
      }
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

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id || session.user.id !== userId) {
    return { error: `Account mismatch for ${entity} ${record.id}; queued data is retained for its owner.` };
  }

  markRecentlySynced(entity, record.id);

  if (entity === 'profiles' && record.avatarData) {
    try {
      const response = await fetch(record.avatarData);
      const avatarBlob = await response.blob();
      const objectPath = `${userId}/profile-avatar`;
      const { error: avatarError } = await supabase.storage.from('avatars').upload(objectPath, avatarBlob, { upsert: true, cacheControl: '3600' });
      if (avatarError) return { error: avatarError.message };
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(objectPath);
      record = { ...record, avatar_url: publicUrl, avatarUrl: publicUrl, avatarData: null, updatedAt: new Date().toISOString() };
      await db.profiles.put(record);
    } catch (error) {
      return { error: error?.message || 'Profile photo upload failed.' };
    }
  }

  let mappedPayload;
  switch (entity) {
    case 'profiles':
      mappedPayload = { id: userId, display_name: record.display_name || '', phone: record.phone || null, avatar_url: record.avatar_url || record.avatarUrl || null, created_at: toIsoString(record.createdAt || record.created_at), updated_at: toIsoString(record.updatedAt || record.updated_at || record.createdAt || record.created_at) };
      break;
    case 'trips':
      mappedPayload = {
        id: record.id,
        user_id: userId,
        trip_name: record.tripName,
        temple_name: record.templeName || null,
        trip_type: record.tripType,
        status: record.status,
        default_contribution_per_person: toNumber(record.defaultContributionPerPerson, 0),
        ended_at: toIsoString(record.endedAt),
        end_date: toIsoString(record.endDate),
        continuation_closed_at: toIsoString(record.continuationClosedAt),
        transport_snapshot: record.transport || null,
        irumudi_snapshot: record.irumudi || null,
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
        donor_name: record.donorName || null,
        donor_note: record.donorNote || null,
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
        paid_by_donor_id: record.paidByDonorId || null,
        latitude: record.latitude,
        longitude: record.longitude,
        location_name: record.locationName,
        location_source: record.locationSource || 'none',
        transport_settlement: Boolean(record.transportSettlement),
        transport_settlement_trip_id: record.transportSettlementTripId || null,
        created_at: toIsoString(record.createdAt),
        updated_at: toIsoString(record.updatedAt || record.createdAt),
      };
      break;
    case 'expensePaymentAllocations':
      mappedPayload = {
        id: record.id,
        expense_id: record.expenseId,
        payment_source_type: record.paymentSourceType,
        participant_id: record.participantId,
        donor_id: record.donorId,
        amount: toNumber(record.amount, 0),
        user_id: userId,
        created_at: toIsoString(record.createdAt),
        updated_at: toIsoString(record.updatedAt || record.createdAt),
      };
      break;
    case 'places':
      mappedPayload = {
        id: record.id,
        user_id: userId,
        trip_id: await resolveLocalToRemote('trips', record.tripId),
        name: record.name,
        category_name: record.categoryName || 'Other',
        latitude: record.latitude ?? null,
        longitude: record.longitude ?? null,
        accuracy: record.accuracy ?? null,
        address: record.address || null,
        rating: record.rating ?? null,
        description: record.description || null,
        photo: record.photo || null,
        captured_at: toIsoString(record.capturedAt),
        display_order: toNumber(record.displayOrder, 0),
        created_at: toIsoString(record.createdAt),
        updated_at: toIsoString(record.updatedAt || record.createdAt),
      };
      break;
    case 'transports':
      mappedPayload = { id: record.id, user_id: userId, name: record.name, vehicle_type: record.vehicleType, vehicle_number: record.vehicleNumber, ownership: record.ownership, pricing_mode: record.pricingMode, rate_per_km: toNumber(record.ratePerKm, 0), package_amount: toNumber(record.packageAmount, 0), driver_name: record.driverName, driver_phone: record.driverPhone, additional_phone: record.additionalPhone, driver_beta_per_day: toNumber(record.driverBetaPerDay, 0), photo: record.photo || null, created_at: toIsoString(record.createdAt), updated_at: toIsoString(record.updatedAt || record.createdAt) };
      break;
    case 'placeCategories':
      mappedPayload = { id: record.id, user_id: userId, name: record.name, display_order: toNumber(record.displayOrder, 0), is_default: Boolean(record.isDefault), created_at: toIsoString(record.createdAt), updated_at: toIsoString(record.updatedAt || record.createdAt) };
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

  const { data: deletion } = await supabase.from('sync_tombstones').select('updated_at')
    .eq('entity', entity).eq('record_id', remotePayload.id).eq('user_id', userId).maybeSingle();
  const localWriteTime = new Date(remotePayload.updated_at || remotePayload.created_at || 0).getTime();
  if (deletion && new Date(deletion.updated_at || 0).getTime() >= localWriteTime) {
    await db.table(entity).delete(record.id);
    return { data: null, error: null, conflict: 'delete' };
  }

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', remotePayload.id)
    .maybeSingle();

  if (error) return { data: null, error: error.message || String(error) };
  const localUpdatedAt = localWriteTime;
  const cloudUpdatedAt = new Date(data?.updated_at || data?.created_at || 0).getTime();
  if (data && cloudUpdatedAt > localUpdatedAt) {
    const winner = await mapSupabaseRowToLocalRow(entity, data, userId);
    await db.table(entity).put(winner);
    return { data, error: null, conflict: 'cloud' };
  }

  const { data: saved, error: saveError } = await supabase
    .from(tableName)
    .upsert(remotePayload)
    .select();

  if (saveError) {
    console.error(`[SupabaseSync] upload ${entity} FAILED:`, {
      id: record.id,
      userId: record.userId,
      table: tableName,
      message: saveError.message,
      details: saveError.details,
      hint: saveError.hint,
      code: saveError.code,
      payload: remotePayload,
    });
    return { data: null, error: saveError.message || String(saveError) };
  }

  const { error: tombstoneClearError } = await supabase.from('sync_tombstones').delete().eq('entity', entity).eq('record_id', remotePayload.id).eq('user_id', userId);
  if (tombstoneClearError) return { data: null, error: tombstoneClearError.message || String(tombstoneClearError) };

  console.log(`[SupabaseSync] upload ${entity} SUCCESS:`, {
    id: record.id,
    userId: record.userId,
    table: tableName,
  });

  return { data: saved, error: null };
}

export async function pullEntity(userId, entity) {
  const tableName = getTableName(entity);

  let query = supabase.from(tableName).select('*');

  if (entity === 'profiles') {
    query = query.eq('id', userId);
  } else if (entity === 'expenseCategories' || entity === 'placeCategories') {
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

  if (error || !data) return [];

  const localRecords = await db.table(entity).toArray();
  const localMap = new Map(localRecords.map((r) => [r.id, r]));
  // Mapping may resolve persisted IDs or default keys. Do it before opening a
  // Dexie transaction: Supabase/Dexie awaits inside a transaction cause
  // PrematureCommitError.
  const { data: tombstoneData, error: tombstoneError } = await supabase.from('sync_tombstones').select('entity,record_id').eq('user_id', userId).eq('entity', entity);
  if (tombstoneError) console.error('[SupabaseSync] tombstone pull failed:', tombstoneError.message);
  const tombstones = tombstoneData || [];
  const deletedAtById = new Map(await Promise.all(tombstones.map(async (row) => [
    await resolveRemoteToLocal(entity, row.record_id, userId), new Date(row.updated_at || 0).getTime(),
  ])));
  const mappedRows = await Promise.all(data.map((row) => mapSupabaseRowToLocalRow(entity, row, userId)));
  if (!data.length && !deletedAtById.size) return [];
  const remoteIdByLocalId = new Map(mappedRows.map((row, index) => [row.id, data[index].id]));
  const cloudLocalIds = new Set(mappedRows.map((row) => row.id));
  for (const [localId, deletedAt] of deletedAtById) {
    if (cloudLocalIds.has(localId)) continue;
    const local = localMap.get(localId);
    if (!local) continue;
    const pending = await SyncRepository.hasOutstandingForRecord(entity, localId);
    if (!pending && new Date(local.updatedAt || local.createdAt || 0).getTime() <= deletedAt) {
      await db.table(entity).delete(localId);
    }
  }
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
      const localUpdatedAt = localRecord ? new Date(localRecord.updatedAt || localRecord.createdAt || 0).getTime() : 0;

      const deletedAt = deletedAtById.get(mapped.id);
      if (deletedAt != null && cloudUpdatedAt <= deletedAt) {
        if (hasOutstandingLocalChange || localUpdatedAt > deletedAt) continue;
        await db.table(entity).delete(mapped.id);
        continue;
      }
      if (deletedAt != null && cloudUpdatedAt > deletedAt) {
        await supabase.from('sync_tombstones').delete().eq('entity', entity).eq('record_id', remoteIdByLocalId.get(mapped.id)).eq('user_id', userId);
      }

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

export async function syncAccountData(userId) {
  if (!userId) return { pushed: 0, pulled: 0, failed: 0, skipped: 0 };
  await enqueueExistingLocalAccountData(userId);
  if (!navigator.onLine) return { pushed: 0, pulled: 0, failed: 0, skipped: 0 };
  const push = await processAllPendingSupabase();
  let pulled = 0;
  for (const entity of SYNC_ENTITIES) {
    const rows = await hydrateEntity(userId, entity);
    pulled += rows.length;
  }
  await SyncRepository.clearSynced();
  return { ...push, pulled };
}

async function enqueueExistingLocalAccountData(userId) {
  const active = await db.activeAccount.get('active');
  if (!active || active.userId !== userId || active.syncBootstrapComplete) return;
  const trips = await db.trips.toArray();
  const tripOwners = new Map(trips.map((trip) => [trip.id, trip.userId || userId]));
  const expenses = await db.expenses.toArray();
  const expenseOwners = new Map(expenses.map((expense) => [expense.id, expense.userId || tripOwners.get(expense.tripId)]));

  for (const entity of SYNC_ENTITIES) {
    const rows = await db.table(entity).toArray();
    for (const row of rows) {
      let owner = row.userId || row.user_id || null;
      if (entity === 'profiles') owner ||= row.id;
      if (!owner && ['expenseCategories', 'expenseItems', 'transports', 'trips'].includes(entity)) {
        owner = userId;
        row.userId = userId;
        await db.table(entity).put(row);
      }
      if (!owner && entity === 'placeCategories' && !row.isDefault) {
        owner = userId;
        row.userId = userId;
        await db.placeCategories.put(row);
      }
      if (!owner && row.tripId) owner = tripOwners.get(row.tripId) || null;
      if (!owner && entity === 'expensePaymentAllocations') owner = expenseOwners.get(row.expenseId) || null;
      if (owner !== userId) continue;
      if (await SyncRepository.hasOutstandingForRecord(entity, row.id)) continue;
      await SyncRepository.enqueue(entity, row.id, 'UPDATE', { ...row, userId: row.userId || userId }, userId);
    }
  }

  await db.activeAccount.update('active', { syncBootstrapComplete: true, updatedAt: new Date().toISOString() });
}

export function subscribeToTombstones(userId, callback = () => {}) {
  if (!userId) return { unsubscribe: () => {} };
  const channelName = `sync-tombstones:${userId}`;
  if (entitySubscriptions.has(channelName)) supabase.removeChannel(entitySubscriptions.get(channelName));
  const channel = supabase.channel(channelName).on('postgres_changes', {
    event: '*', schema: 'public', table: 'sync_tombstones', filter: `user_id=eq.${userId}`,
  }, async (payload) => {
    const row = payload.new;
    if (!row?.entity || !row?.record_id || !SYNC_ENTITIES.includes(row.entity)) return;
    const localId = await resolveRemoteToLocal(row.entity, row.record_id, userId);
    if (localId) {
      const local = await db.table(row.entity).get(localId);
      const pending = await SyncRepository.hasOutstandingForRecord(row.entity, localId);
      if (pending || (local && new Date(local.updatedAt || local.createdAt || 0).getTime() > new Date(row.updated_at || 0).getTime())) return;
      await db.table(row.entity).delete(localId);
      callback(row.entity, localId, 'DELETE');
    }
  }).subscribe();
  entitySubscriptions.set(channelName, channel);
  return { unsubscribe: () => { supabase.removeChannel(channel); entitySubscriptions.delete(channelName); } };
}

export function subscribeToProfile(userId, callback) {
  if (!userId) return { unsubscribe: () => {} };
  const channelName = `profile:${userId}`;
  if (entitySubscriptions.has(channelName)) supabase.removeChannel(entitySubscriptions.get(channelName));
  const channel = supabase.channel(channelName).on('postgres_changes', {
    event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}`,
  }, async (payload) => {
    if (payload.eventType === 'DELETE') { await db.profiles.delete(userId); callback(null); return; }
    const mapped = await mapSupabaseRowToLocalRow('profiles', payload.new, userId);
    const local = await db.profiles.get(userId);
    const pending = await SyncRepository.hasOutstandingForRecord('profiles', userId);
    if (!pending && (!local || new Date(mapped.updatedAt).getTime() > new Date(local.updatedAt || local.createdAt || 0).getTime())) {
      await db.profiles.put(mapped);
      callback(mapped);
    }
  }).subscribe();
  entitySubscriptions.set(channelName, channel);
  return { unsubscribe: () => { supabase.removeChannel(channel); entitySubscriptions.delete(channelName); } };
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

      Promise.all([
        db.table(entity).get(mapped.id),
        SyncRepository.hasOutstandingForRecord(entity, mapped.id),
      ]).then(async ([local, pending]) => {
        if (pending || (local && new Date(local.updatedAt || local.createdAt).getTime() >= new Date(mapped.updatedAt || mapped.createdAt).getTime())) return;
        await db.table(entity).put(mapped);
        console.log(`[Realtime] ${entity} Dexie upsert success id=${mapped.id}`);
        callback(mapped.id, payload.eventType);
      }).catch((error) => console.error(`[SupabaseSync] Realtime ${entity} apply failed:`, error));
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
  const entities = SYNC_ENTITIES;

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
  if (entity === 'profiles') return record.userId || record.id || null;
  const recordUserId = record.userId || record.user_id;
  if (recordUserId && recordUserId !== 'demo-user' && isValidUuid(recordUserId)) return recordUserId;

  const tripId = record.tripId || record.trip_id;
  if (tripId) {
    const trip = await db.trips.get(tripId);
    if (trip?.userId) return trip.userId;
  }

  // Allocations do not carry userId/tripId directly; resolve the owner
  // from the parent expense. The allocation's user_id must match the
  // expense's user_id (enforced by migration 006 RLS + ownership trigger).
  if (entity === 'expensePaymentAllocations' && record.expenseId) {
    const expense = await db.expenses.get(record.expenseId);
    const expenseUserId = expense?.userId || expense?.user_id;
    if (expenseUserId) return expenseUserId;
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

export async function deleteEntity(entity, recordId, expectedUserId = null) {
  const remoteId = await resolveLocalToRemote(entity, recordId);
  const deleteId = remoteId || recordId;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return { error: 'Authentication required to synchronize a deletion.' };
  if (expectedUserId && expectedUserId !== session.user.id) return { error: 'Account mismatch; deletion is retained for its owner.' };
  if (!isValidUuid(deleteId)) return { error: `PERMANENT: invalid UUID for delete: ${deleteId}` };
  markRecentlySynced(entity, deleteId);

  const { error } = await supabase.from('sync_tombstones').upsert({
    entity,
    record_id: deleteId,
    user_id: session.user.id,
  }, { onConflict: 'entity,record_id' });

  if (error) {
    console.error(`[SupabaseSync] delete ${entity} FAILED:`, {
      id: recordId,
      remoteId: deleteId,
      table: 'sync_tombstones',
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
    table: 'sync_tombstones',
  });

  return { error: null };
}

export { recentlySynced, isRecentlySynced, markRecentlySynced };
