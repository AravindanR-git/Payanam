import Card from "../Card/Card";
import "./JourneySummaryCard.css";

function JourneySummaryCard({
  tripGroup,
  friends,
  families,
  totalAdults,
  totalChildren,
  totalCollected,
}) {
  return (
    <Card>

      <div className="summary-header">
        <h3>Journey Summary</h3>
      </div>

      {tripGroup === "friends" ? (
        <div className="summary-row">
          <span>Participants</span>
          <strong>{friends.length}</strong>
        </div>
      ) : (
        <>
          <div className="summary-row">
            <span>Families</span>
            <strong>{families.length}</strong>
          </div>

          <div className="summary-row">
            <span>Adults</span>
            <strong>{totalAdults}</strong>
          </div>

          <div className="summary-row">
            <span>Children</span>
            <strong>{totalChildren}</strong>
          </div>

          <div className="summary-row">
            <span>Total People</span>
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