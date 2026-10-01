import { useState } from "react";
import { X, User, Heart, AlertTriangle } from "lucide-react";
import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";
import "./ReassignmentSheet.css";
import useLanguage from "../../i18n/useLanguage";

function ReassignmentSheet({
  isOpen,
  onClose,
  title,
  personName,
  affectedItems,
  availableDestinations,
  currentDestinations,
  onConfirm,
  remainingAmount,
  remainingLabel,
}) {
  const { t } = useLanguage();
  const [destinations, setDestinations] = useState(
    currentDestinations || {}
  );

  const handleDestinationChange = (index, newType, newId) => {
    setDestinations((prev) => ({
      ...prev,
      [index]: { type: newType, id: newId },
    }));
  };

  const allResolved = () => {
    return affectedItems.every((_, idx) => {
      const d = destinations[idx];
      return d && d.type && (d.type === "fund" || d.id);
    });
  };

  const remainingResolved = () => {
    if (remainingAmount == null || remainingAmount <= 0) return true;
    const d = destinations.remaining;
    return d && d.type && (d.type === "fund" || d.id);
  };

  const handleConfirm = () => {
    if (!allResolved()) return;
    if (!remainingResolved()) return;
    onConfirm(destinations);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="reassign-warning">
        <AlertTriangle size={20} />
        <span>
          {t("reassignBeforeDelete", { name: personName })}
        </span>
      </div>

      {remainingAmount != null && remainingAmount > 0 && (
        <div className="remaining-section">
          <span className="remaining-label">
            {remainingLabel}: ₹{Number(remainingAmount).toLocaleString("en-IN")}
          </span>
          <div className="destination-options">
            <button
              className={`dest-opt ${destinations.remaining?.type === "fund" ? "active" : ""}`}
              onClick={() =>
                handleDestinationChange("remaining", "fund", null)
              }
            >
              💰 {t("tripFund")}
            </button>
            {availableDestinations.persons && (
              <button
                className={`dest-opt ${destinations.remaining?.type === "person" ? "active" : ""}`}
                onClick={() => handleDestinationChange("remaining", "person", "")}
              >
                <User size={14} /> {t("person")}
              </button>
            )}
            {availableDestinations.donors && (
              <button
                className={`dest-opt ${destinations.remaining?.type === "donor" ? "active" : ""}`}
                onClick={() => handleDestinationChange("remaining", "donor", "")}
              >
                <Heart size={14} /> {t("donor")}
              </button>
            )}
          </div>
          {destinations.remaining?.type === "person" && (
            <select
              className="sheet-input"
              value={destinations.remaining?.id || ""}
              onChange={(e) =>
                handleDestinationChange("remaining", "person", e.target.value)
              }
            >
              <option value="">{t("selectPerson")}</option>
              {availableDestinations.personsList?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          {destinations.remaining?.type === "donor" && (
            <select
              className="sheet-input"
              value={destinations.remaining?.id || ""}
              onChange={(e) =>
                handleDestinationChange("remaining", "donor", e.target.value)
              }
            >
              <option value="">{t("selectDonor")}</option>
              {availableDestinations.donorsList?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.donorName} — ₹{Number(d.available || 0).toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="affected-list">
        {affectedItems.map((item, idx) => (
          <div key={idx} className="affected-item">
            <div className="affected-info">
              <span className="affected-amount">
                ₹{Number(item.amount).toLocaleString("en-IN")}
              </span>
              <span className="affected-desc">
                {item.description}
              </span>
            </div>
            <div className="destination-options">
              <button
                className={`dest-opt ${destinations[idx]?.type === "fund" ? "active" : ""}`}
                onClick={() =>
                  handleDestinationChange(idx, "fund", null)
                }
              >
                💰 {t("tripFund")}
              </button>
              {availableDestinations.persons && (
                <button
                  className={`dest-opt ${destinations[idx]?.type === "person" ? "active" : ""}`}
                  onClick={() => handleDestinationChange(idx, "person", "")}
                >
                  <User size={14} /> {t("person")}
                </button>
              )}
              {availableDestinations.donors && (
                <button
                  className={`dest-opt ${destinations[idx]?.type === "donor" ? "active" : ""}`}
                  onClick={() => handleDestinationChange(idx, "donor", "")}
                >
                  <Heart size={14} /> {t("donor")}
                </button>
              )}
            </div>
            {destinations[idx]?.type === "person" && (
              <select
                className="sheet-input"
                value={destinations[idx]?.id || ""}
                onChange={(e) =>
                  handleDestinationChange(idx, "person", e.target.value)
                }
              >
                <option value="">{t("selectPerson")}</option>
                {availableDestinations.personsList?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            {destinations[idx]?.type === "donor" && (
              <select
                className="sheet-input"
                value={destinations[idx]?.id || ""}
                onChange={(e) =>
                  handleDestinationChange(idx, "donor", e.target.value)
                }
              >
                <option value="">{t("selectDonor")}</option>
                {availableDestinations.donorsList?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.donorName} — ₹{Number(d.available || 0).toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      <div className="reassign-actions">
        <Button variant="secondary" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button onClick={handleConfirm} disabled={!allResolved() || !remainingResolved()}>
          {t("reassignAndDelete")}
        </Button>
      </div>
    </BottomSheet>
  );
}

export default ReassignmentSheet;