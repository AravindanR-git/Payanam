import "./Journey.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Wallet,
  Receipt,
  Landmark,
  Plus,
  Users,
  FileText,
} from "lucide-react";

import Button from "../../components/Button/Button";

import TripRepository from "../../database/repositories/TripRepository";
import ParticipantRepository from "../../database/repositories/ParticipantRepository";
import ExpenseRepository from "../../database/repositories/ExpenseRepository";
import AddExpenseSheet from "../../components/AddExpenseSheet/AddExpenseSheet";

function Journey() {
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);

  const [participants, setParticipants] =
    useState([]);

  const [expenses, setExpenses] =
    useState([]);

  const [recentExpenses, setRecentExpenses] =
    useState([]);

  const [showExpenseSheet, setShowExpenseSheet] =
    useState(false);
  const [editingExpense, setEditingExpense] =
    useState(null);
  const [isEndingJourney, setIsEndingJourney] =
    useState(false);

  useEffect(() => {
    loadJourney();
  }, []);

  const loadJourney = async () => {
    try {
      const activeTrip =
        await TripRepository.getActiveTrip();

      if (!activeTrip) {
        navigate("/");
        return;
      }

      setTrip(activeTrip);

      const memberList =
        await ParticipantRepository.getParticipantsByTrip(
          activeTrip.id
        );

      setParticipants(memberList);

      const expenseList =
        await ExpenseRepository.getExpensesByTrip(
          activeTrip.id
        );

      setExpenses(expenseList);

      setRecentExpenses(
        expenseList.slice(0, 5)
      );
    } catch (error) {
      console.error(error);
    }
  };

  if (!trip) {
    return (
      <div className="journey">
        <h2>Loading Journey...</h2>
      </div>
    );
  }

  const collected =
    participants.reduce(
      (sum, participant) =>
        sum +
        Number(
          participant.initialContribution || 0
        ),
      0
    );

  const spent =
    expenses.reduce(
      (sum, expense) =>
        sum +
        Number(expense.amount || 0),
      0
    );

  const balance = collected - spent;

  const endJourney = async () => {
    const confirmed = window.confirm(
      "End this journey? You can continue it for the next 24 hours if a late expense needs to be added."
    );

    if (!confirmed) return;

    setIsEndingJourney(true);

    try {
      await TripRepository.endTrip(trip.id);
      navigate("/history");
    } catch (error) {
      console.error(error);
      alert("Unable to end the journey. Please try again.");
    } finally {
      setIsEndingJourney(false);
    }
  };

  const totalPeople =
    participants.reduce(
      (total, participant) =>
        total +
        Number(
          participant.memberCount || 1
        ),
      0
    );

  return (
    <div className="journey">
      <button
        className="back-btn"
        onClick={() => navigate("/")}
      >
        <ArrowLeft size={20} />
      </button>

      <h1>{trip.tripName}</h1>

      <p>
        {trip.tripType === "friends"
          ? "Friends Journey"
          : trip.tripType === "temple"
            ? "Temple Journey"
            : "Family Journey"}
      </p>

      <div className="balance-card">
        <div className="balance-item">
          <Wallet size={22} />

          <span>Collected</span>

          <h2>
            ₹
            {collected.toLocaleString(
              "en-IN"
            )}
          </h2>
        </div>

        <div className="divider" />

        <div className="balance-item">
          <Receipt size={22} />

          <span>Spent</span>

          <h2>
            ₹
            {spent.toLocaleString(
              "en-IN"
            )}
          </h2>
        </div>

        <div className="divider" />

        <div className="balance-item">
          <Landmark size={22} />

          <span>Balance</span>

          <h2>
            ₹
            {balance.toLocaleString(
              "en-IN"
            )}
          </h2>
        </div>
      </div>

      <h3>Journey Details</h3>

      <div className="expense-card">
        <div>
          <h4>Participants</h4>

          <span>
            {participants.length} Group
            {participants.length !== 1
              ? "s"
              : ""}
            {" • "}
            {totalPeople} People
          </span>
        </div>

        <strong>👥</strong>
      </div>

      <h3>Quick Actions</h3>

      <div className="quick-grid">
        <div
          className="quick-card"
          onClick={() => {

            setEditingExpense(null);

            setShowExpenseSheet(true);

          }}
        >
          <Plus size={28} />
          <span>Add Expense</span>
        </div>

        <div
          className="quick-card"
          onClick={() =>
            navigate("/participants")
          }
        >
          <Users size={28} />
          <span>Participants</span>
        </div>

        <div
          className="quick-card"
          onClick={() =>
            navigate(`/reports/${trip.id}/overview`)
          }
        >
          <FileText size={28} />
          <span>Journey Insights</span>
        </div>
      </div>

      <div className="recent">
        <h3>Recent Expenses</h3>

        {recentExpenses.length === 0 ? (
          <div className="expense-card">
            <p>No expenses added yet.</p>
          </div>
        ) : (
          recentExpenses.map((expense) => (
            <div
              key={expense.id}
              className="expense-card"
            >
              <div>
                <h4>
                  {expense.selectedItems &&
                    expense.selectedItems.length >
                    0
                    ? expense.selectedItems
                      .map(
                        (item) => item.name
                      )
                      .join(", ")
                    : "Expense"}
                </h4>

                <span>
                  {expense.categoryName}

                  {" • "}

                  {new Date(
                    expense.expenseTime
                  ).toLocaleDateString(
                    "en-IN"
                  )}
                </span>
              </div>

              <strong>
                ₹
                {Number(
                  expense.amount || 0
                ).toLocaleString(
                  "en-IN"
                )}
              </strong>
            </div>
          ))
        )}
      </div>

      <Button
        fullWidth
        disabled={isEndingJourney}
        onClick={endJourney}
      >
        {isEndingJourney
          ? "Ending Journey..."
          : "End Journey"}
      </Button>

      <AddExpenseSheet
        isOpen={showExpenseSheet}
        onClose={() => {

          setShowExpenseSheet(false);

          setEditingExpense(null);

        }}
        trip={trip}
        expense={editingExpense}
        onExpenseSaved={loadJourney}
      />
    </div>
  );
}

export default Journey;
