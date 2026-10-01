import supabase from './supabaseClient';
import db from '../database/db';
import { generateUuid } from '../utils/uuid';

const DEFAULT_CATEGORY_IDS = new Set([
  'transport',
  'food',
  'stay',
  'shopping',
  'medical',
  'temple',
  'donation',
  'entertainment',
  'misc',
]);

const DEFAULT_ITEM_IDS = new Set([
  'fuel',
  'diesel',
  'toll',
  'parking',
  'breakfast',
  'lunch',
  'tea',
  'dinner',
  'hotel',
  'shopping',
  'medicine',
  'darshan-ticket',
  'pooja',
  'prasadam',
  'special-entry',
  'hundi',
  'annadanam',
]);

const idCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function isDefaultCategoryId(id) {
  return DEFAULT_CATEGORY_IDS.has(String(id));
}

function isDefaultItemId(id) {
  return DEFAULT_ITEM_IDS.has(String(id));
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));
}

function mapKey(entity, localId) {
  return `${entity}:${localId}`;
}

async function getCloudId(entity, localId) {
  return (await db.syncIdMap.get(mapKey(entity, localId)))?.cloudId || null;
}

async function rememberId(entity, localId, cloudId) {
  if (!localId || !cloudId) return cloudId;
  await db.syncIdMap.put({
    key: mapKey(entity, localId), entity, localId: String(localId),
    cloudId: String(cloudId), updatedAt: new Date().toISOString(),
  });
  return cloudId;
}

async function cloudIdForLegacyRecord(entity, localId) {
  const known = await getCloudId(entity, localId);
  if (known) return known;
  return rememberId(entity, localId, generateUuid());
}

async function getCached(entity, localId, cacheKey, resolver) {
  const entry = idCache.get(cacheKey);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
    return entry.value;
  }

  const value = await resolver();
  idCache.set(cacheKey, { value, ts: Date.now() });
  return value;
}

async function resolveCategoryRemoteId(localId, userId = null) {
  if (!isDefaultCategoryId(localId)) {
    return localId;
  }

  const cacheKey = `category:${localId}`;
  return getCached('expenseCategories', localId, cacheKey, async () => {
    const local = await db.expenseCategories.get(localId);
    const ownerId = local?.userId || userId;
    if (local?.defaultKey && ownerId) {
      const { data } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('user_id', ownerId)
        .eq('default_key', local.defaultKey)
        .maybeSingle();

      if (data?.id) {
        console.log(`[SyncIdentity] category local=${localId} -> cloud=${data.id}`);
        return rememberId('expenseCategories', localId, data.id);
      }
    }
    // A semantic default key is never valid for a UUID id query or FK.
    return null;
  });
}

async function resolveItemRemoteId(localId, userId = null) {
  if (!isDefaultItemId(localId)) {
    return localId;
  }

  const cacheKey = `item:${localId}`;
  return getCached('expenseItems', localId, cacheKey, async () => {
    const local = await db.expenseItems.get(localId);
    const ownerId = local?.userId || userId;
    if (local?.defaultKey && ownerId) {
      const { data } = await supabase
        .from('expense_items')
        .select('id')
        .eq('user_id', ownerId)
        .eq('default_key', local.defaultKey)
        .maybeSingle();

      if (data?.id) {
        console.log(`[SyncIdentity] item local=${localId} -> cloud=${data.id}`);
        return rememberId('expenseItems', localId, data.id);
      }
    }
    return null;
  });
}

async function resolveCategoryLocalId(remoteId, userId, defaultKey) {
  if (defaultKey && DEFAULT_CATEGORY_IDS.has(defaultKey)) {
    return defaultKey;
  }

  if (!isValidUuid(remoteId)) {
    return remoteId;
  }

  const cacheKey = `category:remote:${remoteId}:${userId || ''}`;
  return getCached('expenseCategories', remoteId, cacheKey, async () => {
    const { data } = await supabase
      .from('expense_categories')
      .select('default_key, user_id')
      .eq('id', remoteId)
      .maybeSingle();

    if (data?.default_key && DEFAULT_CATEGORY_IDS.has(data.default_key)) {
      if (!userId || data.user_id === userId) {
        return data.default_key;
      }
    }

    return remoteId;
  });
}

async function resolveItemLocalId(remoteId, userId, defaultKey) {
  if (defaultKey && DEFAULT_ITEM_IDS.has(defaultKey)) {
    return defaultKey;
  }

  if (!isValidUuid(remoteId)) {
    return remoteId;
  }

  const cacheKey = `item:remote:${remoteId}:${userId || ''}`;
  return getCached('expenseItems', remoteId, cacheKey, async () => {
    const { data } = await supabase
      .from('expense_items')
      .select('default_key, user_id')
      .eq('id', remoteId)
      .maybeSingle();

    if (data?.default_key && DEFAULT_ITEM_IDS.has(data.default_key)) {
      if (!userId || data.user_id === userId) {
        return data.default_key;
      }
    }

    return remoteId;
  });
}

