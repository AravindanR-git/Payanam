import { useEffect, useMemo, useState, useRef } from "react";

import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";

import CategoryRepository from "../../database/repositories/CategoryRepository";
import { CATEGORY_ICONS } from "../../constants/iconRegistry";

import "./AddCategorySheet.css";
import useLanguage from "../../i18n/useLanguage";

function AddCategorySheet({
  isOpen,
  onClose,
  category = null,
  trip = null,
  userId = null,
  onSaved,
}) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [search, setSearch] = useState("");
  const savingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    savingRef.current = false;

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
    console.log('[Category UI] saveCategory clicked, name=', name, 'trip=', trip);
    if (savingRef.current) {
      console.log('[Category UI] saveCategory already in progress, skipping duplicate');
      return;
    }

    if (!name.trim()) {
      alert(t("enterCategoryName"));
      return;
    }

    savingRef.current = true;

    let savedCategory;

    try {
      if (category) {
        console.log('[Category UI] updating existing category');
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
        console.log('[Category UI] creating new category');
        const resolvedUserId = userId || trip?.userId;
        if (!resolvedUserId) {
          alert('Missing user session. Please log in again.');
          return;
        }
        savedCategory =
          await CategoryRepository.createCategory({
            name,
            icon,
            userId: resolvedUserId,
            tripTypes: [trip?.tripType || "all"],
          });
        console.log('[Category UI] createCategory returned:', savedCategory);
      }

      await onSaved?.(savedCategory);
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={category ? t("editCategory") : t("addCategory")}
    >
      <div className="category-sheet">

        <input
          className="sheet-input"
          placeholder={t("categoryName")}
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
              {t("noIconsFound")}
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
            ? t("updateCategory")
            : t("saveCategory")}
        </Button>

      </div>
    </BottomSheet>
  );
}

export default AddCategorySheet;
