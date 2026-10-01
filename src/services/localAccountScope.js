import db from "../database/db";

const ACCOUNT_TABLES = [
  "profiles", "trips", "expenseCategories", "expenseItems", "participants", "contributions",
  "expenses", "activities", "places", "transports", "placeCategories",
  "expensePaymentAllocations",
];

function ownerOf(row) {
  return row?.userId || row?.user_id || null;
}

async function accountRows(userId, includeLegacyUnowned = false) {
  const data = Object.fromEntries(await Promise.all(ACCOUNT_TABLES.map(async (name) => [name, await db.table(name).toArray()])));
  const tripsById = new Map(data.trips.map((row) => [row.id, ownerOf(row)]));
  const expenseById = new Map(data.expenses.map((row) => [row.id, ownerOf(row) || tripsById.get(row.tripId)]));
  const belongs = (table, row) => {
    const directOwner = ownerOf(row);
    if (directOwner) return directOwner === userId;
    if (["expenseCategories", "expenseItems", "placeCategories"].includes(table)) {
      return includeLegacyUnowned && !row.isDefault && !row.defaultKey;
    }
    if (table === "expensePaymentAllocations") return expenseById.get(row.expenseId) === userId;
    return Boolean(row.tripId && tripsById.get(row.tripId) === userId);
  };
  const rows = Object.fromEntries(ACCOUNT_TABLES.map((table) => [table, data[table].filter((row) => belongs(table, row))]));
  const ids = Object.fromEntries(ACCOUNT_TABLES.map((table) => [table, new Set(rows[table].map((row) => row.id))]));
  return { data, tripsById, expenseById, belongs, rows, ids };
}

async function replaceAccountRows(userId, rowsToKeep, includeLegacyUnowned = false) {
  const current = await accountRows(userId, includeLegacyUnowned);
  await db.transaction("rw", ACCOUNT_TABLES.map((name) => db.table(name)), async () => {
    for (const table of ACCOUNT_TABLES) {
      const oldIds = current.rows[table].map((row) => row.id);
      if (oldIds.length) await db.table(table).bulkDelete(oldIds);
      const replacements = rowsToKeep?.[table] || [];
      if (replacements.length) await db.table(table).bulkPut(replacements);
    }
  });
}

let accountSwitch = Promise.resolve();

/** Preserve each account's local data and its unsent queue while keeping one
 * active account visible to the existing, unscoped Dexie repositories. */
export function activateLocalAccount(userId) {
  const task = accountSwitch.then(() => activateLocalAccountInternal(userId));
  accountSwitch = task.catch(() => {});
  return task;
}

async function activateLocalAccountInternal(userId) {
  await db.open();
  const active = await db.activeAccount.get("active");
  const previousId = active?.userId || null;
  if (previousId === userId) return;
  let syncBootstrapComplete = false;

  if (previousId) {
    const previous = await accountRows(previousId, true);
    const queued = await db.pendingSync.toArray();
    await db.accountSnapshots.put({ userId: previousId, rows: previous.rows, pendingSync: queued, syncBootstrapComplete: Boolean(active.syncBootstrapComplete), updatedAt: new Date().toISOString() });
    await replaceAccountRows(previousId, null, true);
    await db.pendingSync.clear();
  }

  if (userId) {
    const snapshot = await db.accountSnapshots.get(userId);
    if (snapshot?.rows) {
      syncBootstrapComplete = Boolean(snapshot.syncBootstrapComplete);
      await replaceAccountRows(userId, snapshot.rows);
      await db.pendingSync.clear();
      if (snapshot.pendingSync?.length) await db.pendingSync.bulkPut(snapshot.pendingSync);
      await db.accountSnapshots.delete(userId);
    } else if (!previousId) {
      // Upgrade a pre-scoping local database: retain rows owned by this
      // account, archive rows whose stable user IDs belong to other accounts.
      const all = Object.fromEntries(await Promise.all(ACCOUNT_TABLES.map(async (name) => [name, await db.table(name).toArray()])));
      const legacyQueueRaw = await db.pendingSync.toArray();
      const localRowsByTable = new Map(ACCOUNT_TABLES.map((name) => [name, new Map(all[name].map((row) => [row.id, row]))]));
      const tripOwner = new Map(all.trips.map((row) => [row.id, ownerOf(row)]));
      const expenseOwner = new Map(all.expenses.map((row) => [row.id, ownerOf(row) || tripOwner.get(row.tripId)]));
      const legacyQueue = legacyQueueRaw.map((entry) => {
        const related = localRowsByTable.get(entry.tableName)?.get(entry.recordId);
        const owner = entry.userId || entry.payload?.userId || entry.payload?.user_id || ownerOf(related)
          || (related?.tripId ? tripOwner.get(related.tripId) : null)
          || (entry.tableName === "expensePaymentAllocations" ? expenseOwner.get(related?.expenseId || entry.payload?.expenseId) : null)
          || userId;
        return { ...entry, userId: owner };
      });
      const ownerIds = new Set([
        ...ACCOUNT_TABLES.flatMap((name) => all[name].map(ownerOf).filter((id) => id && id !== userId)),
        ...legacyQueue.map((entry) => entry.userId).filter((id) => id && id !== userId),
      ]);
      for (const ownerId of ownerIds) {
        const other = await accountRows(ownerId);
        const otherQueue = legacyQueue.filter((entry) => entry.userId === ownerId);
        if (Object.values(other.rows).some((list) => list.length) || otherQueue.length) {
          await db.accountSnapshots.put({ userId: ownerId, rows: other.rows, pendingSync: otherQueue, updatedAt: new Date().toISOString() });
          await replaceAccountRows(ownerId, null);
        }
      }
      // A queue created before account tagging is assigned only during this
      // one-time migration to the account already authenticated on the device.
      await db.pendingSync.clear();
      const activeQueue = legacyQueue.filter((entry) => entry.userId === userId);
      if (activeQueue.length) await db.pendingSync.bulkPut(activeQueue);
    }
  } else {
    await db.pendingSync.clear();
  }

  await db.activeAccount.put({ id: "active", userId: userId || null, syncBootstrapComplete: Boolean(syncBootstrapComplete), updatedAt: new Date().toISOString() });
}
