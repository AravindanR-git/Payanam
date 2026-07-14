import Dexie from "dexie";

export const db = new Dexie("PayanamDB");

db.version(1).stores({

  users:
    "id,email",

  trips:
    "id,userId,status,tripType,tripName,createdAt",

  participants:
    "id,tripId,type,name",

  contributions:
    "id,tripId,participantId,createdAt",

  expenseCategories:
    "id,userId,tripType,name,displayOrder",

  expenseItems:
    "id,categoryId,name,displayOrder",

  expenses:
    "id,tripId,categoryId,itemId,amount,expenseTime,syncStatus",

  activities:
    "id,tripId,createdAt",

  pendingSync:
    "id,tableName,status"

});

export default db;