import { ulid } from "ulid";
import db from "../db";
import { enqueueSync } from "../../services/syncEnqueue";

const CategoryRepository = {
  async getCategories(tripType = null, userId) {
    const categories = await db.expenseCategories
      .orderBy("displayOrder")
      .toArray();

    const sorted = categories.sort((a, b) => {
      const usageA = a.usageCount || 0;
      const usageB = b.usageCount || 0;

      if (usageB !== usageA) {
        return usageB - usageA;
      }

      const lastA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
      const lastB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;

      if (lastB !== lastA) {
        return lastB - lastA;
      }

      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });

    if (!tripType) {
      return sorted;
    }

    return sorted.filter(
      (category) =>
        (!category.tripTypes ||
          category.tripTypes.includes("all") ||
          category.tripTypes.includes(tripType)) &&
        (category.isDefault ||
          !category.userId ||
          (userId && category.userId === userId))
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

      userId: data.userId,

      tripTypes: data.tripTypes || ["all"],

      isDefault: false,

      displayOrder: Date.now(),

      usageCount: 0,

      lastUsed: null,

      createdAt: now,

      updatedAt: now,
    };

    await db.expenseCategories.add(category);

    enqueueSync("expenseCategories", category.id, "CREATE", category);

    return category;
  },

  async updateCategory(id, data) {
    await db.expenseCategories.update(id, {
      ...data,

      updatedAt: new Date().toISOString(),
    });

    enqueueSync("expenseCategories", id, "UPDATE", { ...data, updatedAt: new Date().toISOString() });

    return await db.expenseCategories.get(id);
  },

  async deleteCategory(id) {
    await db.expenseCategories.delete(id);

    enqueueSync("expenseCategories", id, "DELETE", { id });
  },

  async markUsed(categoryId) {
    if (!categoryId) return;

    const category = await db.expenseCategories.get(categoryId);

    if (!category) return;

    const now = new Date().toISOString();

    await db.expenseCategories.update(categoryId, {
      usageCount: (category.usageCount || 0) + 1,
      lastUsed: now,
      updatedAt: now,
    });
  },
};

export default CategoryRepository;
