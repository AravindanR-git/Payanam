import { generateUuid } from "../../utils/uuid";
import db from "../db";
import { enqueueSync } from "../../services/syncEnqueue";
import { uploadEntity, deleteEntity, hydrateEntity } from "../../services/supabaseSync";

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

    console.log('[ItemRepository] createItem: data=', JSON.stringify({ name: data.name, userId: data.userId, categoryId: data.categoryId }));

    if (!data.userId) {
      const error = new Error('ItemRepository.createItem: userId is required but was missing');
      console.error('[ItemRepository] createItem: MISSING userId');
      throw error;
    }

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
      .where('categoryId')
      .equals(data.categoryId)
      .toArray();

    const maxOrder = existingOrders.length > 0
      ? Math.max(...existingOrders.map(i => i.displayOrder || 0))
      : 0;

    const item = {
      id: generateUuid(),

      categoryId: data.categoryId,

      name: data.name.trim(),

      icon: data.icon || "📦",

      displayOrder: maxOrder + 1,

      usageCount: 0,

      lastUsed: null,

      isDefault: false,

      userId: data.userId,

      createdAt: now,

      updatedAt: now,
    };

    console.log('[ItemRepository] createItem: about to add to Dexie, item.id=', item.id, 'userId=', item.userId, 'categoryId=', item.categoryId, 'displayOrder=', item.displayOrder);

    await db.expenseItems.add(item);

    console.log('[ItemRepository] createItem: Dexie add success, id=', item.id);

    await enqueueSync("expenseItems", item.id, "CREATE", item);

    console.log('[ItemRepository] createItem: enqueued sync, online=', navigator.onLine);

    if (navigator.onLine) {
      console.log('[ItemRepository] createItem: uploading to Supabase');
      uploadEntity('expenseItems', item).then((result) => {
        console.log('[ItemRepository] createItem: upload result=', JSON.stringify(result));
      }).catch((error) => {
        console.error('[ItemRepository] createItem upload error:', error);
      });
    } else {
      console.log('[ItemRepository] createItem: offline, skipping upload');
    }

    return item;
  },

  async markUsed(itemIds = []) {
    if (!itemIds.length) return;

    const now = new Date().toISOString();

    for (const id of itemIds) {
      const item = await db.expenseItems.get(id);

      if (!item) continue;

      const updatePayload = {
        usageCount: (item.usageCount || 0) + 1,
        lastUsed: now,
        updatedAt: now,
      };

      await db.expenseItems.update(id, updatePayload);

      await enqueueSync("expenseItems", id, "UPDATE", updatePayload);

      if (navigator.onLine) {
        const updated = await db.expenseItems.get(id);
        if (updated) {
          uploadEntity('expenseItems', updated).catch((error) => {
            console.error('[ItemRepository] markUsed upload error:', error);
          });
        }
      }
    }
  },

  async updateItem(id, data) {
    const now = new Date().toISOString();
    const updatePayload = { ...data, updatedAt: now };

    await db.expenseItems.update(id, updatePayload);

    const updated = await db.expenseItems.get(id);

    await enqueueSync("expenseItems", id, "UPDATE", updatePayload);

    if (navigator.onLine && updated) {
      uploadEntity('expenseItems', updated).catch((error) => {
        console.error('[ItemRepository] updateItem upload error:', error);
      });
    }

    return updated;
  },

  async deleteItem(id) {
    await db.expenseItems.delete(id);

    await enqueueSync("expenseItems", id, "DELETE", { id });

    if (navigator.onLine) {
      deleteEntity('expenseItems', id).catch((error) => {
        console.error('[ItemRepository] deleteItem error:', error);
      });
    }
  },

  async hydrateItemsFromSupabase(userId) {
    if (!userId) return [];
    const { data } = await hydrateEntity(userId, 'expenseItems');
    return data || [];
  },
};

export default ItemRepository;
