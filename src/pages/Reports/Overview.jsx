import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Overview.css";
import InsightsNav from "../../components/Insights/InsightsNav";
import ReportRepository from "../../database/repositories/ReportRepository";
import useLanguage from "../../i18n/useLanguage";

export default function Overview() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [summary, setSummary] = useState({
    collected: 0,
    spent: 0,
    balance: 0,
    members: 0,
    budgetPercent: 0,
    health: "Healthy",
    healthClass: "healthy",
    recentExpenses: [],
  });

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    const overview = await ReportRepository.getOverview(tripId);

    const { collected, spent, balance } = overview;

    const budgetPercent =
      collected === 0
        ? 0
        : Math.min(100, Math.round((spent / collected) * 100));

    let health = "Healthy";
    let healthClass = "healthy";

    if (budgetPercent >= 85) {
      health = "Budget Tight";
      healthClass = "danger";
    } else if (budgetPercent >= 60) {
      health = "Watch Spending";
      healthClass = "warning";
    }

    setSummary({
      collected,
      spent,
      balance,
      members: overview.memberCount,
      budgetPercent,
      health,
      healthClass,
      recentExpenses: overview.recentExpenses,
    });
  }

  return (
    <div className="overview-page">
        <InsightsNav />

      <div className="summary-grid">

        <div className="summary-card collected">
          <span>{t("totalCollected")}</span>
          <h2>₹{summary.collected.toLocaleString("en-IN")}</h2>
        </div>

        <div className="summary-card spent">
          <span>{t("totalSpent")}</span>
          <h2>₹{summary.spent.toLocaleString("en-IN")}</h2>
        </div>

        <div className="summary-card balance">
          <span>{t("balance")}</span>
          <h2>₹{summary.balance.toLocaleString("en-IN")}</h2>
        </div>

        <div className="summary-card members">
          <span>{t("participants")}</span>
          <h2>{summary.members}</h2>
        </div>

      </div>

      <div className="budget-card">

        <div className="budget-header">
          <h3>{t("budgetUsage")}</h3>
          <strong>{summary.budgetPercent}%</strong>
        </div>

        <div className="progress">
          <div
            className="progress-fill"
            style={{
              width: `${summary.budgetPercent}%`,
            }}
          />
        </div>

        <div className="budget-footer">
          <span>
            ₹{summary.spent.toLocaleString("en-IN")} {t("spentLabel")}
          </span>

          <span>
            ₹{summary.balance.toLocaleString("en-IN")} {t("remaining")}
          </span>
        </div>

      </div>

      <div className={`health-card ${summary.healthClass}`}>
        <span>{t("health")}</span>
        <h3>{summary.health}</h3>
      </div>
      <div className="recent-card">

        <div className="card-header">

          <h3>{t("recentExpenses")}</h3>

          <button
            className="view-all-btn"
            onClick={() => navigate(`/reports/${tripId}/history`)}
          >
            {t("viewHistory")} →
          </button>

        </div>

        {summary.recentExpenses.length === 0 ? (
          <p className="empty-text">{t("noExpensesYet")}</p>
        ) : (
          summary.recentExpenses.map((expense) => (
            <div
              className="recent-row"
              key={expense.id}
            >
              <div>

                <strong>
                  {expense.selectedItems?.length
                    ? expense.selectedItems
                        .map((i) => i.name)
                        .join(", ")
                    : t("expense")}
                </strong>

                <small>
                  {expense.locationName || t("unknownLocation")}
                </small>

              </div>

              <div className="recent-right">

                <strong>
                  ₹{Number(expense.amount || 0).toLocaleString("en-IN")}
                </strong>

                <small>
                  {expense.expenseTime
                    ? new Date(expense.expenseTime).toLocaleDateString("en-IN")
                    : ""}
                </small>

                <button
                  className="view-history-btn"
                  onClick={() => navigate(`/reports/${tripId}/history?category=${encodeURIComponent(expense.categoryName || "Others")}`)}
                  title={t("viewHistory")}
                >
                  ›
                </button>

              </div>

            </div>
          ))
        )}

      </div>

    </div>
  );
}
