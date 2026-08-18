import db from "../db";
import defaultCategories from "./defaultCategories";
import defaultItems from "./defaultItems";
import { dbReady } from "../db";

export async function seedDatabase() {
  await dbReady;

  try {
    const existingCategoryIds = new Set(
      (await db.expenseCategories.toArray()).map(
        (category) => category.id
      )
    );

    const missingCategories = defaultCategories.filter(
      (category) => !existingCategoryIds.has(category.id)
    );

    if (missingCategories.length) {
      await db.expenseCategories.bulkPut(missingCategories);
    }
  } catch (error) {
    console.error('[seedDatabase] categories seed error:', error);
  }

  try {
    const existingItemIds = new Set(
      (await db.expenseItems.toArray()).map((item) => item.id)
    );

    const missingItems = defaultItems.filter(
      (item) => !existingItemIds.has(item.id)
    );

    if (missingItems.length) {
      await db.expenseItems.bulkPut(missingItems);
    }
  } catch (error) {
    console.error('[seedDatabase] items seed error:', error);
  }
}
