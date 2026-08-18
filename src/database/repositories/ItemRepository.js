import { generateUuid } from "../../utils/uuid";
import db from "../db";
import SyncService from "../../services/syncService";
import { uploadEntity, hydrateEntity } from "../../services/supabaseSync";

const ItemRepository = {
  async getItems(categoryId) {
    const items = await db.expenseItems
      .where("categoryId")
      .equals(categoryId)
      .toArray();

    return items.sort((a, b) => {
      const usageA = a.usageCount || 0;
      const usageB = b.usageCount || 0;

      if (usageB !== usageA) {
        return usageB - usageA;
      }

      const lastA = a.lastUsed
        ? new Date(a.lastUsed).getTime()
        : 0;

      const lastB = b.lastUsed
        ? new Date(b.lastUsed).getTime()
        : 0;

      if (lastB !== lastA) {
        return lastB - lastA;
      }

      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
  },

  async getItemById(id) {
    return await db.expenseItems.get(id);
  },

  async createItem(data) {
    const now = new Date().toISOString();

    const allItems = await db.expenseItems.toArray();

    const hasBadOrders = allItems.some(c => c.displayOrder > 100000);

    if (hasBadOrders) {
      const sorted = allItems.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      const updates = sorted.map((item, idx) => ({
        id: item.id,
        displayOrder: idx + 1,
      }));

      for (const update of updates) {
        await db.expenseItems.update(update.id, { displayOrder: update.displayOrder });
      }

      console.log('[ItemRepository] createItem: normalized displayOrder for', updates.length, 'items');
    }

    const existingOrders = await db.expenseItems
      .orderBy('displayOrder')
      .reverse()
      .toArray();

    const maxOrder = existingOrders.length > 0 ? existingOrders[0].displayOrder : 0;

    const item = {
      id: generateUuid(),

      categoryId: data.categoryId,

      name: data.name.trim(),

      icon: data.icon || "📦",

      displayOrder: maxOrder + 1,

      usageCount: 0,

      lastUsed: null,

      isDefault: false,

      createdAt: now,

      updatedAt: now,
    };

    await db.expenseItems.add(item);

    SyncService.enqueue("expenseItems", item.id, "CREATE", item);

    if (navigator.onLine) {
      uploadEntity('expenseItems', item).catch((error) => {
        console.error('[ItemRepository] createItem upload error:', error);
      });
    }

    return item;
  },

  async markUsed(itemIds = []) {
    if (!itemIds.length) return;

    const now = new Date().toISOString();

    for (const id of itemIds) {
      const item = await db.expenseItems.get(id);

      if (!item) continue;

      await db.expenseItems.update(id, {
        usageCount: (item.usageCount || 0) + 1,

        lastUsed: now,

        updatedAt: now,
      });
    }
  },

  async updateItem(id, data) {
    await db.expenseItems.update(id, {
      ...data,

      updatedAt: new Date().toISOString(),
    });

    const updated = await db.expenseItems.get(id);

    SyncService.enqueue("expenseItems", id, "UPDATE", { ...data, updatedAt: new Date().toISOString() });

    if (navigator.onLine && updated) {
      uploadEntity('expenseItems', updated).catch((error) => {
        console.error('[ItemRepository] updateItem upload error:', error);
      });
    }

    return updated;
  },

  async deleteItem(id) {
    await db.expenseItems.delete(id);

    SyncService.enqueue("expenseItems", id, "DELETE", { id });
  },

  async hydrateItemsFromSupabase(userId) {
    if (!userId) return [];
    const { data } = await hydrateEntity(userId, 'expenseItems');
    return data || [];
  },
};

export default ItemRepository;