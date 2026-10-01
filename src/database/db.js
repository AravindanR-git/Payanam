import Dexie from "dexie";

export const db = new Dexie("PayanamDB");

db.version(1).stores({
  users: "id,email",

  trips: "id,userId,status,tripType,tripName,createdAt",

  participants: "id,tripId,type,name",

  contributions: "id,tripId,participantId,createdAt",

  expenseCategories: "id,userId,tripType,name,displayOrder",

  expenseItems: "id,categoryId,name,displayOrder",

  places: "id,name,displayOrder",

  expenses:
    "id,tripId,categoryId,itemId,amount,expenseTime,syncStatus",

  activities: "id,tripId,createdAt",

  pendingSync: "id,tableName,status",
});

db.version(3)
  .stores({
    users: "id,email",

    trips:
      "id,userId,status,tripType,tripName,createdAt",

    participants:
      "id,tripId,type,name",

    contributions:
      "id,tripId,participantId,createdAt",

    expenseCategories:
      "id,userId,tripType,name,displayOrder",

    expenseItems:
      "id,categoryId,name,displayOrder,isDefault",

    places:
      "id,name,displayOrder",

    expenses:
      "id,tripId,categoryId,expenseTime,paymentBy,syncStatus",

    activities:
      "id,tripId,type,createdAt",

    pendingSync:
      "id,tableName,status",
  })
  .upgrade(async (tx) => {

    await tx.table("expenses").toCollection().modify(expense => {

      if (!expense.selectedItems) {
        expense.selectedItems =
          expense.itemId
            ? [expense.itemId]
            : [];
      }

      expense.paymentBy ??= "";

      expense.note ??= "";

      expense.latitude ??= null;

      expense.longitude ??= null;

      expense.locationName ??= "";

      expense.updatedAt ??=
        expense.createdAt ||
        new Date().toISOString();

    });

    await tx.table("expenseItems")
      .toCollection()
      .modify(item => {

        item.isDefault ??= true;

        item.createdAt ??=
          new Date().toISOString();

        item.updatedAt ??=
          new Date().toISOString();

      });

    await tx.table("activities")
      .toCollection()
      .modify(activity => {

        activity.type ??= "expense";

      });

  });

db.version(4)
  .stores({
    users: "id,email",

    trips:
      "id,userId,status,tripType,tripName,createdAt",

    participants:
      "id,tripId,type,name",

    contributions:
      "id,tripId,participantId,createdAt",

    expenseCategories:
      "id,userId,tripType,name,displayOrder",

    expenseItems:
      "id,categoryId,name,displayOrder,isDefault,usageCount,lastUsed",

    places:
      "id,name,displayOrder",

    expenses:
      "id,tripId,categoryId,expenseTime,updatedAt,paymentBy,syncStatus",

    activities:
      "id,tripId,type,createdAt",

    pendingSync:
      "id,tableName,status",
  })
  .upgrade(async (tx) => {

    await tx.table("expenseItems")
      .toCollection()
      .modify(item => {

        item.usageCount ??= 0;

        item.lastUsed ??= null;

      });

    await tx.table("expenses")
      .toCollection()
      .modify(expense => {

        if (
          (!expense.selectedItems ||
            expense.selectedItems.length === 0) &&
          expense.itemId
        ) {
          expense.selectedItems = [
            {
              id: expense.itemId,
              name: expense.itemName || "",
            },
          ];
        }

        expense.updatedAt ??=
          expense.createdAt ||
          new Date().toISOString();

      });

  });

db.version(5)
  .stores({
    users: "id,email",

    trips:
      "id,userId,status,tripType,tripName,createdAt",

    participants:
      "id,tripId,type,name",

    contributions:
      "id,tripId,participantId,createdAt",

    expenseCategories:
      "id,userId,tripType,name,displayOrder",

    expenseItems:
      "id,categoryId,name,displayOrder,isDefault,usageCount,lastUsed",

    places:
      "id,name,displayOrder",

    expenses:
      "id,tripId,categoryId,expenseTime,updatedAt,paymentBy,syncStatus",

    activities:
      "id,tripId,type,createdAt",

    pendingSync:
      "id,tableName,status,createdAt",
  })
  .upgrade(async (tx) => {
    await tx.table("pendingSync")
      .toCollection()
      .modify(row => {
        row.createdAt ??= new Date().toISOString();
      });
  });

