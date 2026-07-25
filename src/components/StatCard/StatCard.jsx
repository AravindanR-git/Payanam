import Card from "../Card/Card";
import "./StatCard.css";

function StatCard({
  title,
  value,
}) {
  return (
    <Card>

      <div className="stat-card">

        <div className="label">
          {title}
        </div>

        <div className="stat-value">
          {value}
        </div>

      </div>

    </Card>
  );
}

export default StatCard;