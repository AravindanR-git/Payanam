import db from "../db";

const CategoryRepository = {

  async getCategories() {

    return await db.expenseCategories.toArray();

  }

};

export default CategoryRepository;