db.version(6)
  .stores({
    users: "id,email",

    trips:
      "id,userId,status,tripType,tripName,createdAt",

    participants:
      "id,tripId,type,name",

    contributions:
      "id,tripId,participantId,createdAt",

    expenseCategories:
      "id,userId,tripType,name,displayOrder,usageCount,lastUsed",

    expenseItems:
      "id,categoryId,name,displayOrder,isDefault,usageCount,lastUsed",

    places:
      "id,name,displayOrder",

    expenses:
      "id,tripId,categoryId,expenseTime,updatedAt,paymentBy,syncStatus",

    activities:
      "id,tripId,type,createdAt",

    pendingSync:
      "id,tableName,status,createdAt",
  })
  .upgrade(async (tx) => {
    await tx.table("expenseCategories")
      .toCollection()
      .modify(category => {
        category.usageCount ??= 0;
        category.lastUsed ??= null;
      });
  });

db.version(7)
  .stores({
    users: "id,email",

    trips:
      "id,userId,status,tripType,tripName,createdAt",

    participants:
      "id,tripId,type,name",

    contributions:
      "id,tripId,participantId,createdAt",

    expenseCategories:
      "id,userId,tripType,name,displayOrder,usageCount,lastUsed",

    expenseItems:
      "id,categoryId,name,displayOrder,isDefault,usageCount,lastUsed",

    places:
      "id,name,displayOrder",

    expenses:
      "id,tripId,categoryId,expenseTime,updatedAt,paymentBy,syncStatus",

    activities:
      "id,tripId,type,createdAt",

    pendingSync:
      "id,tableName,status,createdAt,attempts,error",
  })
  .upgrade(async (tx) => {
    await tx.table("pendingSync")
      .toCollection()
      .modify(row => {
        row.attempts ??= 0;
        row.error ??= null;
      });
  });

db.version(8)
  .stores({
    users: "id,email",

    trips:
      "id,userId,status,tripType,tripName,createdAt",

    participants:
      "id,tripId,type,name",

    contributions:
      "id,tripId,participantId,createdAt",

    expenseCategories:
      "id,userId,tripType,name,displayOrder,usageCount,lastUsed",

    expenseItems:
      "id,categoryId,name,displayOrder,isDefault,usageCount,lastUsed",

    places:
      "id,name,displayOrder",

    expenses:
      "id,tripId,categoryId,expenseTime,updatedAt,paymentBy,syncStatus",

    activities:
      "id,tripId,type,createdAt",

    pendingSync:
      "id,tableName,status,createdAt,attempts,error",
  });

// Stable sync-boundary identity map. It preserves legacy Dexie IDs while
// allowing the cloud schema to keep UUID primary/foreign keys.
db.version(9).stores({
  syncIdMap: "key,entity,localId,cloudId",
});

db.version(10)
  .stores({
    users: "id,email",

    trips: "id,userId,status,tripType,tripName,createdAt",

    participants: "id,tripId,type,name",

    contributions:
      "id,tripId,participantId,donorName,createdAt",

    expenseCategories:
      "id,userId,tripType,name,displayOrder,usageCount,lastUsed",

    expenseItems:
      "id,categoryId,name,displayOrder,isDefault,usageCount,lastUsed",

    places: "id,name,displayOrder",

    expenses:
      "id,tripId,categoryId,expenseTime,updatedAt,paymentBy,syncStatus,paidByDonorId",

    activities: "id,tripId,type,createdAt",

    pendingSync:
      "id,tableName,status,createdAt,attempts,error",

    syncIdMap: "key,entity,localId,cloudId",
  })
  .upgrade(async (tx) => {
    await tx.table("contributions")
      .toCollection()
      .modify((contribution) => {
        contribution.donorName ??= null;
        contribution.donorNote ??= null;
      });
  });

