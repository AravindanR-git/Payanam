import { useEffect, useState } from "react";
import Button from "../Button/Button";
import { MapPinned } from "lucide-react";
import "./DetailsStep.css";

import ParticipantRepository from "../../database/repositories/ParticipantRepository";
import ExpenseRepository from "../../database/repositories/ExpenseRepository";
import LocationService from "../../services/LocationService";
import BottomSheet from "../BottomSheet/BottomSheet";
import ManualLocationSheet from "./ManualLocationSheet";

function DetailsStep({
  trip,
  category,
  selectedItems = [],
  expense = null,
  onBack,
  onClose,
  onSaved,
}) {
  const [amount, setAmount] = useState(
    expense?.amount || ""
  );

  const [notes, setNotes] = useState(
    expense?.notes || ""
  );
  const [showManualLocation, setShowManualLocation] =
    useState(false);

  const [participants, setParticipants] =
    useState([]);

  const [paymentSource, setPaymentSource] =
    useState(
      expense?.paymentSource || "fund"
    );

  const [
    paidByParticipantId,
    setPaidByParticipantId,
  ] = useState(
    expense?.paidByParticipantId || ""
  );
  const [location, setLocation] = useState({
    latitude: expense?.latitude ?? null,
    longitude: expense?.longitude ?? null,
    locationName: expense?.locationName ?? "",
  });

  const [loadingLocation, setLoadingLocation] =
    useState(false);

  useEffect(() => {
    loadParticipants();

    if (!expense) {
      loadLocation();
    }
  }, []);

  const loadParticipants = async () => {
    const list =
      await ParticipantRepository.getParticipantsByTrip(
        trip.id
      );

    setParticipants(list);

    if (!expense && list.length > 0) {
      setPaidByParticipantId(list[0].id);
    }
  };
  const loadLocation = async (forceRefresh = false) => {
    setLoadingLocation(true);

    try {
      const currentLocation =
        await LocationService.getCurrentLocation(forceRefresh);

      // No location
      if (!currentLocation.latitude) {
        setLocation({
          latitude: null,
          longitude: null,
          locationName: "",
          accuracy: null,
          source: "unknown",
        });
        return;
      }




      setLocation(currentLocation);
    } catch (err) {
      console.error(err);

      setLocation({
        latitude: null,
        longitude: null,
        locationName: "",
        accuracy: null,
        source: "unknown",
      });
    } finally {
      setLoadingLocation(false);
    }
  };

  const saveExpense = async () => {
    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const expenseData = {
      latitude: location.latitude,
      longitude: location.longitude,
      locationName: location.locationName,
      amount: Number(amount),

      notes,

      paymentSource,

      paidByParticipantId:
        paymentSource === "participant"
          ? paidByParticipantId
          : null,
    };

    if (expense) {
      await ExpenseRepository.updateExpense(
        expense.id,
        expenseData
      );
    } else {
      await ExpenseRepository.createExpense({
        tripId: trip.id,

        categoryId: category.id,

        categoryName: category.name,

        selectedItems,

        expenseTime:
          new Date().toISOString(),

        ...expenseData,
      });
    }

    if (onSaved) {
      await onSaved();
    }

    onClose();
  };

  const deleteExpense = async () => {
    if (!expense) return;

    const ok = window.confirm(
      "Delete this expense?"
    );

    if (!ok) return;

    await ExpenseRepository.deleteExpense(
      expense.id
    );

    if (onSaved) {
      await onSaved();
    }

    onClose();
  };

  return (
    <div className="details-step">
      <button
        type="button"
        className="back-step-btn"
        onClick={onBack}
      >
        ← Back
      </button>

      <h3 className="details-title">
        {category?.name}
      </h3>

      {selectedItems.length > 0 && (
        <div className="details-card">
          <h4 className="section-title">
            Selected Items
          </h4>

          <div className="items-container">
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="item-chip"
              >
                {item.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="details-card amount-card">
        <h4 className="section-title">
          Expense Amount
        </h4>

        <input
          className="amount-input"
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value)
          }
        />
      </div>

      <div className="details-card">
        <h4 className="section-title">
          Notes
        </h4>

        <textarea
          className="notes-input"

          placeholder="Description (Optional)"
          value={notes}
          onChange={(e) =>
            setNotes(e.target.value)
          }
        />
      </div>

      <div className="details-card">
        <h4 className="section-title">
          Money Source
        </h4>

        <div className="payment-toggle">
          <button
            type="button"
            className={`payment-btn ${paymentSource === "fund"
              ? "active"
              : ""
              }`}
            onClick={() =>
              setPaymentSource("fund")
            }
          >
            💰 Trip Fund
          </button>

          <button
            type="button"
            className={`payment-btn ${paymentSource ===
              "participant"
              ? "active"
              : ""
              }`}
            onClick={() =>
              setPaymentSource(
                "participant"
              )
            }
          >
            👤 Personal
          </button>
        </div>

        {paymentSource ===
          "participant" && (
            <select
              className="sheet-input"
              value={
                paidByParticipantId
              }
              onChange={(e) =>
                setPaidByParticipantId(
                  e.target.value
                )
              }
            >
              {participants.map(
                (participant) => (
                  <option
                    key={
                      participant.id
                    }
                    value={
                      participant.id
                    }
                  >
                    {participant.name}
                  </option>
                )
              )}
            </select>
          )}
      </div>
      <div className="details-card">
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
          }}
        >
          <div className="location-header">
            <MapPinned
              size={20}
              color="#2563eb"
            />
            <span>Location</span>
          </div>
          {!expense &&
            !loadingLocation &&
            !location.latitude && (
              <div className="location-actions">
                <button
                  type="button"
                  onClick={() => loadLocation(true)}
                  className="link-btn"
                >
                  Retry
                </button>

                <button
                  type="button"
                  className="link-btn"
                  onClick={() =>
                    setShowManualLocation(true)
                  }
                >
                  Enter manually
                </button>
              </div>
            )}
        </div>

        <div className="location-text">
          {loadingLocation
            ? "📍 Detecting location..."
            : location.locationName || "📍 Location unavailable"}
        </div>


      </div>

            <div className="save-bar">
        <button
          className="save-btn"
          onClick={saveExpense}
        >
          {expense
            ? "Update Expense"
            : "Save Expense"}
        </button>
      </div>

      {expense && (
        <div className="delete-btn">
          <Button
            variant="danger"
            onClick={deleteExpense}
          >
            Delete Expense
          </Button>
        </div>
      )}

      <BottomSheet
        isOpen={showManualLocation}
        onClose={() =>
          setShowManualLocation(false)
        }
      >
        <ManualLocationSheet
          onCancel={() =>
            setShowManualLocation(false)
          }
          onSave={(manualLocation) => {
            setLocation(manualLocation);
            setShowManualLocation(false);
          }}
        />
      </BottomSheet>
    </div>
  );
}

export default DetailsStep;