import db from '../database/db';
import supabase from '../services/supabaseClient';

const safeLogout = async () => {
  const pending = await db.pendingSync
    .where('status')
    .equals('PENDING')
    .count();

  if (pending > 0) {
    const shouldLogout = window.confirm(
      `You have ${pending} unsynced change(s). They will be kept locally but lost from this device if you log out now. Continue?`
    );

    if (!shouldLogout) {
      return { cancelled: true };
    }
  }

  const { error } = await supabase.auth.signOut();

  localStorage.removeItem('tripledger_token');
  localStorage.removeItem('tripledger_device_id');

  return { error: error?.message || null };
};

export default safeLogout;