db.version(11)
  .stores({
    users: "id,email",

    trips: "id,userId,status,tripType,tripName,createdAt",

    participants: "id,tripId,type,name",

    contributions:
      "id,tripId,participantId,donorName,createdAt",

    expenseCategories:
      "id,userId,tripType,name,displayOrder,usageCount,lastUsed",

    expenseItems:
      "id,categoryId,name,displayOrder,isDefault,usageCount,lastUsed",

    places: "id,name,displayOrder",

    expenses:
      "id,tripId,categoryId,expenseTime,updatedAt,paymentBy,syncStatus,paidByDonorId",

    activities: "id,tripId,type,createdAt",

    pendingSync:
      "id,tableName,status,createdAt,attempts,error",

    syncIdMap: "key,entity,localId,cloudId",
  })
  .upgrade(async (tx) => {
    await tx.table("expenses")
      .toCollection()
      .modify((expense) => {
        expense.paidByDonorId ??= null;
      });
  });

db.version(12)
  .stores({
    users: "id,email",

    trips: "id,userId,status,tripType,tripName,createdAt",

    participants: "id,tripId,type,name",

    contributions:
      "id,tripId,participantId,donorName,createdAt",

    expenseCategories:
      "id,userId,tripType,name,displayOrder,usageCount,lastUsed",

    expenseItems:
      "id,categoryId,name,displayOrder,isDefault,usageCount,lastUsed",

    places: "id,name,displayOrder",

    expenses:
      "id,tripId,categoryId,expenseTime,updatedAt,paymentBy,syncStatus,paidByDonorId",

    activities: "id,tripId,type,createdAt",

    pendingSync:
      "id,tableName,status,createdAt,attempts,error",

    syncIdMap: "key,entity,localId,cloudId",

    expensePaymentAllocations:
      "id,expenseId,paymentSourceType,donorId,participantId,amount,createdAt",
  })
  .upgrade(async (tx) => {
    await tx.table("expensePaymentAllocations")
      .toCollection()
      .modify((allocation) => {
        allocation.createdAt ??= new Date().toISOString();
        allocation.updatedAt ??= new Date().toISOString();
      });
  });

db.version(13).stores({
  users: "id,email", trips: "id,userId,status,tripType,tripName,createdAt",
  participants: "id,tripId,type,name", contributions: "id,tripId,participantId,donorName,createdAt",
  expenseCategories: "id,userId,tripType,name,displayOrder,usageCount,lastUsed",
  expenseItems: "id,categoryId,name,displayOrder,isDefault,usageCount,lastUsed", places: "id,name,displayOrder",
  expenses: "id,tripId,categoryId,expenseTime,updatedAt,paymentBy,syncStatus,paidByDonorId",
  activities: "id,tripId,type,createdAt", pendingSync: "id,tableName,status,createdAt,attempts,error",
  syncIdMap: "key,entity,localId,cloudId", expensePaymentAllocations: "id,expenseId,paymentSourceType,donorId,participantId,amount,createdAt",
  transports: "id,userId,name,vehicleNumber,updatedAt,syncStatus",
});

db.version(14).stores({
  users: "id,email", trips: "id,userId,status,tripType,tripName,createdAt",
  participants: "id,tripId,type,name", contributions: "id,tripId,participantId,donorName,createdAt",
  expenseCategories: "id,userId,tripType,name,displayOrder,usageCount,lastUsed",
  expenseItems: "id,categoryId,name,displayOrder,isDefault,usageCount,lastUsed", places: "id,name,displayOrder",
  expenses: "id,tripId,categoryId,expenseTime,updatedAt,paymentBy,syncStatus,paidByDonorId,&transportSettlementTripId",
  activities: "id,tripId,type,createdAt", pendingSync: "id,tableName,status,createdAt,attempts,error",
  syncIdMap: "key,entity,localId,cloudId", expensePaymentAllocations: "id,expenseId,paymentSourceType,donorId,participantId,amount,createdAt",
  transports: "id,userId,name,vehicleNumber,updatedAt,syncStatus",
});

