import db from "../db";

const ItemRepository = {

  async getItems(categoryId) {

    return await db.expenseItems
      .where("categoryId")
      .equals(categoryId)
      .sortBy("displayOrder");

  }

};

export default ItemRepository;