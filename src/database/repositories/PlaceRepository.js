import { generateUuid } from "../../utils/uuid";
import db from "../db";
import SyncService from "../../services/syncService";
import { uploadEntity, hydrateEntity } from "../../services/supabaseSync";

const PlaceRepository = {

  async getPlaces() {

    return await db.places
      .orderBy("displayOrder")
      .toArray();

  },

  async createPlace(data) {

    const now = new Date().toISOString();

    const allPlaces = await db.places.toArray();

    const hasBadOrders = allPlaces.some(c => c.displayOrder > 100000);

    if (hasBadOrders) {
      const sorted = allPlaces.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      const updates = sorted.map((place, idx) => ({
        id: place.id,
        displayOrder: idx + 1,
      }));

      for (const update of updates) {
        await db.places.update(update.id, { displayOrder: update.displayOrder });
      }

      console.log('[PlaceRepository] createPlace: normalized displayOrder for', updates.length, 'places');
    }

    const existingOrders = await db.places
      .orderBy('displayOrder')
      .reverse()
      .toArray();

    const maxOrder = existingOrders.length > 0 ? existingOrders[0].displayOrder : 0;

    const place = {

      id: generateUuid(),

      name: data.name,

      displayOrder: maxOrder + 1,

      createdAt: now,

      updatedAt: now,

    };

    await db.places.add(place);

    SyncService.enqueue("places", place.id, "CREATE", place);

    if (navigator.onLine) {
      uploadEntity('places', place).catch((error) => {
        console.error('[PlaceRepository] createPlace upload error:', error);
      });
    }

    return place;
  },

  async updatePlace(id, data) {

    await db.places.update(id, {

      ...data,

      updatedAt: new Date().toISOString(),

    });

    const updated = await db.places.get(id);

    SyncService.enqueue("places", id, "UPDATE", { ...data, updatedAt: new Date().toISOString() });

    if (navigator.onLine && updated) {
      uploadEntity('places', updated).catch((error) => {
        console.error('[PlaceRepository] updatePlace upload error:', error);
      });
    }

  },

  async deletePlace(id) {

    await db.places.delete(id);

    SyncService.enqueue("places", id, "DELETE", { id });

  },

  async hydratePlacesFromSupabase(userId) {
    if (!userId) return [];
    const { data } = await hydrateEntity(userId, 'places');
    return data || [];
  },

};

export default PlaceRepository;