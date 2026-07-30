import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import db from "../../database/db";
import "./DayWiseAnalysis.css";
import InsightsNav from "../../components/Insights/InsightsNav";

export default function DayWiseAnalysis() {
  const { tripId } = useParams();

  const [data, setData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const expenses = await db.expenses
      .where("tripId")
      .equals(tripId)
      .toArray();

    const grouped = {};

    expenses.forEach((expense) => {
      const day = new Date(
        expense.expenseTime
      ).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });

      grouped[day] =
        (grouped[day] || 0) +
        Number(expense.amount || 0);
    });

    const result = Object.entries(grouped).map(
      ([day, amount]) => ({
        day,
        amount,
      })
    );

    setData(result);
  }

  return (
    <div className="daywise-page">
        <InsightsNav />
        

      <h2>Day Wise Expenses</h2>

      <div className="graph-card">

        <ResponsiveContainer
          width="100%"
          height={300}
        >
          <BarChart data={data}>
            <XAxis dataKey="day" />

            <YAxis />

            <Tooltip />

            <Bar
              dataKey="amount"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

      </div>

      <div className="day-list">

        {data.map((day) => (

          <div
            key={day.day}
            className="day-card"
          >
            <span>{day.day}</span>

            <strong>
              ₹
              {day.amount.toLocaleString(
                "en-IN"
              )}
            </strong>
          </div>

        ))}

      </div>

    </div>
  );
}