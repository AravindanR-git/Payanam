import { useState } from "react";
import { X, Search, User, Heart } from "lucide-react";
import BottomSheet from "../BottomSheet/BottomSheet";
import "./SearchablePicker.css";

function SearchablePicker({
  isOpen,
  onClose,
  title,
  searchPlaceholder,
  items,
  getItemKey,
  getItemLabel,
  getItemSecondary,
  getItemIcon,
  currentSelectedKey,
  onSelect,
  emptyText,
}) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? items.filter((item) =>
        getItemLabel(item)
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      )
    : items;

  const handleSelect = (item) => {
    onSelect(item);
    setQuery("");
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="picker-search">
        <Search size={18} className="picker-search-icon" />
        <input
          className="picker-search-input"
          type="text"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button
            className="picker-clear"
            onClick={() => setQuery("")}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="picker-results">
        {filtered.length === 0 ? (
          <div className="picker-empty">
            {emptyText || "No results found"}
          </div>
        ) : (
          filtered.map((item) => {
            const key = getItemKey(item);
            const isSelected = key === currentSelectedKey;
            return (
              <button
                key={key}
                className={`picker-item ${isSelected ? "picker-item-selected" : ""}`}
                onClick={() => handleSelect(item)}
              >
                <span className="picker-item-icon">
                  {getItemIcon ? getItemIcon(item) : <User size={18} />}
                </span>
                <span className="picker-item-content">
                  <span className="picker-item-label">
                    {getItemLabel(item)}
                  </span>
                  {getItemSecondary(item) && (
                    <span className="picker-item-secondary">
                      {getItemSecondary(item)}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <span className="picker-check">✓</span>
                )}
              </button>
            );
          })
        )}
      </div>
    </BottomSheet>
  );
}

export default SearchablePicker;