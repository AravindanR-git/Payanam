import "./CategoryStep.css";

import { useMemo, useState } from "react";

import IconAvatar from "../../components/IconAvatar/IconAvatar";
import useLanguage from "../../i18n/useLanguage";

function CategoryStep({
  categories,
  onSelect,
  onBack,
  onAddCategory,
}) {
  const { t } = useLanguage();
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
        ← {t("back")}
      </button>

      <h2 className="step-title">
        {t("selectCategory")}
      </h2>

      <p className="step-subtitle">
        {t("chooseWhereExpenseBelongs")}
      </p>

      <input
        className="category-search"
        type="text"
        placeholder={t("searchCategories")}
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
      />

      {filteredCategories.length === 0 ? (
        <div className="empty-state">
          {t("noCategoriesFound")}
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
                  {t("createNewCategory")}
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
