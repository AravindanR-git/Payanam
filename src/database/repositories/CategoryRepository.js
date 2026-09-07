import { generateUuid } from "../../utils/uuid";
import db from "../db";
import { enqueueSync } from "../../services/syncEnqueue";
import { uploadEntity, deleteEntity, hydrateEntity } from "../../services/supabaseSync";

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

    console.log('[CategoryRepository] createCategory: data=', JSON.stringify({ name: data.name, userId: data.userId, tripTypes: data.tripTypes }));

    if (!data.userId) {
      const error = new Error('CategoryRepository.createCategory: userId is required but was missing');
      console.error('[CategoryRepository] createCategory: MISSING userId');
      throw error;
    }

    const allCategories = await db.expenseCategories.toArray();

    const hasBadOrders = allCategories.some(c => c.displayOrder > 100000);

    if (hasBadOrders) {
      const sorted = allCategories.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      const updates = sorted.map((cat, idx) => ({
        id: cat.id,
        displayOrder: idx + 1,
      }));

      for (const update of updates) {
        await db.expenseCategories.update(update.id, { displayOrder: update.displayOrder });
      }

      console.log('[CategoryRepository] createCategory: normalized displayOrder for', updates.length, 'categories');
    }

    const existingOrders = await db.expenseCategories
      .orderBy('displayOrder')
      .reverse()
      .toArray();

    const maxOrder = existingOrders.length > 0 ? existingOrders[0].displayOrder : 0;

    const category = {
      id: generateUuid(),

      name: data.name.trim(),

      icon: data.icon || "📂",

      userId: data.userId,

      tripTypes: data.tripTypes || ["all"],

      isDefault: false,

      displayOrder: maxOrder + 1,

      usageCount: 0,

      lastUsed: null,

      createdAt: now,

      updatedAt: now,
    };

    console.log('[CategoryRepository] createCategory: about to add to Dexie, category.id=', category.id, 'userId=', category.userId, 'displayOrder=', category.displayOrder);

    await db.expenseCategories.add(category);

    console.log('[CategoryRepository] createCategory: Dexie add success, id=', category.id);

    await enqueueSync("expenseCategories", category.id, "CREATE", category);

    console.log('[CategoryRepository] createCategory: enqueued sync, online=', navigator.onLine);

    if (navigator.onLine) {
      console.log('[CategoryRepository] createCategory: uploading to Supabase');
      uploadEntity('expenseCategories', category).then((result) => {
        console.log('[CategoryRepository] createCategory: upload result=', JSON.stringify(result));
      }).catch((error) => {
        console.error('[CategoryRepository] createCategory upload error:', error);
      });
    } else {
      console.log('[CategoryRepository] createCategory: offline, skipping upload');
    }

    return category;
  },

  async updateCategory(id, data) {
    const now = new Date().toISOString();
    const updatePayload = { ...data, updatedAt: now };

    await db.expenseCategories.update(id, updatePayload);

    const updated = await db.expenseCategories.get(id);

    await enqueueSync("expenseCategories", id, "UPDATE", updatePayload);

    if (navigator.onLine && updated) {
      uploadEntity('expenseCategories', updated).catch((error) => {
        console.error('[CategoryRepository] updateCategory upload error:', error);
      });
    }

    return updated;
  },

  async deleteCategory(id) {
    await db.expenseCategories.delete(id);

    await enqueueSync("expenseCategories", id, "DELETE", { id });

    if (navigator.onLine) {
      deleteEntity('expenseCategories', id).catch((error) => {
        console.error('[CategoryRepository] deleteCategory error:', error);
      });
    }
  },

  async hydrateCategoriesFromSupabase(userId) {
    if (!userId) return [];
    const { data } = await hydrateEntity(userId, 'expenseCategories');
    return data || [];
  },

  async markUsed(categoryId) {
    if (!categoryId) return;

    const category = await db.expenseCategories.get(categoryId);

    if (!category) return;

    const now = new Date().toISOString();
    const updatePayload = {
      usageCount: (category.usageCount || 0) + 1,
      lastUsed: now,
      updatedAt: now,
    };

    await db.expenseCategories.update(categoryId, updatePayload);

    await enqueueSync("expenseCategories", categoryId, "UPDATE", updatePayload);

    if (navigator.onLine) {
      const updated = await db.expenseCategories.get(categoryId);
      if (updated) {
        uploadEntity('expenseCategories', updated).catch((error) => {
          console.error('[CategoryRepository] markUsed upload error:', error);
        });
      }
    }
  },
};

export default CategoryRepository;
