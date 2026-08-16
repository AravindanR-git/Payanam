import { useEffect, useMemo, useState } from "react";
import {
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router-dom";
import InsightsNav from "../../components/Insights/InsightsNav";
import ExpenseRepository from "../../database/repositories/ExpenseRepository";
import db from "../../database/db";
import "./History.css";
import AddExpenseSheet from "../../components/AddExpenseSheet/AddExpenseSheet";
import TripRepository from "../../database/repositories/TripRepository";
import useLanguage from "../../i18n/useLanguage";


export default function History() {
    const { tripId } = useParams();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [searchParams] = useSearchParams();

    const [expenses, setExpenses] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(
        () => searchParams.get("category") || "All"
    );
    const [viewBy, setViewBy] = useState("Latest");
    const [menuOpen, setMenuOpen] = useState(null);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [showExpenseSheet, setShowExpenseSheet] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [trip, setTrip] = useState(null);

    useEffect(() => {
        loadData();
    }, []);
    async function handleDeleteExpense() {

        if (!selectedExpense) return;

        const confirmed = window.confirm(
            t("deleteExpenseConfirm")
        );

        if (!confirmed) return;

        await ExpenseRepository.deleteExpense(
            selectedExpense.id
        );

        setMenuOpen(null);

        setSelectedExpense(null);

        loadData();

    }
    useEffect(() => {
        const keyword = search.toLowerCase();

        let list = expenses.filter(expense => {

            const items =
                expense.selectedItems
                    ?.map(i => i.name)
                    .join(" ")
                    .toLowerCase() || "";

            const matchesSearch =
                items.includes(keyword) ||
                expense.categoryName
                    .toLowerCase()
                    .includes(keyword) ||
                (expense.locationName || "")
                    .toLowerCase()
                    .includes(keyword) ||
                (expense.note || "")
                    .toLowerCase()
                    .includes(keyword);

            const matchesCategory =
                selectedCategory === "All" ||
                expense.categoryName === selectedCategory;

            return matchesSearch && matchesCategory;
        });

        const now = new Date();

        switch (viewBy) {

            case "Oldest":

                list.sort(
                    (a, b) =>
                        new Date(a.expenseTime) -
                        new Date(b.expenseTime)
                );

                break;

            case "Highest":

                list.sort(
                    (a, b) =>
                        Number(b.amount) -
                        Number(a.amount)
                );

                break;

            case "Lowest":

                list.sort(
                    (a, b) =>
                        Number(a.amount) -
                        Number(b.amount)
                );

                break;

            case "Today":

                list = list.filter(expense => {

                    const d = new Date(expense.expenseTime);

                    return d.toDateString() === now.toDateString();

                });

                break;

            case "Yesterday":

                const yesterday = new Date();

                yesterday.setDate(now.getDate() - 1);

                list = list.filter(expense => {

                    const d = new Date(expense.expenseTime);

                    return d.toDateString() === yesterday.toDateString();

                });

                break;

            case "This Week":

                list = list.filter(expense => {

                    const diff =
                        (now - new Date(expense.expenseTime)) /
                        (1000 * 60 * 60 * 24);

                    return diff <= 7;

                });

                break;

            case "This Month":

                list = list.filter(expense => {

                    const d = new Date(expense.expenseTime);

                    return (
                        d.getMonth() === now.getMonth() &&
                        d.getFullYear() === now.getFullYear()
                    );

                });

                break;

            case "Morning":

            case "Afternoon":

            case "Evening":

            case "Night":

                list = list.filter(expense => {

                    const hour =
                        new Date(expense.expenseTime).getHours();

                    if (viewBy === "Morning")
                        return hour >= 5 && hour < 12;

                    if (viewBy === "Afternoon")
                        return hour >= 12 && hour < 17;

                    if (viewBy === "Evening")
                        return hour >= 17 && hour < 21;

                    return hour >= 21 || hour < 5;

                });

                break;

            default:

                list.sort(
                    (a, b) =>
                        new Date(b.expenseTime) -
                        new Date(a.expenseTime)
                );

        }

        setFiltered(list);

    }, [search, selectedCategory, expenses, viewBy

    ]);

    async function loadData() {
        const expenseList =
            await ExpenseRepository.getExpensesByTrip(tripId);
        const currentTrip =
            await TripRepository.getTrip(tripId);

        setTrip(currentTrip);

        const categoryList =
            await db.expenseCategories.toArray();

        const categoryMap = new Map();

        categoryList.forEach(category =>
          categoryMap.set(category.id, category.name)
        );

        const categoryIconMap = new Map();

        categoryList.forEach(category =>
          categoryIconMap.set(category.id, category.icon)
        );

        const data = expenseList.map(expense => ({
            ...expense,
            categoryName:
                categoryMap.get(expense.categoryId) || "Others",
            icon:
                categoryIconMap.get(expense.categoryId) ||
                "/icons/categories/others.png"
        }));
        setExpenses(data);
        setFiltered(data);

        // Show only categories that actually have expenses
        const usedCategoryIds = [...new Set(data.map(expense => expense.categoryId))];

        const usedCategories = categoryList.filter(category =>
            usedCategoryIds.includes(category.id)
        );

        setCategories(usedCategories);
    }
    function getDisplayDate(dateString) {

        const date = new Date(dateString);

        const today = new Date();

        const yesterday = new Date();

        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return t("today");
        }

        if (date.toDateString() === yesterday.toDateString()) {
            return t("yesterday");
        }

        return date.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "short",
        });

    }
    const groupedExpenses = filtered.reduce((groups, expense) => {

        const date = new Date(
            expense.expenseTime ||
            expense.updatedAt ||
            expense.createdAt
        ).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

        if (!groups[date]) {
            groups[date] = [];
        }

        groups[date].push(expense);

        return groups;

    }, {});

    return (
        <div className="history-page">

            <InsightsNav />

            <h2 className="history-title">
                {t("expenseHistory")}
            </h2>
            <div className="history-search">

                <span className="search-icon">🔍</span>

                <input
                    type="text"
                    placeholder={t("searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

            </div>
            <div className="history-filters">

                <button
                    className={
                        selectedCategory === "All"
                            ? "filter-chip active"
                            : "filter-chip"
                    }
                    onClick={() => setSelectedCategory("All")}
                >
                    {t("allCategories")}
                </button>

                {categories.map(category => (

                    <button
                        key={category.id}
                        className={
                            selectedCategory === category.name
                                ? "filter-chip active"
                                : "filter-chip"
                        }
                        onClick={() =>
                            setSelectedCategory(category.name)
                        }
                    >
                        {category.name}
                    </button>

                ))}

            </div>
            <div className="history-toolbar">

                <select
                    value={viewBy}
                    onChange={(e) => setViewBy(e.target.value)}
                    className="sort-select"
                >

                    <optgroup label={t("sort")}>

                        <option value="Latest">{t("latest")}</option>

                        <option value="Oldest">{t("oldest")}</option>

                        <option value="Highest">{t("highestAmount")}</option>

                        <option value="Lowest">{t("lowestAmount")}</option>

                    </optgroup>

                    <optgroup label={t("date")}>

                        <option value="Today">{t("today")}</option>

                        <option value="Yesterday">{t("yesterday")}</option>

                        <option value="This Week">{t("thisWeek")}</option>

                        <option value="This Month">{t("thisMonth")}</option>

                    </optgroup>

                    <optgroup label={t("time")}>

                        <option value="Morning">{t("morning")}</option>

                        <option value="Afternoon">{t("afternoon")}</option>

                        <option value="Evening">{t("evening")}</option>

                        <option value="Night">{t("night")}</option>

                    </optgroup>

                </select>

            </div>

            <div className="history-list">

                {Object.entries(groupedExpenses).map(([date, expenses]) => {

                    const total = expenses.reduce(
                        (sum, item) => sum + Number(item.amount || 0),
                        0
                    );

                    return (

                        <div key={date}>

                            <div className="history-date-header">

                                <div>

                                    <h3>{getDisplayDate(date)}</h3>

                                    <span>
                                        {date} • {expenses.length} {t("expensesCount")}
                                    </span>

                                </div>

                                <h2>
                                    ₹{total.toLocaleString("en-IN")}
                                </h2>

                            </div>

                            {expenses.map(expense => (

                                <div
                                    key={expense.id}
                                    className="history-card"
                                >

                                    <img
                                        src={expense.icon}
                                        alt=""
                                        className="history-icon"
                                    />

                                    <div className="history-content">

                                        <h3>
                                            {expense.selectedItems?.length
                                                ? expense.selectedItems
                                                    .map(i => i.name)
                                                    .join(", ")
                                                : t("expense")}
                                        </h3>

                                        <span>
                                            {expense.categoryName}
                                        </span>

                                        <small>
                                            📍 {expense.locationName || t("unknownLocation")}
                                        </small>

                                    </div>

                                    <div className="history-right">

                                        <h3>
                                            ₹{Number(expense.amount).toLocaleString("en-IN")}
                                        </h3>

                                        <span>
                                            {new Date(expense.expenseTime).toLocaleTimeString("en-IN", {
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}
                                        </span>

                                        <button
                                            className="menu-btn"
                                            onClick={() => {

                                                setSelectedExpense(expense);

                                                setMenuOpen(expense.id);

                                            }}
                                        >
                                            ⋮
                                        </button>

                                    </div>

                                </div>

                            ))}

                        </div>

                    );

                })}

            </div>
            {menuOpen && (

                <div
                    className="history-menu-overlay"
                    onClick={() => setMenuOpen(null)}
                >

                    <div
                        className="history-menu"
                        onClick={(e) => e.stopPropagation()}
                    >

                        <button
                            onClick={() => {

                                setMenuOpen(null);

                                setEditingExpense(selectedExpense);

                                setShowExpenseSheet(true);

                            }}
                        >
                            ✏️ {t("editExpense")}
                        </button>

                        <button
                            className="danger"
                            onClick={handleDeleteExpense}
                        >
                            🗑 {t("delete")}
                        </button>

                    </div>

                </div>

            )}
            <AddExpenseSheet
                isOpen={showExpenseSheet}
                expense={editingExpense}
                trip={trip}
                onClose={() => {
                    setShowExpenseSheet(false);
                    setEditingExpense(null);
                }}
                onExpenseSaved={async () => {
                    await loadData();
                    setShowExpenseSheet(false);
                    setEditingExpense(null);
                }}
            />

        </div>
    );
}
