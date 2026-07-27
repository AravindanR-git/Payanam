import { useEffect, useMemo, useState } from "react";
import "./ItemStep.css";

import IconAvatar from "../../components/IconAvatar/IconAvatar";

function ItemStep({
  category,
  items,
  selectedItems = [],
  onBack,
  onContinue,
  onAddItem,
}) {
  const [selected, setSelected] =
    useState(selectedItems);

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    setSelected(selectedItems);
  }, [selectedItems]);

  const filteredItems = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) return items;

    return items.filter((item) =>
      item.name
        ?.toLowerCase()
        .includes(keyword)
    );
  }, [items, search]);

  const toggleItem = (item) => {
    const exists = selected.some(
      (i) => i.id === item.id
    );

    if (exists) {
      setSelected(
        selected.filter(
          (i) => i.id !== item.id
        )
      );
    } else {
      setSelected([
        ...selected,
        {
          id: item.id,
          name: item.name,
          icon: item.icon,
        },
      ]);
    }
  };

  return (
    <div className="item-step">

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

      <div className="item-header">

        <IconAvatar
          icon={category?.icon}
          name={category?.name}
          size={48}
        />

        <div>

          <h2 className="step-title">
            {category?.name}
          </h2>

          <p className="step-subtitle">
            Select one or more items
          </p>

        </div>

      </div>

      <input
        className="item-search"
        type="text"
        placeholder="Search item..."
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
      />

      <div className="selected-count">
        {selected.length} Selected
      </div>

      {filteredItems.length === 0 ? (

        <div className="empty-state">
          No items found.
        </div>

      ) : (

        <div className="item-list">

          {filteredItems.map((item) => {

            const isSelected =
              selected.some(
                (i) => i.id === item.id
              );

            return (

              <button
                key={item.id}
                type="button"
                className={`item-card ${
                  isSelected
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  toggleItem(item)
                }
              >

                <div className="item-left">

                  <IconAvatar
                    icon={item.icon}
                    name={item.name}
                    size={46}
                  />

                  <span className="item-name">
                    {item.name}
                  </span>

                </div>

                {isSelected && (
                  <div className="checkmark">
                    ✓
                  </div>
                )}

              </button>

            );

          })}

          <button
            type="button"
            className="item-card"
            onClick={onAddItem}
          >

            <div className="item-left">

              <div
                style={{
                  width: 46,
                  height: 46,
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

              <span className="item-name">
                Create New Item
              </span>

            </div>

          </button>

        </div>

      )}

      <button
        className="continue-btn"
        disabled={
          selected.length === 0
        }
        onClick={() =>
          onContinue(selected)
        }
      >
        Continue
      </button>

    </div>
  );
}

export default ItemStep;