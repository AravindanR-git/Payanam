import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./Overview.css";
import InsightsNav from "../../components/Insights/InsightsNav";
import ReportRepository from "../../database/repositories/ReportRepository";

export default function Overview() {
  const { tripId } = useParams();

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
          <span>Collected</span>
          <h2>₹{summary.collected.toLocaleString("en-IN")}</h2>
        </div>

        <div className="summary-card spent">
          <span>Spent</span>
          <h2>₹{summary.spent.toLocaleString("en-IN")}</h2>
        </div>

        <div className="summary-card balance">
          <span>Balance</span>
          <h2>₹{summary.balance.toLocaleString("en-IN")}</h2>
        </div>

        <div className="summary-card members">
          <span>Members</span>
          <h2>{summary.members}</h2>
        </div>

      </div>

      <div className="budget-card">

        <div className="budget-header">
          <h3>Budget Usage</h3>
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
            ₹{summary.spent.toLocaleString("en-IN")} spent
          </span>

          <span>
            ₹{summary.balance.toLocaleString("en-IN")} remaining
          </span>
        </div>

      </div>

      <div className={`health-card ${summary.healthClass}`}>
        <span>Trip Health</span>
        <h3>{summary.health}</h3>
      </div>

      <div className="recent-card">

        <h3>Recent Expenses</h3>

        {summary.recentExpenses.length === 0 ? (
          <p>No expenses yet.</p>
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
                    : "Expense"}
                </strong>

                <small>
                  {expense.locationName || "Unknown Location"}
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
              </div>
            </div>
          ))
        )}

      </div>

    </div>
  );
}
