import "./Reports.css";
import { useNavigate, useParams } from "react-router-dom";
import InsightsNav from "../../components/Insights/InsightsNav";

export default function Reports() {
  const navigate = useNavigate();
  const { tripId } = useParams();

  const reportCards = [
    {
      title: "Overview",
      subtitle: "Trip Health & Summary",
      icon: "📊",
      path: `/reports/${tripId}/overview`,
    },
    {
      title: "Category Analysis",
      subtitle: "Category-wise Expenses",
      icon: "🥧",
      path: `/reports/${tripId}/categories`,
    },
    {
      title: "Day Wise",
      subtitle: "Daily Expense Trends",
      icon: "📈",
      path: `/reports/${tripId}/daywise`,
    },
    {
      title: "Location Insights",
      subtitle: "Map & Location Analysis",
      icon: "📍",
      path: `/reports/${tripId}/location`,
    },
    {
      title: "Member Insights",
      subtitle: "Contribution Analysis",
      icon: "👥",
      path: `/reports/${tripId}/members`,
    },
    {
      title: "Timeline",
      subtitle: "Journey Timeline",
      icon: "🕒",
      path: `/reports/${tripId}/timeline`,
    },
    {
      title: "AI Insights",
      subtitle: "Smart Journey Analysis",
      icon: "🤖",
      path: `/reports/${tripId}/ai`,
    },
  ];

  return (
    <div className="reports-page">
        <InsightsNav />
      <div className="reports-header">
        <h2>Journey Insights</h2>
        <p>Understand your journey through analytics.</p>
      </div>

      <div className="reports-grid">
        {reportCards.map((card) => (
          <div
            key={card.title}
            className="report-card"
            onClick={() => navigate(card.path)}
          >
            <div className="report-icon">{card.icon}</div>

            <div className="report-content">
              <h3>{card.title}</h3>
              <p>{card.subtitle}</p>
            </div>

            <span className="arrow">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}