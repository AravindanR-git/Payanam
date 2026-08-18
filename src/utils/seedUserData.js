import supabase from '../services/supabaseClient';
import defaultCategories from '../database/seed/defaultCategories';

export async function seedUserData(userId) {
  const { data: existingCategories, error: checkError } = await supabase
    .from('expense_categories')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking existing categories:', checkError);
  }

  if (existingCategories && existingCategories.length > 0) {
    return;
  }

  const { error: catError } = await supabase
    .from('expense_categories')
    .upsert(
      defaultCategories.map((cat) => ({
        id: cat.id,
        user_id: userId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        trip_types: cat.tripTypes || [],
        display_order: cat.displayOrder,
        is_default: true,
      })),
      { onConflict: 'id' }
    );

  if (catError) {
    console.error('Error seeding categories:', catError);
  }
}

export default seedUserData;
