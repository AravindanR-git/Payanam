import { useState } from "react";
import "./ItemStep.css";

function ItemStep({
  category,
  items,
  selectedItems = [],
  onBack,
  onContinue,
}) {
  const [selected, setSelected] =
    useState(selectedItems);

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
        },
      ]);
    }
  };

  return (
    <div>
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

      <h3>{category?.name}</h3>

      <div className="selected-count">
        Selected: {selected.length}
      </div>

      <div className="item-grid">
        {items.length === 0 ? (
          <p>No items found.</p>
        ) : (
          items.map((item) => {
            const isSelected =
              selected.some(
                (i) => i.id === item.id
              );

            return (
              <div
                key={item.id}
                className={`item-tile ${
                  isSelected
                    ? "selected"
                    : ""
                }`}
                style={{
                  backgroundImage: `url(/assets/items/${
                    item.image ||
                    "placeholder.jpg"
                  })`,
                }}
                onClick={() =>
                  toggleItem(item)
                }
              >
                <div className="item-overlay">
                  <h2>{item.name}</h2>

                  {isSelected && (
                    <div className="selected-badge">
                      ✓
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

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