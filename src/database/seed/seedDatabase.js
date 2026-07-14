import db from "../db";
import defaultCategories from "./defaultCategories";
import defaultItems from "./defaultItems";

export async function seedDatabase() {
  const categoryCount = await db.expenseCategories.count();

  if (categoryCount === 0) {
    await db.expenseCategories.bulkAdd(defaultCategories);
  }

  const itemCount = await db.expenseItems.count();

  if (itemCount === 0) {
    await db.expenseItems.bulkAdd(defaultItems);
  }
}