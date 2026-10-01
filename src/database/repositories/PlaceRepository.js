import { generateUuid } from "../../utils/uuid";
import db from "../db";
import { enqueueSync } from "../../services/syncEnqueue";
import { uploadEntity, deleteEntity, hydrateEntity } from "../../services/supabaseSync";
import { resolveLocalToRemote } from "../../services/entityIdMap";

const DEFAULT_CATEGORIES = ["Temple", "Waterfalls", "Viewpoint", "Tourist Attraction", "Boating", "Other"];
const PlaceRepository = {
  async getPlaces(tripId = null) {
    const rows = await db.places.toArray();
    const categories = await this.getCategories();
    for (const name of new Set(rows.map((place) => place.categoryName).filter(Boolean))) {
      if (!categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) categories.push(await this.addCategory(name));
    }
    return rows.filter((place) => !tripId || place.tripId === tripId).map((place) => ({ ...place, categoryId: place.categoryId || categories.find((category) => category.name === place.categoryName)?.id || null })).sort((a, b) => new Date(b.capturedAt || b.createdAt) - new Date(a.capturedAt || a.createdAt));
  },
  async getCategories() {
    const existing = await db.placeCategories.toArray();
    const names = new Set(existing.map((row) => row.name.toLowerCase()));
    for (const [index, name] of DEFAULT_CATEGORIES.entries()) {
      if (!names.has(name.toLowerCase())) await db.placeCategories.add({ id: generateUuid(), name, isDefault: true, displayOrder: index, createdAt: new Date().toISOString() });
    }
    return (await db.placeCategories.toArray()).sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  },
  async addCategory(name, userId) {
    const normalized = String(name || "").trim();
    if (!normalized) throw new Error("Enter a category name.");
    const existing = await db.placeCategories.toArray();
    if (existing.some((row) => row.name.toLowerCase() === normalized.toLowerCase())) throw new Error("That category already exists.");
    const now = new Date().toISOString();
    const row = { id: generateUuid(), name: normalized, userId: userId || null, displayOrder: existing.length, isDefault: false, createdAt: now, updatedAt: now };
    await db.placeCategories.add(row);
    if (userId) {
      await enqueueSync("placeCategories", row.id, "CREATE", row);
      if (navigator.onLine) uploadEntity("placeCategories", row).catch((error) => console.error("Place category sync failed", error));
    }
    return row;
  },
  async save(data, userId) {
    const name = String(data.name || "").trim();
    if (!name) throw new Error("Place name is required.");
    const lat = data.latitude == null || data.latitude === "" ? null : Number(data.latitude);
    const lon = data.longitude == null || data.longitude === "" ? null : Number(data.longitude);
    if ((lat == null) !== (lon == null) || (lat != null && (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180))) throw new Error("Enter valid latitude and longitude.");
    if (data.rating != null && data.rating !== "" && (!Number.isInteger(Number(data.rating)) || Number(data.rating) < 1 || Number(data.rating) > 5)) throw new Error("Rating must be between 1 and 5.");
    if (!data.tripId) throw new Error("Trip association is required.");
    const category = await db.placeCategories.get(data.categoryId);
    if (!category) throw new Error("Choose a valid place category.");
    const now = new Date().toISOString();
    const id = data.id || generateUuid();
    const previous = data.id ? await db.places.get(data.id) : null;
    const place = { ...previous, ...data, id, userId: userId || data.userId || previous?.userId, name, categoryId: category.id, categoryName: category.name, latitude: lat, longitude: lon, rating: data.rating ? Number(data.rating) : null, description: String(data.description || ""), photo: data.photo || null, capturedAt: data.capturedAt || previous?.capturedAt || now, createdAt: previous?.createdAt || now, updatedAt: now };
    if (data.id) await db.places.put(place); else await db.places.add(place);
    await enqueueSync("places", id, data.id ? "UPDATE" : "CREATE", place);
    if (navigator.onLine) uploadEntity("places", place).catch((error) => console.error("Place sync failed", error));
    return place;
  },
  async createPlace(data, userId) { return this.save(data, userId); },
  async updatePlace(id, data, userId) { return this.save({ ...data, id }, userId); },
  async deletePlace(id) {
    const remoteId = await resolveLocalToRemote("places", id);
    await db.places.delete(id);
    await enqueueSync("places", id, "DELETE", { id, remoteId });
    if (navigator.onLine) deleteEntity("places", remoteId || id).catch((error) => console.error("Place delete sync failed", error));
  },
  async hydratePlacesFromSupabase(userId) {
    if (!userId) return [];
    const { data } = await hydrateEntity(userId, "places");
    return data || [];
  },
};
export { DEFAULT_CATEGORIES };
export default PlaceRepository;
