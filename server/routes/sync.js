import express from "express";
import { db, uuidv4, now } from "../database/db.js";

const router = express.Router();

router.post("/push", (req, res) => {
  try {
    const { model, operation, recordId, payload, createdAt } = req.body;

    if (!model || !operation || !recordId || !createdAt) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const tableMap = {
      trip: "trips",
      participant: "participants",
      contribution: "contributions",
      expense: "expenses",
      category: "expense_categories",
      item: "expense_items",
      place: "places",
      activity: "activities",
    };

    const tableName = tableMap[model];

    if (!tableName) {
      return res.status(400).json({ error: `Unknown model: ${model}` });
    }

    const currentTime = now();

    if (operation === "DELETE") {
      const existing = db[tableName].findOne("SELECT * FROM ?? WHERE id = ?", [tableName, recordId]);

      if (existing) {
        db[tableName].delete(recordId);
      }

      db.sync_log.insert({
        id: uuidv4(),
        userId: req.user?.id || "anonymous",
        tableName,
        recordId,
        operation: "DELETE",
        payload: JSON.stringify(payload || {}),
        clientCreatedAt: createdAt,
        serverReceivedAt: currentTime,
        syncedAt: currentTime,
      });

      return res.json({ success: true, action: "deleted" });
    }

    const existing = db[tableName].findOne("SELECT * FROM ?? WHERE id = ?", [tableName, recordId]);

    if (existing) {
      const remoteTime = new Date(existing.updatedAt || existing.createdAt).getTime();
      const clientTime = new Date(createdAt).getTime();

      if (clientTime > remoteTime) {
        db[tableName].update(recordId, { ...payload, updatedAt: currentTime });
      }
    } else {
      db[tableName].insert({ id: recordId, ...payload, createdAt: currentTime, updatedAt: currentTime });
    }

    db.sync_log.insert({
      id: uuidv4(),
      userId: req.user?.id || "anonymous",
      tableName,
      recordId,
      operation,
      payload: JSON.stringify(payload || {}),
      clientCreatedAt: createdAt,
      serverReceivedAt: currentTime,
      syncedAt: currentTime,
    });

    return res.json({ success: true, action: existing ? "updated" : "created" });
  } catch (error) {
    console.error("Sync push error:", error);
    return res.status(500).json({ error: "Sync push failed" });
  }
});

router.get("/pull", (req, res) => {
  try {
    const lastSyncAt = req.query.lastSyncAt || new Date(0).toISOString();
    const userId = req.user?.id || "anonymous";

    const changes = db.sync_log.findAll(
      "SELECT * FROM sync_log WHERE userId = ? AND serverReceivedAt > ? ORDER BY serverReceivedAt ASC",
      [userId, lastSyncAt]
    );

    const result = changes.map(change => {
      const modelMap = {
        trips: "trip",
        participants: "participant",
        contributions: "contribution",
        expenses: "expense",
        expense_categories: "category",
        expense_items: "item",
        places: "place",
        activities: "activity",
      };

      return {
        model: modelMap[change.tableName] || change.tableName,
        operation: change.operation,
        recordId: change.recordId,
        payload: JSON.parse(change.payload || "{}"),
        createdAt: change.clientCreatedAt,
        syncedAt: change.syncedAt,
      };
    });

    return res.json({ changes: result });
  } catch (error) {
    console.error("Sync pull error:", error);
    return res.status(500).json({ error: "Sync pull failed" });
  }
});

export default router;
