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
  Home,
  CarFront,
  MapPin,
} from "lucide-react";

import Button from "../../components/Button/Button";

import TripRepository from "../../database/repositories/TripRepository";
import ParticipantRepository from "../../database/repositories/ParticipantRepository";
import ExpenseRepository from "../../database/repositories/ExpenseRepository";
import AddExpenseSheet from "../../components/AddExpenseSheet/AddExpenseSheet";
import AddPlaceSheet from "../../components/AddPlaceSheet/AddPlaceSheet";
import useLanguage from "../../i18n/useLanguage";
import { getTransportEstimate } from "../../utils/transportAccounting";
import { getIrumudiSummary, isSabarimalaTrip } from "../../utils/irumudi";

function Journey() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [trip, setTrip] = useState(null);

  const [participants, setParticipants] =
    useState([]);

  const [expenses, setExpenses] =
    useState([]);

  const [recentExpenses, setRecentExpenses] =
    useState([]);

  const [showExpenseSheet, setShowExpenseSheet] =
    useState(false);
  const [showPlaceSheet, setShowPlaceSheet] = useState(false);
  const [editingExpense, setEditingExpense] =
    useState(null);
  const [isEndingJourney, setIsEndingJourney] =
    useState(false);
  const [isLoadingJourney, setIsLoadingJourney] =
    useState(true);
  const transport = trip?.transport || null;
  const estimate = transport ? getTransportEstimate(transport, expenses) : null;
  const irumudiSummary = getIrumudiSummary(trip, participants);

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

      if (isSabarimalaTrip(activeTrip) && !activeTrip.irumudi?.setupCompleted) {
        navigate(`/irumudi/${activeTrip.id}`, { replace: true });
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
    } finally {
      setIsLoadingJourney(false);
    }
  };

  if (!trip || isLoadingJourney) {
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

  const spent = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const balance = collected - spent;

  const finishTrip = async () => {
    setIsEndingJourney(true);
    try { await TripRepository.endTrip(trip.id); navigate("/history"); }
    catch (error) { console.error(error); alert(t("unableToEndJourney")); }
    finally { setIsEndingJourney(false); }
  };

  const endJourney = () => {
    if (transport && transport.settlementStatus !== "FINALIZED") {
      alert("Transport settlement is not completed. Review and finalize it before ending the journey.");
      navigate(`/journey/${trip.id}/transport`);
      return;
    }
    if (window.confirm(t("endJourney"))) finishTrip();
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
      <div className="journey-header">
        <button
          className="back-btn"
          onClick={() => navigate("/")}
        >
          <ArrowLeft size={20} />
        </button>

        <button
          className="home-btn"
          onClick={() => navigate("/", { state: { skipHomeRedirect: true } })}
          title="Home Dashboard"
        >
          <Home size={20} />
        </button>
      </div>

      <h1>{trip.tripName}</h1>

      <p>
        {trip.tripType === "friends"
          ? t("friendsJourney")
          : trip.tripType === "temple"
            ? t("templeJourney")
            : t("familyJourney")}
      </p>

      <button
        className="add-expense-primary"
        onClick={() => {
          setEditingExpense(null);
          setShowExpenseSheet(true);
        }}
      >
        <Plus size={24} />
        {t("addExpense")}
      </button>

      <div className="balance-card">
        <div className="balance-item">
          <Wallet size={22} />

          <span>{t("collected")}</span>

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

          <span>{t("spent")}</span>

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

          <span>{t("balance")}</span>

          <h2>
            ₹
            {balance.toLocaleString(
              "en-IN"
            )}
          </h2>
        </div>
      </div>

      {isSabarimalaTrip(trip) && irumudiSummary && <section className="journey-irumudi-summary"><div><h3>Sabarimala Irumudi Collection</h3><small>Tracked separately from Trip Expenses</small></div><p>Collected <strong>₹{irumudiSummary.collectedAmount.toLocaleString("en-IN")}</strong> of ₹{irumudiSummary.expectedTotal.toLocaleString("en-IN")}</p><p>{irumudiSummary.paidCount} / {irumudiSummary.totalParticipants} paid · {irumudiSummary.pendingCount} pending</p><button type="button" onClick={() => navigate(`/irumudi/${trip.id}`)}>Manage Irumudi</button></section>}

      <h3>{t("quickActions")}</h3>

      <div className="quick-grid">
        {transport && <button type="button" className="quick-card vehicle-quick-card" onClick={() => navigate(`/journey/${trip.id}/transport`)}>{transport.photo ? <img src={transport.photo} alt="" /> : <CarFront size={28} />}<span>Vehicle</span><strong>{transport.name}</strong><small>{transport.settlementStatus === "FINALIZED" ? "Vehicle settlement finalized" : "Vehicle expense likely"}</small><strong>₹{transport.settlementStatus === "FINALIZED" ? Number(transport.finalPayable || 0).toLocaleString("en-IN") : estimate.payable.toLocaleString("en-IN")}{transport.settlementStatus === "FINALIZED" ? "" : " approx."}</strong></button>}
        <button type="button" className="quick-card" onClick={() => setShowPlaceSheet(true)}><MapPin size={28} /><span>Add Place</span></button>
        <div
          className="quick-card"
          onClick={() =>
            navigate("/participants")
          }
        >
          <Users size={28} />
          <span>{t("participants")}</span>
        </div>

        <div
          className="quick-card"
          onClick={() =>
            navigate(`/reports/${trip.id}/overview`)
          }
        >
          <FileText size={28} />
          <span>{t("journeyInsights")}</span>
        </div>
      </div>

      <div className="recent">
        <h3>{t("recentExpenses")}</h3>

        {recentExpenses.length === 0 ? (
          <div className="expense-card">
            <p>{t("noExpensesYet")}</p>
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
      <AddPlaceSheet isOpen={showPlaceSheet} onClose={() => setShowPlaceSheet(false)} trip={trip} onSaved={loadJourney} />
    </div>
  );
}

export default Journey;
