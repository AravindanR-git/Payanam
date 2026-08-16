import { ulid } from "ulid";
import db from "../db";
import SyncService from "../../services/syncService";

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

    const item = {
      id: ulid(),

      categoryId: data.categoryId,

      name: data.name.trim(),

      icon: data.icon || "📦",

      displayOrder: Date.now(),

      usageCount: 0,

      lastUsed: null,

      isDefault: false,

      createdAt: now,

      updatedAt: now,
    };

    await db.expenseItems.add(item);

    SyncService.enqueue("expenseItems", item.id, "CREATE", item);

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

    SyncService.enqueue("expenseItems", id, "UPDATE", { ...data, updatedAt: new Date().toISOString() });

    return await db.expenseItems.get(id);
  },

  async deleteItem(id) {
    await db.expenseItems.delete(id);

    SyncService.enqueue("expenseItems", id, "DELETE", { id });
  },
};

export default ItemRepository;