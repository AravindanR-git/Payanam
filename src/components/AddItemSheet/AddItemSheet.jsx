import { useEffect, useMemo, useState } from "react";

import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";

import ItemRepository from "../../database/repositories/ItemRepository";
import { ITEM_ICONS } from "../../constants/iconRegistry";

import "./AddItemSheet.css";
import useLanguage from "../../i18n/useLanguage";

function AddItemSheet({
  isOpen,
  onClose,
  category,
  item = null,
  onSaved,
}) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (item) {
      setName(item.name || "");
      setIcon(item.icon || "");
    } else {
      setName("");
      setIcon("");
    }

    setSearch("");
  }, [item, isOpen]);

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return ITEM_ICONS;

    const keyword = search.toLowerCase();

    return ITEM_ICONS.filter((icon) =>
      icon.keywords.some((k) =>
        k.toLowerCase().includes(keyword)
      )
    );
  }, [search]);

  const saveItem = async () => {
    if (!name.trim()) {
      alert(t("enterItemName"));
      return;
    }

    let savedItem;

    if (item) {
      await ItemRepository.updateItem(item.id, {
        name,
        icon,
      });

      savedItem = {
        ...item,
        name,
        icon,
      };
    } else {
      savedItem =
        await ItemRepository.createItem({
          categoryId: category.id,
          name,
          icon,
        });
    }

    await onSaved?.(savedItem);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={item ? t("editItem") : t("addItem")}
    >
      <div className="category-sheet">

        <input
          className="sheet-input"
          placeholder={t("itemName")}
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

              {filteredIcons.map((itemIcon) => (

                <button
                  key={itemIcon.id}
                  type="button"
                  className={`icon-card ${icon === itemIcon.path
                      ? "selected"
                      : ""
                    }`}
                  onClick={() =>
                    setIcon(itemIcon.path)
                  }
                >
                  <img
                    src={itemIcon.path}
                    alt=""
                    draggable={false}
                  />
                </button>

              ))}

            </div>
          )}

        </div>

        <Button onClick={saveItem}>
          {item
            ? t("updateItem")
            : t("saveItem")}
        </Button>

      </div>
    </BottomSheet>
  );
}

export default AddItemSheet;
