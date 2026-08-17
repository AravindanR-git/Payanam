import supabase from './supabaseClient';
import db from '../database/db';
import SyncRepository from '../database/repositories/SyncRepository';

const MAX_SYNC_RETRIES = 3;

const recentlySynced = new Set();
const SYNC_COOLDOWN_MS = 2000;

export function markRecentlySynced(tripId) {
  recentlySynced.add(tripId);
  setTimeout(() => {
    recentlySynced.delete(tripId);
  }, SYNC_COOLDOWN_MS);
}

export function isRecentlySynced(tripId) {
  return recentlySynced.has(tripId);
}

export async function processPendingSupabaseTrips() {
  const pending = await SyncRepository.getPending(50);
  const failed = await SyncRepository.getFailed();
  const tripEntries = [...pending, ...failed].filter((e) => e.tableName === 'trips');

  console.log('[SupabaseSync] processPendingSupabaseTrips: pending+filters=', tripEntries.length);

  for (const entry of tripEntries) {
    if (entry.attempts >= MAX_SYNC_RETRIES) {
      console.log('[SupabaseSync] Skipping entry', entry.id, 'attempts=', entry.attempts);
      continue;
    }

    const trip = await db.trips.get(entry.recordId);

    if (!trip) {
      console.log('[SupabaseSync] Trip not found locally for entry', entry.id, 'recordId=', entry.recordId);
      await SyncRepository.markSynced(entry.id);
      continue;
    }

    console.log('[SupabaseSync] Uploading trip', trip.id, 'name=', trip.tripName);
    const result = await uploadTrip(trip);

    if (result.error) {
      console.error('[SupabaseSync] Upload failed for trip', trip.id, 'error=', result.error);
      await SyncRepository.markFailed(entry.id, result.error);
    } else {
      console.log('[SupabaseSync] Upload succeeded for trip', trip.id);
      await SyncRepository.markSynced(entry.id);
    }
  }
}

export async function uploadTrip(trip) {
  if (!trip.userId) {
    console.error('[SupabaseSync] uploadTrip missing userId for trip', trip.id);
    return { error: 'Missing userId' };
  }

  markRecentlySynced(trip.id);

  console.log('[SupabaseSync] uploadTrip: id=', trip.id, 'userId=', trip.userId, 'name=', trip.tripName);

  const { data, error } = await supabase
    .from('trips')
    .upsert({
      id: trip.id,
      user_id: trip.userId,
      trip_name: trip.tripName,
      trip_type: trip.tripType,
      status: trip.status,
      default_contribution_per_person: trip.defaultContributionPerPerson || 0,
      ended_at: trip.endedAt || null,
      end_date: trip.endDate || null,
      continuation_closed_at: trip.continuationClosedAt || null,
      updated_at: trip.updatedAt || trip.createdAt,
    })
    .select();

  console.log('[SupabaseSync] uploadTrip result: data=', JSON.stringify(data), 'error=', error?.message || null);

  return { data, error: error?.message || null };
}

export async function pullTrips(userId) {
  console.log('[SupabaseSync] pullTrips: userId=', userId);

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  console.log('[SupabaseSync] pullTrips result: count=', data?.length || 0, 'error=', error?.message || null, 'ids=', data?.map(r => r.id).join(',') || '');

  return { data, error: error?.message || null };
}

export function subscribeToTrips(userId, callback) {
  if (!userId) {
    return { unsubscribe: () => {} };
  }

  const channel = supabase
    .channel(`trips:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'trips',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      callback(payload);
    })
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
