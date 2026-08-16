import { ulid } from "ulid";
import db from "../db";
import SyncService from "../../services/syncService";

const PlaceRepository = {

  async getPlaces() {

    return await db.places
      .orderBy("displayOrder")
      .toArray();

  },

  async createPlace(data) {

    const place = {

      id: ulid(),

      name: data.name,

      displayOrder: Date.now(),

      createdAt: new Date().toISOString(),

      updatedAt: new Date().toISOString(),

    };

    await db.places.add(place);

    SyncService.enqueue("places", place.id, "CREATE", place);

    return place;
  },

  async updatePlace(id, data) {

    await db.places.update(id, {

      ...data,

      updatedAt: new Date().toISOString(),

    });

    SyncService.enqueue("places", id, "UPDATE", { ...data, updatedAt: new Date().toISOString() });

  },

  async deletePlace(id) {

    await db.places.delete(id);

    SyncService.enqueue("places", id, "DELETE", { id });

  },

};

export default PlaceRepository;