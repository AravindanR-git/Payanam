import { ulid } from "ulid";
import db from "../db";

const CategoryRepository = {
  async getCategories(tripType = null, userId = "demo-user") {
    const categories = await db.expenseCategories
      .orderBy("displayOrder")
      .toArray();

    if (!tripType) {
      return categories;
    }

    return categories.filter(
      (category) =>
        (!category.tripTypes ||
          category.tripTypes.includes("all") ||
          category.tripTypes.includes(tripType)) &&
        (category.isDefault ||
          !category.userId ||
          category.userId === userId)
    );
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

      userId: data.userId || "demo-user",

      tripTypes: data.tripTypes || ["all"],

      isDefault: false,

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
