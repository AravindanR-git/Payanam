import db from "../db";
import { generateUuid } from "../../utils/uuid";
import { enqueueSync } from "../../services/syncEnqueue";
import { uploadEntity } from "../../services/supabaseSync";

const TransportRepository = {
  async list(userId) {
    const rows = await db.transports.toArray();
    return rows.filter((row) => !userId || row.userId === userId).sort((a, b) => a.name.localeCompare(b.name));
  },
  async save(data, userId) {
    if (!data.name?.trim()) throw new Error("Enter a transport name.");
    for (const key of ["ratePerKm", "packageAmount", "driverBetaPerDay"]) {
      if (data[key] !== "" && data[key] != null && (!Number.isFinite(Number(data[key])) || Number(data[key]) < 0)) throw new Error(`Invalid ${key}.`);
    }
    const now = new Date().toISOString();
    const row = { ...data, id: data.id || generateUuid(), name: data.name.trim(), userId, updatedAt: now, createdAt: data.createdAt || now, syncStatus: "PENDING" };
    await db.transports.put(row);
    await enqueueSync("transports", row.id, data.id ? "UPDATE" : "CREATE", row);
    if (navigator.onLine) uploadEntity("transports", row).catch((error) => console.error("Transport sync failed", error));
    return row;
  },
  async remove(id) {
    await db.transports.delete(id);
    await enqueueSync("transports", id, "DELETE", { id });
  },
};
export default TransportRepository;
