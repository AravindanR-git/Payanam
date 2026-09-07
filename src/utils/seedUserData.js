import supabase from '../services/supabaseClient';
import defaultCategories from '../database/seed/defaultCategories';

const STABLE_DEFAULT_KEYS = new Set(
  defaultCategories.map((cat) => cat.id)
);

const LEGACY_DEFAULT_NAMES = new Set([
  'Transport',
  'Food',
  'Accommodation',
  'Shopping',
  'Medical',
  'Temple',
  'Donation',
  'Entertainment',
  'Miscellaneous',
]);

export async function seedUserData(userId) {
  const { data: existingRows, error: checkError } = await supabase
    .from('expense_categories')
    .select('id, default_key, name')
    .eq('user_id', userId);

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking existing categories:', checkError);
  }

  const existingByDefaultKey = new Map();
  const legacyByName = new Map();

  for (const row of existingRows || []) {
    if (row.default_key && STABLE_DEFAULT_KEYS.has(row.default_key)) {
      existingByDefaultKey.set(row.default_key, row);
    } else if (!row.default_key && LEGACY_DEFAULT_NAMES.has(row.name)) {
      legacyByName.set(row.name, row);
    }
  }

  const toUpsert = [];

  for (const cat of defaultCategories) {
    const existing = existingByDefaultKey.get(cat.id);
    if (existing) {
      continue;
    }

    const legacy = legacyByName.get(cat.name);
    if (legacy) {
      continue;
    }

    toUpsert.push({
      user_id: userId,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      trip_types: cat.tripTypes || [],
      display_order: cat.displayOrder,
      is_default: true,
      default_key: cat.id,
    });
  }

  if (toUpsert.length === 0) {
    return;
  }

  const { error: catError } = await supabase
    .from('expense_categories')
    .upsert(toUpsert, { onConflict: 'user_id,default_key' });

  if (catError) {
    console.error('Error seeding categories:', catError);
  }
}

export default seedUserData;
