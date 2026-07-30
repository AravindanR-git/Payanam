import "./InsightsNav.css";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function InsightsNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tripId } = useParams();

  const tabs = [
    {
      label: "Overview",
      path: "overview",
      icon: "📊",
    },
    {
      label: "Category",
      path: "categories",
      icon: "🥧",
    },
    {
      label: "Day Wise",
      path: "daywise",
      icon: "📈",
    },
    {
      label: "Location",
      path: "location",
      icon: "📍",
    },
    {
      label: "Members",
      path: "members",
      icon: "👥",
    },
    {
      label: "Timeline",
      path: "timeline",
      icon: "🕒",
    },
    {
      label: "AI",
      path: "ai",
      icon: "🤖",
    },
    {
      label: "History",
      path: "history",
      icon: "📜",
    },
  ];

  return (
    <div className="insights-navigation">
      <button
        type="button"
        className="insights-back-button"
        onClick={() => navigate("/journey")}
      >
        <ArrowLeft size={18} />
        Back to Journey
      </button>

      <div className="insights-nav">
        {tabs.map((tab) => (
          <button
            key={tab.path}
            className={`nav-tile ${
              location.pathname.endsWith(tab.path)
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigate(`/reports/${tripId}/${tab.path}`)
            }
          >
            <span className="nav-icon">
              {tab.icon}
            </span>

            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
