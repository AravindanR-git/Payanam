import "./ExpenseHistory.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import TripRepository from "../../database/repositories/TripRepository";
import ExpenseRepository from "../../database/repositories/ExpenseRepository";
import ParticipantRepository from "../../database/repositories/ParticipantRepository";
import CategoryRepository from "../../database/repositories/CategoryRepository";
import ItemRepository from "../../database/repositories/ItemRepository";

import DetailsStep from "../../components/AddExpenseSheet/DetailsStep";
import BottomSheet from "../../components/BottomSheet/BottomSheet";

function ExpenseHistory() {
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);

  const [expenses, setExpenses] = useState([]);

  const [selectedExpense, setSelectedExpense] =
    useState(null);

  const [selectedCategory, setSelectedCategory] =
    useState(null);

  const [selectedItem, setSelectedItem] =
    useState(null);

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
      await CategoryRepository.getCategories();

    const category = categories.find(
      (c) => c.id === expense.categoryId
    );

    setSelectedCategory(category);

    const items =
      await ItemRepository.getItems(
        expense.categoryId
      );

    const item = items.find(
      (i) => i.id === expense.itemId
    );

    setSelectedItem(item);

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

      <h1>Expense History</h1>

      {expenses.length === 0 ? (
        <div className="empty-card">
          No expenses found.
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
              <h3>{expense.itemName}</h3>

              <p>{expense.notes}</p>

              <small>
                {expense.paymentSource ===
                "fund"
                  ? "💰 Trip Fund"
                  : `👤 ${expense.paidByName}`}
              </small>

              <br />

              <small>
                {new Date(
                  expense.expenseTime
                ).toLocaleString()}
              </small>
            </div>

            <h2>
              ₹
              {Number(
                expense.amount
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
        title="Edit Expense"
      >
        {trip &&
          selectedExpense &&
          selectedCategory &&
          selectedItem && (
            <DetailsStep
              trip={trip}
              category={selectedCategory}
              item={selectedItem}
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