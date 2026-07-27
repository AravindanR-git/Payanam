import "./CategoryStep.css";

import { useMemo, useState } from "react";

import IconAvatar from "../../components/IconAvatar/IconAvatar";

function CategoryStep({
  categories,
  onSelect,
  onBack,
  onAddCategory,
}) {
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return categories;

    return categories.filter((category) =>
      category.name
        ?.toLowerCase()
        .includes(keyword)
    );
  }, [categories, search]);

  return (
    <div className="category-step">

      <button
        type="button"
        className="back-step-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onBack();
        }}
      >
        ← Back
      </button>

      <h2 className="step-title">
        Select Category
      </h2>

      <p className="step-subtitle">
        Choose where this expense belongs
      </p>

      <input
        className="category-search"
        type="text"
        placeholder="Search category..."
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
      />

      {filteredCategories.length === 0 ? (
        <div className="empty-state">
          No categories found.
        </div>
      ) : (
        <div className="category-list">

          {filteredCategories.map((category) => (

            <button
              key={category.id}
              type="button"
              className="category-card"
              onClick={() =>
                onSelect(category)
              }
            >

              <div className="category-left">

                <IconAvatar
                  icon={category.icon}
                  name={category.name}
                  size={50}
                />

                <div className="category-info">

                  <span className="category-name">
                    {category.name}
                  </span>

                </div>

              </div>

              <span className="category-arrow">
                →
              </span>

            </button>

          ))}

          <button
            type="button"
            className="category-card"
            onClick={onAddCategory}
          >

            <div className="category-left">

              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  background: "#2563eb",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                +
              </div>

              <div className="category-info">

                <span className="category-name">
                  Create New Category
                </span>

              </div>

            </div>

            <span className="category-arrow">
              →
            </span>

          </button>

        </div>
      )}

    </div>
  );
}

export default CategoryStep;