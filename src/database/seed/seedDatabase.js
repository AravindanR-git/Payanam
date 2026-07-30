import db from "../db";
import defaultCategories from "./defaultCategories";
import defaultItems from "./defaultItems";

export async function seedDatabase() {
  const categoryIds = new Set(
    (await db.expenseCategories.toArray()).map(
      (category) => category.id
    )
  );

  const missingCategories = defaultCategories.filter(
    (category) => !categoryIds.has(category.id)
  );

  if (missingCategories.length) {
    await db.expenseCategories.bulkAdd(missingCategories);
  }

  const itemIds = new Set(
    (await db.expenseItems.toArray()).map((item) => item.id)
  );

  const missingItems = defaultItems.filter(
    (item) => !itemIds.has(item.id)
  );

  if (missingItems.length) {
    await db.expenseItems.bulkAdd(missingItems);
  }
}
