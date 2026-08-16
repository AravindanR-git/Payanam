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

export default db;