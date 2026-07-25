import { ulid } from "ulid";
import db from "../db";

const CategoryRepository = {
  async getCategories() {
    return await db.expenseCategories
      .orderBy("displayOrder")
      .toArray();
  },

  async getCategoryById(id) {
    return await db.expenseCategories.get(id);
  },

  async createCategory(data) {
    const now = new Date().toISOString();

    const category = {
      id: ulid(),

      name: data.name.trim(),

      icon: data.icon || "📂",

      displayOrder: Date.now(),

      createdAt: now,

      updatedAt: now,
    };

    await db.expenseCategories.add(category);

    return category;
  },

  async updateCategory(id, data) {
    await db.expenseCategories.update(id, {
      ...data,

      updatedAt: new Date().toISOString(),
    });

    return await db.expenseCategories.get(id);
  },

  async deleteCategory(id) {
    await db.expenseCategories.delete(id);
  },
};

export default CategoryRepository;