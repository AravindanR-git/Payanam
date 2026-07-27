import { useEffect, useMemo, useState } from "react";

import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";

import CategoryRepository from "../../database/repositories/CategoryRepository";
import { CATEGORY_ICONS } from "../../constants/iconRegistry";

import "./AddCategorySheet.css";

function AddCategorySheet({
  isOpen,
  onClose,
  category = null,
  onSaved,
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (category) {
      setName(category.name || "");
      setIcon(category?.icon || "");
    } else {
      setName("");
      setIcon("");
    }

    setSearch("");
  }, [category, isOpen]);

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return CATEGORY_ICONS;

    const text = search.toLowerCase();

    return CATEGORY_ICONS.filter((icon) =>
      icon.keywords.some((k) =>
        k.toLowerCase().includes(text)
      )
    );
  }, [search]);

  const saveCategory = async () => {
    if (!name.trim()) {
      alert("Enter category name");
      return;
    }

    let savedCategory;

    if (category) {
      await CategoryRepository.updateCategory(category.id, {
        name,
        icon,
      });

      savedCategory = {
        ...category,
        name,
        icon,
      };
    } else {
      savedCategory =
        await CategoryRepository.createCategory({
          name,
          icon,
        });
    }

    await onSaved?.(savedCategory);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={category ? "Edit Category" : "Add Category"}
    >
      <div className="category-sheet">

        <input
          className="sheet-input"
          placeholder="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="sheet-input"
          placeholder="🔍 Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="icon-picker">

          {filteredIcons.length === 0 ? (
            <div className="no-icons">
              No icons found
            </div>
          ) : (
            <div className="icon-grid">

              {filteredIcons.map((item) => (

                <button
                  key={item.id}
                  type="button"
                  className={`icon-card ${icon === item.path ? "selected" : ""
                    }`}
                  onClick={() => setIcon(item.path)}
                >

                  <img
                    src={item.path}
                    alt=""
                    draggable={false}
                  />

                </button>

              ))}

            </div>
          )}

        </div>

        <Button onClick={saveCategory}>
          {category
            ? "Update Category"
            : "Save Category"}
        </Button>

      </div>
    </BottomSheet>
  );
}

export default AddCategorySheet;