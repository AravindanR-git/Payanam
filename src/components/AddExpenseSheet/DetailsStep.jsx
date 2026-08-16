import { useEffect, useState } from "react";
import Button from "../Button/Button";
import { MapPinned } from "lucide-react";
import "./DetailsStep.css";

import ParticipantRepository from "../../database/repositories/ParticipantRepository";
import ExpenseRepository from "../../database/repositories/ExpenseRepository";
import LocationService from "../../services/LocationService";
import BottomSheet from "../BottomSheet/BottomSheet";
import ManualLocationSheet from "./ManualLocationSheet";
import useLanguage from "../../i18n/useLanguage";

function DetailsStep({
  trip,
  category,
  selectedItems = [],
  expense = null,
  onBack,
  onClose,
  onSaved,
}) {
  const { t } = useLanguage();
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
    source: expense?.locationSource ?? "none",
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

      if (!currentLocation.latitude) {
        setLocation((previousLocation) =>
          previousLocation.latitude
            ? previousLocation
            : {
                latitude: null,
                longitude: null,
                locationName: "",
                accuracy: null,
                source: "none",
              }
        );
        return;
      }



      setLocation(currentLocation);
    } catch (err) {
      console.error(err);

      setLocation((previousLocation) =>
        previousLocation.latitude
          ? previousLocation
          : {
              latitude: null,
              longitude: null,
              locationName: "",
              accuracy: null,
              source: "none",
            }
      );
    } finally {
      setLoadingLocation(false);
    }
  };

  const saveExpense = async () => {
    if (!amount || Number(amount) <= 0) {
      alert(t("enterValidAmount"));
      return;
    }

    const expenseData = {
      latitude: location.latitude,
      longitude: location.longitude,
      locationName: location.locationName,

      locationSource:
        location.source === "manual"
          ? "manual"
          : location.source === "gps" ||
              location.latitude !== null
            ? "gps"
            : "none",
      amount: Number(amount),

      notes,

      paymentSource,

      paidByParticipantId:
        paymentSource === "participant"
          ? paidByParticipantId
          : null,
    };

    if (expense) {
      console.log("Updating expense:", expenseData);
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
      t("deleteExpenseConfirm")
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


  const isManualLocation =
    expense?.locationSource === "manual";

  const hasLocation =
    !!location.locationName;

  const canEditLocation =
    !expense ||
    isManualLocation ||
    !hasLocation;
  return (
    <div className="details-step">
      <button
        type="button"
        className="back-step-btn"
        onClick={onBack}
      >
        ← {t("back")}
      </button>

      <h3 className="details-title">
        {category?.name}
      </h3>

      {selectedItems.length > 0 && (
        <div className="details-card">
          <h4 className="section-title">
            {t("selectedItems")}
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
          {t("expenseAmount")}
        </h4>

        <input
          className="amount-input"
          type="number"
          placeholder={t("amount")}
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value)
          }
        />
      </div>

      <div className="details-card">
        <h4 className="section-title">
          {t("notes")}
        </h4>

        <textarea
          className="notes-input"

          placeholder={t("descriptionOptional")}
          value={notes}
          onChange={(e) =>
            setNotes(e.target.value)
          }
        />
      </div>

      <div className="details-card">
        <h4 className="section-title">
          {t("moneySource")}
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
            💰 {t("tripFund")}
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
            👤 {t("paidByPerson")}
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
            <span>{t("location")}</span>
          </div>
          {!loadingLocation && (
            <div className="location-actions">

              {!expense && (
                <button
                  type="button"
                  onClick={() => loadLocation(true)}
                  className="link-btn"
                >
                  {location.latitude
                    ? t("refreshGPS")
                    : t("retryGPS")}
                </button>
              )}

              {canEditLocation && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={() =>
                    setShowManualLocation(true)
                  }
                >
                  {hasLocation
                    ? t("editManualLocation")
                    : t("addManualLocation")}
                </button>
              )}

            </div>
          )}
        </div>

        <div className="location-text">
          {loadingLocation
            ? `📍 ${t("detectingLocation")}`
            : location.locationName || `📍 ${t("locationUnavailable")}`}
        </div>


      </div>

      <div className="save-bar">
        <button
          className="save-btn"
          onClick={saveExpense}
        >
          {expense
            ? t("updateExpense")
            : t("saveExpense")}
        </button>
      </div>

      {expense && (
        <div className="delete-btn">
          <Button
            variant="danger"
            onClick={deleteExpense}
          >
            {t("deleteExpense")}
          </Button>
        </div>
      )}

      <ManualLocationSheet
        isOpen={showManualLocation}
        onClose={() =>
          setShowManualLocation(false)
        }
        initialLocationName={
          location.locationName
        }
        coordinates={{
          latitude: location.latitude,
          longitude: location.longitude,
        }}
        onSave={(updatedLocation) => {
          setLocation({
            latitude: updatedLocation.latitude,
            longitude: updatedLocation.longitude,
            locationName: updatedLocation.locationName,
            source: "manual",
          });
          setShowManualLocation(false);
        }}
      />
    </div>
  );
}

export default DetailsStep;