db.version(15).stores({
  users: "id,email", trips: "id,userId,status,tripType,tripName,createdAt",
  participants: "id,tripId,type,name", contributions: "id,tripId,participantId,donorName,createdAt",
  expenseCategories: "id,userId,tripType,name,displayOrder,usageCount,lastUsed",
  expenseItems: "id,categoryId,name,displayOrder,isDefault,usageCount,lastUsed", places: "id,name,displayOrder,tripId,categoryId",
  expenses: "id,tripId,categoryId,expenseTime,updatedAt,paymentBy,syncStatus,paidByDonorId,&transportSettlementTripId",
  activities: "id,tripId,type,createdAt", pendingSync: "id,tableName,status,createdAt,attempts,error",
  syncIdMap: "key,entity,localId,cloudId", expensePaymentAllocations: "id,expenseId,paymentSourceType,donorId,participantId,amount,createdAt",
  transports: "id,userId,name,vehicleNumber,updatedAt,syncStatus", placeCategories: "id,name,userId,displayOrder",
});

db.version(16).stores({
  users: "id,email", trips: "id,userId,status,tripType,tripName,createdAt",
  participants: "id,tripId,type,name", contributions: "id,tripId,participantId,donorName,createdAt",
  expenseCategories: "id,userId,tripType,name,displayOrder,usageCount,lastUsed",
  expenseItems: "id,categoryId,name,displayOrder,isDefault,usageCount,lastUsed", places: "id,name,displayOrder,tripId,categoryId",
  expenses: "id,tripId,categoryId,expenseTime,updatedAt,paymentBy,syncStatus,paidByDonorId,&transportSettlementTripId",
  activities: "id,tripId,type,createdAt", pendingSync: "id,tableName,status,createdAt,attempts,error,userId",
  syncIdMap: "key,entity,localId,cloudId", expensePaymentAllocations: "id,expenseId,paymentSourceType,donorId,participantId,amount,createdAt",
  transports: "id,userId,name,vehicleNumber,updatedAt,syncStatus", placeCategories: "id,name,userId,displayOrder",
  accountSnapshots: "userId,updatedAt", activeAccount: "id",
});

db.version(17).stores({
  users: "id,email", profiles: "id,userId,updatedAt",
  trips: "id,userId,status,tripType,tripName,createdAt",
  participants: "id,tripId,type,name", contributions: "id,tripId,participantId,donorName,createdAt",
  expenseCategories: "id,userId,tripType,name,displayOrder,usageCount,lastUsed",
  expenseItems: "id,categoryId,name,displayOrder,isDefault,usageCount,lastUsed", places: "id,name,displayOrder,tripId,categoryId",
  expenses: "id,tripId,categoryId,expenseTime,updatedAt,paymentBy,syncStatus,paidByDonorId,&transportSettlementTripId",
  activities: "id,tripId,type,createdAt", pendingSync: "id,tableName,status,createdAt,attempts,error,userId",
  syncIdMap: "key,entity,localId,cloudId", expensePaymentAllocations: "id,expenseId,paymentSourceType,donorId,participantId,amount,createdAt",
  transports: "id,userId,name,vehicleNumber,updatedAt,syncStatus", placeCategories: "id,name,userId,displayOrder",
  accountSnapshots: "userId,updatedAt", activeAccount: "id",
});

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));
}

async function cleanupLegacyCategories() {
  try {
    const categories = await db.expenseCategories.toArray();
    const stableNames = new Set(
      categories
        .filter(c => c.defaultKey && typeof c.id === 'string' && !isValidUuid(c.id))
        .map(c => c.name)
    );

    const toDelete = categories.filter(c => {
      return !c.defaultKey && isValidUuid(c.id) && stableNames.has(c.name);
    });

    if (toDelete.length) {
      await db.expenseCategories.bulkDelete(toDelete.map(c => c.id));
      console.log('[Dexie] Removed legacy UUID categories:', toDelete.map(c => c.id));
    }
  } catch (error) {
    console.error('[Dexie] Legacy category cleanup error:', error);
  }
}

db.open().then(() => {
  console.log('[Dexie] PayanamDB opened, version:', db.verno);
  window.payanamDB = db;
  cleanupLegacyCategories();
}).catch((err) => {
  console.error('[Dexie] PayanamDB open error:', err);
});

export const dbReady = db.open();

export default db;
