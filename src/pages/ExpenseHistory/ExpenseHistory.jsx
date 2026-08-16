import "./ExpenseHistory.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import TripRepository from "../../database/repositories/TripRepository";
import ExpenseRepository from "../../database/repositories/ExpenseRepository";
import ParticipantRepository from "../../database/repositories/ParticipantRepository";
import CategoryRepository from "../../database/repositories/CategoryRepository";

import DetailsStep from "../../components/AddExpenseSheet/DetailsStep";
import BottomSheet from "../../components/BottomSheet/BottomSheet";
import useLanguage from "../../i18n/useLanguage";

function ExpenseHistory() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [trip, setTrip] = useState(null);

  const [expenses, setExpenses] = useState([]);

  const [selectedExpense, setSelectedExpense] =
    useState(null);

  const [selectedCategory, setSelectedCategory] =
    useState(null);

  const [selectedItems, setSelectedItems] =
    useState([]);

  const [showEditSheet, setShowEditSheet] =
    useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    const activeTrip =
      await TripRepository.getActiveTrip();

    if (!activeTrip) {
      navigate("/");
      return;
    }

    setTrip(activeTrip);

    const list =
      await ExpenseRepository.getRecentExpenses(
        activeTrip.id,
        500
      );

    const participants =
      await ParticipantRepository.getParticipantsByTrip(
        activeTrip.id
      );

    const expenseList = list.map((expense) => {
      const participant =
        participants.find(
          (p) =>
            p.id === expense.paidByParticipantId
        );

      return {
        ...expense,

        paidByName: participant
          ? participant.name
          : null,
      };
    });

    setExpenses(expenseList);
  };

  const openExpense = async (expense) => {
    setSelectedExpense(expense);

    const categories =
      await CategoryRepository.getCategories(null, trip?.userId);

    const category = categories.find(
      (c) => c.id === expense.categoryId
    );

    setSelectedCategory(category);

    setSelectedItems(
      expense.selectedItems || []
    );

    setShowEditSheet(true);
  };

  return (
    <div className="expense-history">
      <button
        className="back-btn"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={20} />
      </button>

      <h1>{t("expenseHistory")}</h1>

      {expenses.length === 0 ? (
        <div className="empty-card">
          {t("noExpensesFound")}
        </div>
      ) : (
        expenses.map((expense) => (
          <div
            key={expense.id}
            className="expense-history-card"
            onClick={() =>
              openExpense(expense)
            }
          >
            <div>
              <h3>
                {expense.selectedItems &&
                expense.selectedItems.length > 0
                  ? expense.selectedItems
                      .map(
                        (item) => item.name
                      )
                      .join(", ")
                  : t("expense")}
              </h3>

              <p>{expense.notes}</p>

              <small>
                {expense.paymentSource ===
                "fund"
                  ? "💰 Trip Fund"
                  : `👤 ${expense.paidByName || t("participant")}`}
              </small>

              <br />

              <small>
                {new Date(
                  expense.expenseTime
                ).toLocaleString("en-IN")}
              </small>
            </div>

            <h2>
              ₹
              {Number(
                expense.amount || 0
              ).toLocaleString("en-IN")}
            </h2>
          </div>
        ))
      )}

      <BottomSheet
        isOpen={showEditSheet}
        onClose={() =>
          setShowEditSheet(false)
        }
        title={t("editExpense")}
      >
        {trip &&
          selectedExpense &&
          selectedCategory && (
            <DetailsStep
              trip={trip}
              category={selectedCategory}
              selectedItems={selectedItems}
              expense={selectedExpense}
              onBack={() =>
                setShowEditSheet(false)
              }
              onClose={() => {
                setShowEditSheet(false);
                loadExpenses();
              }}
              onSaved={loadExpenses}
            />
          )}
      </BottomSheet>
    </div>
  );
}

export default ExpenseHistory;