async function resolveLocalCategoryIdToRemote(categoryId, userId = null) {
  if (!categoryId) return null;
  if (isValidUuid(categoryId)) return categoryId;
  return resolveCategoryRemoteId(categoryId, userId);
}

async function resolveLocalItemIdToRemote(itemId, userId = null) {
  if (!itemId) return null;
  if (isValidUuid(itemId)) return itemId;
  return resolveItemRemoteId(itemId, userId);
}

export function getDefaultCategoryIds() {
  return Array.from(DEFAULT_CATEGORY_IDS);
}

export function getDefaultItemIds() {
  return Array.from(DEFAULT_ITEM_IDS);
}

export function isDefaultCategory(id) {
  return isDefaultCategoryId(id);
}

export function isDefaultItem(id) {
  return isDefaultItemId(id);
}

export async function resolveLocalToRemote(entity, localId, userId = null) {
  if (!localId) return null;
  if (isValidUuid(localId)) return localId;

  switch (entity) {
    case 'expenseCategories':
      return resolveCategoryRemoteId(localId, userId);
    case 'expenseItems':
      return resolveItemRemoteId(localId, userId);
    default:
      return cloudIdForLegacyRecord(entity, localId);
  }
}

export async function resolveRemoteToLocal(entity, remoteId, userId, extra = {}) {
  if (!remoteId) return null;
  if (!isValidUuid(remoteId)) return remoteId;

  const defaultKey = extra.default_key || extra.defaultKey || null;

  switch (entity) {
    case 'expenseCategories':
      return resolveCategoryLocalId(remoteId, userId, defaultKey);
    case 'expenseItems':
      return resolveItemLocalId(remoteId, userId, defaultKey);
    default:
      return (await db.syncIdMap.where('cloudId').equals(String(remoteId)).and((row) => row.entity === entity).first())?.localId || remoteId;
  }
}

export async function resolveForeignKey(entity, foreignKeyLocal, userId = null) {
  if (!foreignKeyLocal) return null;

  switch (entity) {
    case 'expenseItems':
      return resolveLocalCategoryIdToRemote(foreignKeyLocal, userId);
    case 'expenses': {
      const parts = String(foreignKeyLocal).split('|');
      const categoryId = parts[0] || null;
      const itemId = parts[1] || null;

      const resolvedCategory = categoryId ? await resolveLocalCategoryIdToRemote(categoryId, userId) : null;
      const resolvedItem = itemId ? await resolveLocalItemIdToRemote(itemId, userId) : null;

      if (resolvedCategory && resolvedItem) {
        return `${resolvedCategory}|${resolvedItem}`;
      }
      return resolvedCategory || resolvedItem || null;
    }
    default:
      return foreignKeyLocal;
  }
}

export async function mapLocalRecordToRemote(entity, record) {
  const mapped = { ...record };

  switch (entity) {
    case 'trips':
      mapped.id = await resolveLocalToRemote('trips', record.id, record.user_id);
      break;
    case 'participants':
      mapped.id = await resolveLocalToRemote('participants', record.id, record.user_id);
      mapped.trip_id = await resolveLocalToRemote('trips', record.trip_id, record.user_id);
      break;
    case 'contributions':
      mapped.id = await resolveLocalToRemote('contributions', record.id, record.user_id);
      mapped.trip_id = await resolveLocalToRemote('trips', record.trip_id, record.user_id);
      mapped.participant_id = await resolveLocalToRemote('participants', record.participant_id, record.user_id);
      break;
    case 'places':
      mapped.id = await resolveLocalToRemote('places', record.id, record.user_id);
      break;
    case 'activities':
      mapped.id = await resolveLocalToRemote('activities', record.id, record.user_id);
      mapped.trip_id = await resolveLocalToRemote('trips', record.trip_id, record.user_id);
      break;
    case 'expensePaymentAllocations':
      mapped.id = await resolveLocalToRemote('expensePaymentAllocations', record.id, record.user_id);
      mapped.expense_id = await resolveLocalToRemote('expenses', record.expense_id, record.user_id);
      mapped.participant_id = record.participant_id ? await resolveLocalToRemote('participants', record.participant_id, record.user_id) : null;
      mapped.donor_id = record.donor_id ? await resolveLocalToRemote('contributions', record.donor_id, record.user_id) : null;
      break;
    case 'expenseCategories':
      mapped.id = await resolveLocalToRemote('expenseCategories', record.id, record.user_id);
      break;
    case 'expenseItems': {
      const remoteCategoryId = await resolveLocalCategoryIdToRemote(record.category_id, record.user_id);
      mapped.category_id = remoteCategoryId;
      mapped.id = await resolveLocalToRemote('expenseItems', record.id, record.user_id);
      break;
    }
    case 'expenses': {
      mapped.trip_id = await resolveLocalToRemote('trips', record.trip_id);
      mapped.category_id = await resolveLocalCategoryIdToRemote(record.category_id, record.user_id);
      mapped.item_id = await resolveLocalItemIdToRemote(record.item_id, record.user_id);
      mapped.paid_by_participant_id = await resolveLocalToRemote('participants', record.paid_by_participant_id);
      mapped.paid_by_donor_id = record.paid_by_donor_id ? await resolveLocalToRemote('contributions', record.paid_by_donor_id, record.user_id) : null;
      mapped.transport_settlement_trip_id = record.transport_settlement_trip_id ? await resolveLocalToRemote('trips', record.transport_settlement_trip_id, record.user_id) : null;
      break;
    }
    default:
      break;
  }

  return mapped;
}

