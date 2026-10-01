import { useEffect, useState } from "react";
import Button from "../Button/Button";
import { MapPinned, Heart, User } from "lucide-react";
import "./DetailsStep.css";

import ParticipantRepository from "../../database/repositories/ParticipantRepository";
import ContributionRepository from "../../database/repositories/ContributionRepository";
import ExpenseRepository from "../../database/repositories/ExpenseRepository";
import LocationService from "../../services/LocationService";
import BottomSheet from "../BottomSheet/BottomSheet";
import ManualLocationSheet from "./ManualLocationSheet";
import SearchablePicker from "../SearchablePicker/SearchablePicker";
import useLanguage from "../../i18n/useLanguage";
import { availableDonors } from "../../utils/donorBalance";

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

  const [donors, setDonors] = useState([]);

  const [paidBy, setPaidBy] = useState(
    expense?.paidByDonorId
      ? { type: "donor", id: expense.paidByDonorId }
      : expense?.paidByParticipantId
        ? { type: "participant", id: expense.paidByParticipantId }
        : { type: "fund", id: null }
  );

  const [remainingSource, setRemainingSource] = useState("fund");
  const [remainingParticipantId, setRemainingParticipantId] = useState("");
  const [remainingDonorId, setRemainingDonorId] = useState("");

  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const [showDonorPicker, setShowDonorPicker] = useState(false);
  const [showRemainingPersonPicker, setShowRemainingPersonPicker] = useState(false);
  const [showRemainingDonorPicker, setShowRemainingDonorPicker] = useState(false);

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
    loadDonors();

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
  };

  const loadDonors = async () => {
    const contributions =
      await ContributionRepository.getByTrip(
        trip.id
      );

    const donorContributions = contributions.filter(
      (c) => c.donorName
    );

    const donorsWithAvailability = await Promise.all(
      donorContributions.map(async (donor) => {
        const available =
          await ExpenseRepository.getDonorAvailability(
            donor.id,
            { excludeExpenseId: expense?.id || null }
          );

        return {
          ...donor,
          available,
        };
      })
    );

    setDonors(availableDonors(donorsWithAvailability));
  };

  const selectedDonor = () => {
    if (paidBy.type !== "donor" || !paidBy.id) return null;
    return donors.find((d) => d.id === paidBy.id);
  };

  const donorPaymentAmount = () => {
    const total = Number(amount || 0);
    const donor = selectedDonor();
    if (!donor) return 0;
    return Math.min(total, donor.available);
  };

  const remainingAmount = () => {
    return Number(amount || 0) - donorPaymentAmount();
  };

  const isDonorInsufficient = () => {
    const donor = selectedDonor();
    if (!donor) return false;
    return donor.available < Number(amount || 0);
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

    const numericAmount = Number(amount);
    // Re-read balances at commit time so a stale sheet cannot spend money
    // another allocation has already consumed.
    const freshContributions = await ContributionRepository.getByTrip(trip.id);
    const freshDonors = await Promise.all(freshContributions.filter((c) => c.donorName).map(async (item) => ({
      ...item,
      available: await ExpenseRepository.getDonorAvailability(item.id, { excludeExpenseId: expense?.id || null }),
    })));
    const currentAvailableDonors = availableDonors(freshDonors);
    setDonors(currentAvailableDonors);
    const donor = paidBy.type === "donor" ? currentAvailableDonors.find((item) => item.id === paidBy.id) : null;
    if (paidBy.type === "donor" && !donor) {
      alert("This donor has no remaining balance. Select another payment source.");
      setPaidBy({ type: "fund", id: null });
      return;
    }
    const donorAmount = donor ? Math.min(numericAmount, donor.available) : 0;
    const remaining = numericAmount - donorAmount;

    if (donor && donor.available < numericAmount && remaining > 0) {
      if (remainingSource === "participant" && !remainingParticipantId) {
        alert(t("selectPersonForRemaining") || "Select a person for the remaining amount.");
        return;
      }
      if (remainingSource === "donor" && !remainingDonorId) {
        alert(t("selectDonorForRemaining") || "Select a donor for the remaining amount.");
        return;
      }
    }

    const finalAllocations = [];

    if (donor && donorAmount > 0) {
      finalAllocations.push({
        paymentSourceType: "donor",
        donorId: donor.id,
        participantId: null,
        amount: donorAmount,
      });
    }

    if (remaining > 0) {
      if (remainingSource === "fund") {
        finalAllocations.push({
          paymentSourceType: "fund",
          participantId: null,
          donorId: null,
          amount: remaining,
        });
      } else if (remainingSource === "participant") {
        finalAllocations.push({
          paymentSourceType: "participant",
          participantId: remainingParticipantId,
          donorId: null,
          amount: remaining,
        });
      } else if (remainingSource === "donor") {
        const remainingDonor = currentAvailableDonors.find((d) => d.id === remainingDonorId && d.id !== donor?.id);
        if (!remainingDonor) {
          alert("Select a different donor with an available balance for the remaining amount.");
          return;
        }
        const remainingDonorAmount = remainingDonor
          ? Math.min(remaining, remainingDonor.available)
          : remaining;
        finalAllocations.push({
          paymentSourceType: "donor",
          donorId: remainingDonorId,
          participantId: null,
          amount: remainingDonorAmount,
        });
      }
    }

    if (finalAllocations.length === 0) {
      finalAllocations.push({
        paymentSourceType: "fund",
        participantId: null,
        donorId: null,
        amount: numericAmount,
      });
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
      amount: numericAmount,

      notes,

      paymentSource:
        finalAllocations.length === 1
          ? finalAllocations[0].paymentSourceType
          : "split",

      paidByParticipantId:
        finalAllocations.find(
          (a) => a.paymentSourceType === "participant"
        )?.participantId || null,

      paidByDonorId:
        finalAllocations.find(
          (a) => a.paymentSourceType === "donor"
        )?.donorId || null,

      allocations: finalAllocations,
    };

    try {
      if (expense) {
        await ExpenseRepository.updateExpense(expense.id, expenseData);
      } else {
        await ExpenseRepository.createExpense({
          tripId: trip.id,
          userId: trip.userId,
          categoryId: category.id,
          categoryName: category.name,
          selectedItems,
          expenseTime: new Date().toISOString(),
          ...expenseData,
        });
      }
    } catch (error) {
      alert(error?.message || "Donor balance changed. Please review the allocation and try again.");
      await loadDonors();
      return;
    }

    await loadDonors();

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
          {t("paidBy")}
        </h4>

        <div className="paid-by-group">
          <button
            type="button"
            className={`paid-by-btn ${paidBy.type === "fund" ? "active" : ""}`}
            onClick={() => {
              setPaidBy({ type: "fund", id: null });
              setRemainingSource("fund");
            }}
          >
            💰 {t("tripFund")}
          </button>
        </div>

        <div className="paid-by-group">
          <span className="group-label">{t("persons")}</span>
          {paidBy.type === "participant" && paidBy.id ? (
            <button
              type="button"
              className={`paid-by-btn active ${paidBy.type === "participant" ? "active" : ""}`}
              onClick={() => setShowPersonPicker(true)}
            >
              👤 {participants.find((p) => p.id === paidBy.id)?.name || "Selected"}
            </button>
          ) : (
            <button
              type="button"
              className="paid-by-btn"
              onClick={() => setShowPersonPicker(true)}
            >
              <User size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
              {t("selectPerson") || "Select Person"}
            </button>
          )}
        </div>

        {donors.length > 0 && (
          <div className="paid-by-group">
            <span className="group-label">{t("donors")}</span>
            {paidBy.type === "donor" && paidBy.id ? (
              <button
                type="button"
                className={`paid-by-btn active donor-btn ${paidBy.type === "donor" ? "active" : ""}`}
                onClick={() => setShowDonorPicker(true)}
              >
                <Heart size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                {donors.find((d) => d.id === paidBy.id)?.donorName || "Selected"} — ₹
                {Number(donors.find((d) => d.id === paidBy.id)?.available || 0).toLocaleString("en-IN")}
              </button>
            ) : (
              <button
                type="button"
                className="paid-by-btn donor-btn"
                onClick={() => setShowDonorPicker(true)}
              >
                <Heart size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                {t("selectDonor") || "Select Donor"}
              </button>
            )}
          </div>
        )}

        {isDonorInsufficient() && remainingAmount() > 0 && (
          <div className="remaining-section">
            <div className="remaining-info">
              <span>{t("donorPays") || "Donor pays"}: ₹{donorPaymentAmount().toLocaleString("en-IN")}</span>
              <span className="remaining-amount">{t("remaining")}: ₹{remainingAmount().toLocaleString("en-IN")}</span>
            </div>

            <div className="remaining-source-toggle">
              <button
                type="button"
                className={`remaining-source-btn ${remainingSource === "fund" ? "active" : ""}`}
                onClick={() => {
                  setRemainingSource("fund");
                  setRemainingParticipantId("");
                  setRemainingDonorId("");
                }}
              >
                💰 {t("tripFund")}
              </button>
              <button
                type="button"
                className={`remaining-source-btn ${remainingSource === "participant" ? "active" : ""}`}
                onClick={() => setRemainingSource("participant")}
              >
                👤 {t("person")}
              </button>
              {donors.length > 0 && (
                <button
                  type="button"
                  className={`remaining-source-btn ${remainingSource === "donor" ? "active" : ""}`}
                  onClick={() => setRemainingSource("donor")}
                >
                  <Heart size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  {t("donor")}
                </button>
              )}
            </div>

{remainingSource === "participant" && (
              remainingParticipantId ? (
                <button
                  type="button"
                  className="remaining-selected"
                  onClick={() => setShowRemainingPersonPicker(true)}
                >
                  👤 {participants.find((p) => p.id === remainingParticipantId)?.name || "Selected"}
                </button>
              ) : (
                <button
                  type="button"
                  className="remaining-select-btn"
                  onClick={() => setShowRemainingPersonPicker(true)}
                >
                  <User size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  {t("selectPerson") || "Select Person"}
                </button>
              )
            )}

            {remainingSource === "donor" && (
              remainingDonorId ? (
                <button
                  type="button"
                  className="remaining-selected"
                  onClick={() => setShowRemainingDonorPicker(true)}
                >
                  <Heart size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  {donors.find((d) => d.id === remainingDonorId)?.donorName || "Selected"} — ₹
                  {Number(donors.find((d) => d.id === remainingDonorId)?.available || 0).toLocaleString("en-IN")}
                </button>
              ) : (
                <button
                  type="button"
                  className="remaining-select-btn"
                  onClick={() => setShowRemainingDonorPicker(true)}
                >
                  <Heart size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  {t("selectDonor") || "Select Donor"}
                </button>
              )
            )}
          </div>
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

      <SearchablePicker
        isOpen={showPersonPicker}
        onClose={() => setShowPersonPicker(false)}
        title={t("selectPerson") || "Select Person"}
        searchPlaceholder={t("searchPersons") || "Search people..."}
        items={participants}
        getItemKey={(p) => p.id}
        getItemLabel={(p) => p.name}
        getItemSecondary={() => undefined}
        getItemIcon={() => <User size={18} />}
        currentSelectedKey={paidBy.type === "participant" ? paidBy.id : null}
        onSelect={(p) => {
          setPaidBy({ type: "participant", id: p.id });
          setRemainingSource("fund");
        }}
        emptyText={t("noPersons") || "No persons found"}
      />

      <SearchablePicker
        isOpen={showDonorPicker}
        onClose={() => setShowDonorPicker(false)}
        title={t("selectDonor") || "Select Donor"}
        searchPlaceholder={t("searchDonors") || "Search donors..."}
        items={donors}
        getItemKey={(d) => d.id}
        getItemLabel={(d) => d.donorName}
        getItemSecondary={(d) => `₹${Number(d.available || 0).toLocaleString("en-IN")} available`}
        getItemIcon={() => <Heart size={18} />}
        currentSelectedKey={paidBy.type === "donor" ? paidBy.id : null}
        onSelect={(d) => {
          setPaidBy({ type: "donor", id: d.id });
          setRemainingSource("fund");
        }}
        emptyText={t("noDonors") || "No donors found"}
      />

      <SearchablePicker
        isOpen={showRemainingPersonPicker}
        onClose={() => setShowRemainingPersonPicker(false)}
        title={t("selectPerson") || "Select Person"}
        searchPlaceholder={t("searchPersons") || "Search people..."}
        items={participants}
        getItemKey={(p) => p.id}
        getItemLabel={(p) => p.name}
        getItemSecondary={() => undefined}
        getItemIcon={() => <User size={18} />}
        currentSelectedKey={remainingParticipantId || null}
        onSelect={(p) => setRemainingParticipantId(p.id)}
        emptyText={t("noPersons") || "No persons found"}
      />

      <SearchablePicker
        isOpen={showRemainingDonorPicker}
        onClose={() => setShowRemainingDonorPicker(false)}
        title={t("selectDonor") || "Select Donor"}
        searchPlaceholder={t("searchDonors") || "Search donors..."}
        items={donors.filter((d) => d.id !== (paidBy.type === "donor" ? paidBy.id : null))}
        getItemKey={(d) => d.id}
        getItemLabel={(d) => d.donorName}
        getItemSecondary={(d) => `₹${Number(d.available || 0).toLocaleString("en-IN")} available`}
        getItemIcon={() => <Heart size={18} />}
        currentSelectedKey={remainingDonorId || null}
        onSelect={(d) => setRemainingDonorId(d.id)}
        emptyText={t("noDonors") || "No donors found"}
      />
    </div>
  );
}

export default DetailsStep;
