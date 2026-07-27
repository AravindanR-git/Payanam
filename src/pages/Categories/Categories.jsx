import "./Categories.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import IconAvatar from "../../components/IconAvatar/IconAvatar";

import CategoryRepository from "../../database/repositories/CategoryRepository";
import AddCategorySheet from "../../components/AddCategorySheet/AddCategorySheet";

function Categories() {

  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);

  const [showSheet, setShowSheet] =
    useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState(null);

  useEffect(() => {

    loadCategories();

  }, []);

  const loadCategories = async () => {

    const list =
      await CategoryRepository.getCategories();

    setCategories(list);

  };

  const editCategory = (category) => {

    setSelectedCategory(category);

    setShowSheet(true);

  };

  const addCategory = () => {

    setSelectedCategory(null);

    setShowSheet(true);

  };

  const deleteCategory = async (category) => {

    const ok = window.confirm(

      `Delete "${category.name}" ?`

    );

    if (!ok) return;

    await CategoryRepository.deleteCategory(
      category.id
    );

    loadCategories();

  };

  return (

    <div className="categories-page">

      <button
        className="back-btn"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={20} />
      </button>

      <div className="categories-header">

        <h1>Categories</h1>

        <p>

          Organize your expenses.

        </p>

      </div>

      {

        categories.length === 0 ?

          <div className="empty-card">

            <h3>

              No Categories

            </h3>

            <p>

              Create your first expense category.

            </p>

          </div>

          :

          <div className="categories-list">

            {

              categories.map(category => (

                <div
                  key={category.id}
                  className="category-card"
                  onClick={() =>
                    navigate("/items", {
                      state: {
                        category,
                      },
                    })
                  }
                >

                  <div className="category-left">

                    <IconAvatar
                      icon={category.icon}
                      name={category.name}
                      size={42}
                    />
                    <div className="category-text">

                      <span className="category-title">

                        {category.name}

                      </span>

                    </div>

                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                    }}
                  >

                    <button
                      className="category-action"
                      onClick={(e) => {

                        e.stopPropagation();

                        editCategory(category);

                      }}
                    >
                      <Pencil size={18} />
                    </button>

                    <button
                      className="category-action"
                      onClick={(e) => {

                        e.stopPropagation();

                        deleteCategory(category);

                      }}
                    >
                      <Trash2 size={18} />
                    </button>

                  </div>

                </div>

              ))

            }

          </div>

      }

      <button

        className="floating-btn"

        onClick={addCategory}

      >

        <Plus size={26} />

      </button>

      <AddCategorySheet

        isOpen={showSheet}

        onClose={() => {

          setShowSheet(false);

          setSelectedCategory(null);

        }}

        category={selectedCategory}

        onSaved={loadCategories}

      />

    </div>

  );

}

export default Categories;