export async function mapRemoteRowToLocal(entity, row, userId) {
  const defaultKey = row.default_key || row.defaultKey || null;

  switch (entity) {
    case 'expenseCategories': {
      const localId = await resolveRemoteToLocal('expenseCategories', row.id, userId, { default_key: defaultKey });
      return {
        id: localId,
        userId: String(row.user_id || userId || ''),
        name: String(row.name ?? ''),
        icon: row.icon ?? null,
        color: row.color ?? null,
        tripTypes: row.trip_types || [],
        displayOrder: Number(row.display_order || 0),
        isDefault: Boolean(row.is_default),
        usageCount: Number(row.usage_count || 0),
        lastUsed: row.last_used || null,
        defaultKey: defaultKey,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
      };
    }
    case 'expenseItems': {
      const localId = await resolveRemoteToLocal('expenseItems', row.id, userId, { default_key: defaultKey });
      const categoryDefaultKey = row.category_default_key || null;
      let localCategoryId = row.category_id;

      if (categoryDefaultKey && DEFAULT_CATEGORY_IDS.has(categoryDefaultKey)) {
        localCategoryId = categoryDefaultKey;
      } else if (row.category_id && isValidUuid(row.category_id)) {
        localCategoryId = await resolveCategoryLocalId(row.category_id, userId, null);
      }

      return {
        id: localId,
        userId: String(row.user_id || userId || ''),
        defaultKey: defaultKey,
        categoryId: localCategoryId,
        name: String(row.name ?? ''),
        icon: row.icon ?? null,
        displayOrder: Number(row.display_order || 0),
        isDefault: Boolean(row.is_default),
        usageCount: Number(row.usage_count || 0),
        lastUsed: row.last_used || null,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
      };
    }
    case 'expenses': {
      let localCategoryId = row.category_id;
      let localItemId = row.item_id;

      if (row.category_id && isValidUuid(row.category_id)) {
        localCategoryId = await resolveCategoryLocalId(row.category_id, userId, null);
      }
      if (row.item_id && isValidUuid(row.item_id)) {
        localItemId = await resolveItemLocalId(row.item_id, userId, null);
      }

      return {
        id: await resolveRemoteToLocal('expenses', row.id, userId),
        userId: String(row.user_id || userId || ''),
        tripId: await resolveRemoteToLocal('trips', row.trip_id, userId),
        categoryId: localCategoryId || null,
        itemId: localItemId,
        categoryName: String(row.category_name ?? ''),
        selectedItems: row.selected_items || [],
        expenseTime: row.expense_time || null,
        amount: Number(row.amount || 0),
        notes: String(row.notes ?? ''),
        paymentSource: row.payment_source || 'fund',
        paidByParticipantId: await resolveRemoteToLocal('participants', row.paid_by_participant_id, userId),
        paidByDonorId: row.paid_by_donor_id ? await resolveRemoteToLocal('contributions', row.paid_by_donor_id, userId) : null,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        locationName: String(row.location_name ?? ''),
        locationSource: row.location_source || 'none',
        transportSettlement: Boolean(row.transport_settlement),
        transportSettlementTripId: row.transport_settlement_trip_id || null,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
      };
    }
    case 'expensePaymentAllocations': {
      return {
        id: await resolveRemoteToLocal('expensePaymentAllocations', row.id, userId),
        expenseId: await resolveRemoteToLocal('expenses', row.expense_id, userId),
        paymentSourceType: String(row.payment_source_type || 'fund'),
        participantId: row.participant_id ? await resolveRemoteToLocal('participants', row.participant_id, userId) : null,
        donorId: row.donor_id || null,
        amount: Number(row.amount || 0),
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
      };
    }
    default:
      return { ...row };
  }
}

export async function clearEntityCache(entity) {
  const prefix = entity === 'expenseCategories' ? 'category' : entity === 'expenseItems' ? 'item' : entity;
  for (const key of Array.from(idCache.keys())) {
    if (key.startsWith(`${prefix}:`) || key.startsWith(`${prefix}:remote:`)) {
      idCache.delete(key);
    }
  }
}

export async function clearAllCaches() {
  idCache.clear();
}
