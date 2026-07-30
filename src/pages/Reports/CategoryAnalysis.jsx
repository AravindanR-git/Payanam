import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Bar,
} from "recharts";

import db from "../../database/db";
import "./CategoryAnalysis.css";
import InsightsNav from "../../components/Insights/InsightsNav";
import IconAvatar from "../../components/IconAvatar/IconAvatar";

const COLORS = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#14B8A6",
    "#EC4899",
    "#6366F1",
];

function CategoryBarTooltip({ active, payload }) {
    if (!active || !payload?.length) {
        return null;
    }

    const category = payload[0].payload;

    return (
        <div className="category-bar-tooltip">
            <strong>{category.name}</strong>
            <strong>
                ₹{Number(category.value || 0).toLocaleString("en-IN")}
            </strong>
        </div>
    );
}

export default function CategoryAnalysis() {
    const { tripId } = useParams();
    const navigate = useNavigate();

    const [view, setView] = useState("pie");

    const [data, setData] = useState([]);

    const [selected, setSelected] = useState(null);

    const [summary, setSummary] = useState({
        totalSpent: 0,
        totalCategories: 0,
        totalTransactions: 0,
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const expenses = await db.expenses
            .where("tripId")
            .equals(tripId)
            .toArray();

        const categories =
            await db.expenseCategories.toArray();

        const grouped = {};
        const categoryMap = new Map();

        categories.forEach((category) => {
            categoryMap.set(category.id, category);
        });

        expenses.forEach((expense) => {
            const category = categoryMap.get(expense.categoryId);
            const name = category?.name || "Others";

            if (!grouped[name]) {
                grouped[name] = {
                    id: category?.id,
                    name,
                    icon: `/icons/categories/${name.toLowerCase()}.png`,
                    value: 0,
                    expenses: [],
                    transactionCount: 0,
                    largest: 0,
                    latest: null,
                };
            }

            grouped[name].value += Number(
                expense.amount || 0
            );

            grouped[name].transactionCount++;

            grouped[name].expenses.push(expense);

            if (
                Number(expense.amount || 0) >
                grouped[name].largest
            ) {
                grouped[name].largest = Number(
                    expense.amount || 0
                );
            }

            if (
                !grouped[name].latest ||
                new Date(expense.expenseTime) >
                new Date(grouped[name].latest.expenseTime)
            ) {
                grouped[name].latest = expense;
            }
        });

        const totalSpent = Object.values(grouped).reduce(
            (sum, item) => sum + item.value,
            0
        );

        const chartData = Object.values(grouped)
            .map((item) => ({
                ...item,
                average:
                    item.transactionCount === 0
                        ? 0
                        : Math.round(
                            item.value /
                            item.transactionCount
                        ),
                percent:
                    totalSpent === 0
                        ? 0
                        : Number(
                            (
                                (item.value / totalSpent) *
                                100
                            ).toFixed(1)
                        ),
            }))
            .sort((a, b) => b.value - a.value);

        setData(chartData);

        setSelected(chartData[0] || null);

        setSummary({
            totalSpent,
            totalCategories: chartData.length,
            totalTransactions: expenses.length,
        });
    }

    const recentExpenses = useMemo(() => {
        if (!selected) return [];

        return [...selected.expenses]
            .sort(
                (a, b) =>
                    new Date(b.expenseTime) -
                    new Date(a.expenseTime)
            )
            .slice(0, 5);
    }, [selected]);
    return (
        <div className="category-page">
            <InsightsNav />

            <div className="category-summary">

                <div className="summary-card">
                    <span>Total Spent</span>
                    <h2>
                        ₹
                        {summary.totalSpent.toLocaleString("en-IN")}
                    </h2>
                </div>

                <div className="summary-card">
                    <span>Categories</span>
                    <h2>{summary.totalCategories}</h2>
                </div>

                <div className="summary-card">
                    <span>Transactions</span>
                    <h2>{summary.totalTransactions}</h2>
                </div>

            </div>

            <div className="view-switch">

                <button
                    className={view === "pie" ? "active" : ""}
                    onClick={() => setView("pie")}
                >
                    🥧 Pie
                </button>

                <button
                    className={view === "bar" ? "active" : ""}
                    onClick={() => setView("bar")}
                >
                    📊 Bar
                </button>

                <button
                    className={view === "list" ? "active" : ""}
                    onClick={() => setView("list")}
                >
                    📋 List
                </button>

            </div>

            {view !== "list" && (
                <div className="chart-card">

                    <ResponsiveContainer
                        width="100%"
                        height={300}
                    >

                        {view === "pie" ? (

                            <PieChart>

                                <Pie
                                    data={data}
                                    dataKey="value"
                                    outerRadius={105}
                                    onClick={(entry) =>
                                        setSelected(entry)
                                    }
                                >
                                    {data.map((entry, index) => (
                                        <Cell
                                            key={entry.name}
                                            fill={
                                                COLORS[
                                                index %
                                                COLORS.length
                                                ]
                                            }
                                        />
                                    ))}
                                </Pie>

                                <Tooltip />

                            </PieChart>

                        ) : (

                            <BarChart data={data}>

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                />

                                <XAxis dataKey="name" />

                                <YAxis />

                                <Tooltip
                                    content={<CategoryBarTooltip />}
                                />

                                <Bar
                                    dataKey="value"
                                    radius={[8, 8, 0, 0]}
                                >
                                    {data.map(
                                        (entry, index) => (
                                            <Cell
                                                key={entry.name}
                                                fill={
                                                    COLORS[
                                                    index %
                                                    COLORS.length
                                                    ]
                                                }
                                            />
                                        )
                                    )}
                                </Bar>

                            </BarChart>

                        )}

                    </ResponsiveContainer>

                </div>
            )}

            <div className="category-grid">

                {data.map((item, index) => {

                    const selectedCard =
                        selected?.name === item.name;

                    return (

                        <div
                            key={item.name}
                            className={`category-card ${selectedCard ? "active" : ""
                                }`}
                            onClick={() =>
                                setSelected(item)
                            }
                        >

                            <div className="category-card-top">

                                <div className="category-icon">
                                    <IconAvatar
                                        icon={item.icon}
                                        name={item.name}
                                        size={48}
                                    />
                                </div>



                            </div>

                            <h3>{item.name}</h3>



                            

                            <div className="category-amount">
                                ₹{item.value.toLocaleString("en-IN")}
                            </div>

                            <div className="category-percent">
                                {item.percent}%
                            </div>
                        </div>

                    );

                })}

            </div>

            {selected && (

                <div className="details-card">

                    <h3>
                        {selected.name}
                    </h3>

                   <div className="detail-grid">

    <div className="detail-item">
        <span>Total Spent</span>
        <h4>₹{selected.value.toLocaleString("en-IN")}</h4>
    </div>

    <div className="detail-item">
        <span>Transactions</span>
        <h4>{selected.transactionCount}</h4>
    </div>

    <div className="detail-item">
        <span>Latest</span>
        <h4>
            {selected.latest
                ? new Date(selected.latest.expenseTime).toLocaleDateString("en-IN")
                : "--"}
        </h4>
    </div>

    <div className="detail-item">
        <span>Last Expense</span>
        <h4>
            ₹{selected.latest
                ? Number(selected.latest.amount).toLocaleString("en-IN")
                : "0"}
        </h4>
    </div>

</div>

                </div>

            )}

            {selected && (

                <div className="recent-card">

                    <div className="card-header">

                        <h3>
                            Recent{" "}
                            {selected.name} Expenses
                        </h3>

                        <button
                            onClick={() =>
                                navigate(
                                    `/reports/${tripId}/history?category=${encodeURIComponent(
                                        selected.name
                                    )}`
                                )
                            }
                        >
                            View History →
                        </button>

                    </div>

                    {recentExpenses.length === 0 ? (

                        <p>
                            No expenses available.
                        </p>

                    ) : (

                        recentExpenses.map(
                            (expense) => (

                                <div
                                    key={expense.id}
                                    className="recent-row"
                                >

                                    <div>

                                        <strong>

                                            {expense
                                                .selectedItems
                                                ?.length
                                                ? expense.selectedItems
                                                    .map(
                                                        (i) =>
                                                            i.name
                                                    )
                                                    .join(", ")
                                                : "Expense"}

                                        </strong>

                                        <small>

                                            {expense.locationName ||
                                                "Unknown"}

                                        </small>

                                    </div>

                                    <div
                                        className="right"
                                    >

                                        <strong>

                                            ₹
                                            {Number(
                                                expense.amount
                                            ).toLocaleString(
                                                "en-IN"
                                            )}

                                        </strong>

                                        <small>

                                            {expense.expenseTime
                                                ? new Date(
                                                    expense.expenseTime
                                                ).toLocaleDateString(
                                                    "en-IN"
                                                )
                                                : ""}

                                        </small>

                                    </div>

                                </div>

                            )
                        )

                    )}

                </div>

            )}

        </div>
    );
}
