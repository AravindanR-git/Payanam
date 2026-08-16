import Card from "../Card/Card";
import "./JourneySummaryCard.css";
import useLanguage from "../../i18n/useLanguage";

function JourneySummaryCard({
  tripGroup,
  friends,
  families,
  totalAdults,
  totalChildren,
  totalCollected,
}) {
  const { t } = useLanguage();

  return (
    <Card>

      <div className="summary-header">
        <h3>{t("journeySummary")}</h3>
      </div>

      {tripGroup === "friends" ? (
        <div className="summary-row">
          <span>{t("participants")}</span>
          <strong>{friends.length}</strong>
        </div>
      ) : (
        <>
          <div className="summary-row">
            <span>{t("families")}</span>
            <strong>{families.length}</strong>
          </div>

          <div className="summary-row">
            <span>{t("adults")}</span>
            <strong>{totalAdults}</strong>
          </div>

          <div className="summary-row">
            <span>{t("children")}</span>
            <strong>{totalChildren}</strong>
          </div>

          <div className="summary-row">
            <span>{t("totalHeadcount")}</span>
            <strong>{totalAdults + totalChildren}</strong>
          </div>
        </>
      )}

      <div className="summary-total">
        ₹{totalCollected.toLocaleString("en-IN")}
      </div>

    </Card>
  );
}

export default JourneySummaryCard;
