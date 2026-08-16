import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./AIInsights.css";
import InsightsNav from "../../components/Insights/InsightsNav";
import ReportRepository from "../../database/repositories/ReportRepository";
import useLanguage from "../../i18n/useLanguage";

export default function AIInsights() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tripId) {
      setError(t("noTripFound"));
      setLoading(false);
      return;
    }

    loadInsights();
  }, [tripId]);

  const loadInsights = async () => {
    if (!tripId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await ReportRepository.getAIInsights(tripId);
      setInsights(data);
    } catch (err) {
      console.error("Failed to load AI insights:", err);
      setError(err.message || t("unableToLoadInsights"));
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "danger":
        return "🚨";
      default:
        return "ℹ️";
    }
  };

  const getInsightColor = (type) => {
    switch (type) {
      case "success":
        return "#16A34A";
      case "warning":
        return "#F59E0B";
      case "danger":
        return "#DC2626";
      default:
        return "#0A84FF";
    }
  };

  if (loading) {
    return (
      <div className="ai-insights">
        <InsightsNav />
        <div className="loading-state">
          <div className="spinner" />
          <p>{t("analyzingTripData")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-insights">
        <InsightsNav />
        <div className="empty-state">
          <p>{error}</p>
          <button
            className="retry-button"
            onClick={() => navigate("/journey")}
          >
            {t("goToJourney")}
          </button>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="ai-insights">
        <InsightsNav />
        <div className="empty-state">
          <p>{t("noInsightsYet")}</p>
          <button
            className="retry-button"
            onClick={() => navigate("/journey")}
          >
            {t("goToJourney")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-insights">
      <InsightsNav />

      <div className="ai-content">
        <div className="ai-header">
          <h2>🤖 {t("tripInsights")}</h2>
          <p className="ai-subtitle">
            {t("smartAnalysisFor")}{" "}
            <strong>{insights.trip?.tripName || t("yourTrip")}</strong>
          </p>
        </div>

        <div className="summary-cards">
          <div className="summary-card">
            <span className="summary-label">{t("collected")}</span>
            <span className="summary-value">
              ₹{insights.totalCollected.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="summary-card">
            <span className="summary-label">{t("totalSpent")}</span>
            <span className="summary-value">
              ₹{insights.totalSpent.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="summary-card">
            <span className="summary-label">{t("fairSharePerPerson")}</span>
            <span className="summary-value">
              ₹{insights.fairSharePerMember.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="summary-card">
            <span className="summary-label">{t("daysActive")}</span>
            <span className="summary-value">
              {insights.daysActive}
            </span>
          </div>
        </div>

        <section className="insight-section">
          <h3>💡 {t("keyInsights")}</h3>
          <div className="insights-list">
            {insights.insights.map((insight, index) => (
              <div
                key={index}
                className="insight-card"
                style={{
                  borderLeftColor: getInsightColor(insight.type),
                }}
              >
                <span className="insight-icon">
                  {getInsightIcon(insight.type)}
                </span>
                <div>
                  <strong>{insight.title}</strong>
                  <p>{insight.message}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {insights.topCategories.length > 0 && (
          <section className="insight-section">
            <h3>📊 {t("topCategories")}</h3>
            <div className="category-list">
              {insights.topCategories.map((category) => (
                <div key={category.id} className="category-row">
                  <div className="category-info">
                    <span className="category-name">
                      {category.name}
                    </span>
                    <span className="category-percentage">
                      {category.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="category-bar">
                    <div
                      className="category-fill"
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                  <span className="category-amount">
                    ₹{category.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="insight-section">
          <h3>💰 {t("moneySplitting")}</h3>

          <div className="splitting-summary">
            <div className="split-group">
              <h4>{t("equalPerHeadSettlement")}</h4>
              <p className="split-helper">
                {t("fairShareIsCalculatedEqually")}
              </p>
              <div className="participant-list">
                {insights.participantContributions.map((p) => (
                  <div key={p.id} className="participant-row">
                    <span className="participant-name">
                      {p.name}
                      {p.type === "family" && (
                        <small>
                          {" "}
                          ({t("familyLabel")} - {p.memberCount}{" "}
                          {p.memberCount === 1 ? t("person") : t("people")}
                          )
                        </small>
                      )}
                    </span>
                    <div className="participant-amounts">
                      <span className="contribution">
                        {t("contribution")}: ₹{p.contribution.toLocaleString("en-IN")}
                      </span>
                      <span className="expense">
                        {t("fairSharePerPerson")}: ₹{p.fairShare.toLocaleString("en-IN")}
                      </span>
                      {p.personalPayments > 0 && (
                        <span className="expense">
                          {t("personalExpenses")}: ₹{p.personalPayments.toLocaleString("en-IN")}
                        </span>
                      )}
                      <span
                        className={`balance ${p.balance >= 0 ? "positive" : "negative"}`}
                      >
                        {p.balance >= 0 ? t("getsBack") : t("owes")}: ₹
                        {Math.abs(p.balance).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {insights.settlement.length > 0 && (
            <div className="settlement-section">
              <h4>💸 {t("suggestedSettlements")}</h4>
              <p className="split-helper">
                {t("toSettleTrip")}
              </p>
              <div className="settlement-list">
                {insights.settlement.map((s, index) => (
                  <div key={index} className="settlement-card">
                    <span className="settlement-from">
                      {s.from}
                    </span>
                    <span className="settlement-arrow">
                      ➔
                    </span>
                    <span className="settlement-to">
                      {s.to}
                    </span>
                    <span className="settlement-amount">
                      ₹{s.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {insights.topLocations.length > 0 && (
          <section className="insight-section">
            <h3>📍 {t("topSpendingLocations")}</h3>
            <div className="location-list">
              {insights.topLocations.map((loc, index) => (
                <div key={index} className="location-row">
                  <span className="location-name">
                    {loc.name}
                  </span>
                  <span className="location-amount">
                    ₹{loc.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
