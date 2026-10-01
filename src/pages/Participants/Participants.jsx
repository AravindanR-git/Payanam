import "./Participants.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  Heart,
  Pencil,
  Trash2,
} from "lucide-react";

import TripRepository from "../../database/repositories/TripRepository";
import ParticipantRepository from "../../database/repositories/ParticipantRepository";
import ExpenseRepository from "../../database/repositories/ExpenseRepository";
import ContributionRepository from "../../database/repositories/ContributionRepository";
import PaymentAllocationRepository from "../../database/repositories/PaymentAllocationRepository";

import AddParticipantSheet from "../../components/AddParticipantSheet/AddParticipantSheet";
import AddDonorSheet from "../../components/AddDonorSheet/AddDonorSheet";
import ReassignmentSheet from "../../components/ReassignmentSheet/ReassignmentSheet";
import useLanguage from "../../i18n/useLanguage";
import { getIrumudiSummary, isSabarimalaTrip } from "../../utils/irumudi";
import { getIrumudiPeople } from "../../utils/irumudi";
import IrumudiRepository from "../../database/repositories/IrumudiRepository";

function Participants() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [trip, setTrip] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [donors, setDonors] = useState([]);
  const [showSheet, setShowSheet] = useState(false);
  const [showDonorSheet, setShowDonorSheet] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [selectedDonor, setSelectedDonor] = useState(null);

  const [showReassign, setShowReassign] = useState(false);
  const [reassignType, setReassignType] = useState(null);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [reassignAffected, setReassignAffected] = useState([]);
  const [reassignRemaining, setReassignRemaining] = useState(0);
  const [reassignRemainingLabel, setReassignRemainingLabel] = useState("");
  const [reassignDestinations, setReassignDestinations] = useState({});

  useEffect(() => {
    loadParticipants();
    loadDonors();
  }, []);

  async function loadParticipants() {
    const activeTrip = await TripRepository.getActiveTrip();

    if (!activeTrip) {
      navigate("/");
      return;
    }

    const memberList = await ParticipantRepository.getParticipantsByTrip(activeTrip.id);
    let currentTrip = activeTrip;
    if (isSabarimalaTrip(activeTrip) && activeTrip.irumudi) {
      const known = new Set(activeTrip.irumudi.participantPayments?.map((row) => row.key) || []);
      const hasNewPeople = getIrumudiPeople(memberList).some((person) => !known.has(person.key));
      if (hasNewPeople) {
        const irumudi = await IrumudiRepository.save(activeTrip.id, memberList, activeTrip.irumudi.amountPerPerson);
        currentTrip = { ...activeTrip, irumudi };
      }
    }
    setTrip(currentTrip);

    const expenses = await ExpenseRepository.getExpensesByTrip(activeTrip.id);

    const result = memberList.map((participant) => {
      const personalSpent = expenses
        .filter(
          (expense) =>
            expense.paymentSource === "participant" &&
            expense.paidByParticipantId === participant.id
        )
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

      return {
        ...participant,
        personalSpent,
      };
    });

    setParticipants(result);
  }

  async function loadDonors() {
    const activeTrip = await TripRepository.getActiveTrip();

    if (!activeTrip) {
      return;
    }

    const donorList = await ContributionRepository.getDonorsByTrip(activeTrip.id);

    setDonors(donorList);
  }

  const totalPeople = participants.reduce(
    (sum, participant) => sum + Number(participant.memberCount || 1),
    0
  );
  const irumudi = getIrumudiSummary(trip, participants);

  const deleteParticipant = async (participant) => {
    const hasFinancial = await ParticipantRepository.hasFinancialRecords(
      participant.id
    );

    if (!hasFinancial) {
      await ParticipantRepository.deleteParticipant(participant.id);
      loadParticipants();
      return;
    }

    const { allocations, contributions } =
      await ParticipantRepository.getFinancialReferences(participant.id);

    const affected = [];

    for (const alloc of allocations) {
      affected.push({
        id: alloc.id,
        amount: alloc.amount,
        description: alloc.paymentSourceType === "donor"
          ? t("paymentFromDonor")
          : t("paymentFromPerson"),
      });
    }

    for (const contrib of contributions) {
      affected.push({
        id: contrib.id,
        amount: contrib.amount,
        description: t("contributionRecord"),
      });
    }

    const initialDestinations = {};
    affected.forEach((_, idx) => {
      initialDestinations[idx] = { type: "fund", id: null };
    });

    setReassignType("participant");
    setReassignTarget(participant);
    setReassignAffected(affected);
    setReassignRemaining(0);
    setReassignRemainingLabel("");
    setReassignDestinations(initialDestinations);
    setShowReassign(true);
  };

  const deleteDonor = async (donor) => {
    const allocations =
      await PaymentAllocationRepository.getAllocationsByDonor(donor.id);

    if (allocations.length === 0) {
      await ContributionRepository.deleteDonation(donor.id);
      loadDonors();
      return;
    }

    const affected = allocations.map((alloc) => ({
      id: alloc.id,
      amount: alloc.amount,
      description: t("donorPaidExpense"),
    }));

    const remaining = await ExpenseRepository.getDonorAvailability(donor.id);

    const initialDestinations = {};
    affected.forEach((_, idx) => {
      initialDestinations[idx] = { type: "fund", id: null };
    });
    if (remaining > 0) {
      initialDestinations.remaining = { type: "fund", id: null };
    }

    setReassignType("donor");
    setReassignTarget(donor);
    setReassignAffected(affected);
    setReassignRemaining(remaining > 0 ? remaining : 0);
    setReassignRemainingLabel(t("remainingContribution"));
    setReassignDestinations(initialDestinations);
    setShowReassign(true);
  };

  const handleReassignConfirm = async (destinations) => {
    if (reassignType === "participant") {
      const reassignments = { allocations: [], contributions: [] };

      reassignAffected.forEach((item, idx) => {
        const dest = destinations[idx];
        if (item.description === t("paymentFromPerson") || item.description === t("paymentFromDonor")) {
          reassignments.allocations.push({
            allocationId: item.id,
            newType: dest.type,
            newId: dest.id,
          });
        } else {
          reassignments.contributions.push({
            contributionId: item.id,
            newType: dest.type,
            newId: dest.id,
          });
        }
      });

      await ParticipantRepository.deleteParticipantWithReassignment(
        reassignTarget.id,
        reassignments
      );
      loadParticipants();
    } else if (reassignType === "donor") {
      const remainingDest = destinations.remaining;
      const reassignments = [];

      reassignAffected.forEach((item, idx) => {
        const dest = destinations[idx];
        reassignments.push({
          allocationId: item.id,
          newType: dest.type,
          newId: dest.id,
        });
      });

      for (const r of reassignments) {
        await ExpenseRepository.reassignAllocation(
          r.allocationId,
          r.newType,
          r.newId
        );
      }

      if (remainingDest && reassignRemaining > 0) {
        if (remainingDest.type === "fund") {
          await ContributionRepository.deleteContribution(reassignTarget.id);
        } else if (remainingDest.type === "person") {
          await ContributionRepository.reassignContribution(
            reassignTarget.id,
            "participant",
            remainingDest.id
          );
        } else if (remainingDest.type === "donor") {
          await ContributionRepository.reassignContribution(
            reassignTarget.id,
            "donor",
            remainingDest.id
          );
        }
      } else {
        await ContributionRepository.deleteContribution(reassignTarget.id);
      }

      loadDonors();
    }

    setShowReassign(false);
    setReassignTarget(null);
    setReassignAffected([]);
  };

  return (
    <div className="participants-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
      </button>

      <div className="section-header">
        <h1>{t("participants")}</h1>
        <button
          className="section-add-btn"
          onClick={() => { setSelectedParticipant(null); setShowSheet(true); }}
        >
          <UserPlus size={18} />
          <span>{t("addParticipant")}</span>
        </button>
      </div>

      <div className="participant-summary">
        <div className="summary-item">
          <span>{t("groups")}</span>
          <h2>{participants.length}</h2>
        </div>

        <div className="summary-item">
          <span>{t("people")}</span>
          <h2>{totalPeople}</h2>
        </div>
      </div>

      {isSabarimalaTrip(trip) && trip.irumudi && irumudi && <section className="participant-irumudi-reminder">
        <div><strong>Sabarimala Irumudi</strong><span>{irumudi.paidCount} / {irumudi.totalParticipants} paid · {irumudi.pendingCount} pending</span>
          {irumudi.pendingPeople.length > 0 && <small>Pending: {irumudi.pendingPeople.map((person) => `${person.participantName} (${person.memberType} ${person.memberIndex})`).join(", ")}</small>}
        </div><button type="button" onClick={() => navigate(`/irumudi/${trip.id}`)}>Manage Collection</button>
      </section>}

      {participants.map((participant) => (
        <div className="participant-card" key={participant.id}>
          <div className="avatar">
            {participant.name ? participant.name.charAt(0).toUpperCase() : "?"}
          </div>

          <div className="participant-content">
            <h3>{participant.name}</h3>

            {participant.memberCount > 1 && (
              <p className="family-info">
                👨 {t("adults")}: {participant.adults || 0}
                &nbsp;&nbsp;
                🧒 {t("children")}: {participant.children || 0}
                &nbsp;&nbsp;
                👥 {t("total")}: {participant.memberCount}
              </p>
            )}

            <div className="info-row">
              <span>{t("contribution")}</span>
              <strong>₹{Number(participant.initialContribution || 0).toLocaleString("en-IN")}</strong>
            </div>

            <div className="info-row">
              <span>{t("personalWallet")}</span>
              <strong>₹{participant.personalSpent.toLocaleString("en-IN")}</strong>
            </div>

            <div className="info-row">
              <span>{t("status")}</span>
              <strong className="status">✓ {t("contributed")}</strong>
            </div>

            {isSabarimalaTrip(trip) && irumudi && (() => { const people = irumudi.people.filter((person) => person.participantId === participant.id); const paid = people.filter((person) => person.status === "paid").length; const pending = people.length - paid; return <div className="info-row participant-irumudi-status"><span>Irumudi</span><strong>{pending > 0 ? `Pending · ${paid}/${people.length} paid` : `Paid · ${paid}/${people.length}`}</strong></div>; })()}

            <div className="action-row">
              <button className="icon-btn" onClick={() => { setSelectedParticipant(participant); setShowSheet(true); }}>
                <Pencil size={18} />
              </button>

              <button className="icon-btn delete" onClick={() => deleteParticipant(participant)}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}

      <div className="section-header">
        <h2>{t("donors")}</h2>
        <button
          className="section-add-btn"
          onClick={() => setShowDonorSheet(true)}
        >
          <Heart size={16} />
          <span>{t("addDonor")}</span>
        </button>
      </div>

      {donors.length === 0 ? (
        <p className="donors-empty">{t("noDonors")}</p>
      ) : (
        donors.map((donor) => (
          <div className="donor-card" key={donor.id}>
            <div className="avatar donor-avatar">
              <Heart size={20} />
            </div>

            <div className="participant-content">
              <h3>{donor.donorName}</h3>

              <div className="info-row">
                <span>{t("donation")}</span>
                <strong>₹{Number(donor.amount || 0).toLocaleString("en-IN")}</strong>
              </div>

              {donor.donorNote && (
                <p className="donor-note">{donor.donorNote}</p>
              )}
            </div>

            <div className="action-row">
              <button
                className="icon-btn"
                onClick={() => {
                  setSelectedDonor(donor);
                  setShowDonorSheet(true);
                }}
              >
                <Pencil size={18} />
              </button>

              <button
                className="icon-btn delete"
                onClick={() => deleteDonor(donor)}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))
      )}

      {trip && (
        <AddParticipantSheet
          isOpen={showSheet}
          onClose={() => { setShowSheet(false); setSelectedParticipant(null); }}
          trip={trip}
          participant={selectedParticipant}
          onSaved={loadParticipants}
        />
      )}

      {trip && (
        <AddDonorSheet
          isOpen={showDonorSheet}
          onClose={() => {
            setShowDonorSheet(false);
            setSelectedDonor(null);
          }}
          trip={trip}
          donor={selectedDonor}
          onSaved={loadDonors}
        />
      )}

      {reassignTarget && (
        <ReassignmentSheet
          isOpen={showReassign}
          onClose={() => {
            setShowReassign(false);
            setReassignTarget(null);
            setReassignAffected([]);
          }}
          title={
            reassignType === "participant"
              ? t("deletePerson")
              : t("deleteDonor")
          }
          personName={
            reassignType === "participant"
              ? reassignTarget.name
              : reassignTarget.donorName
          }
          affectedItems={reassignAffected}
          availableDestinations={{
            persons: true,
            donors: reassignType === "donor",
          }}
          personsList={participants}
          donorsList={donors}
          currentDestinations={reassignDestinations}
          onConfirm={handleReassignConfirm}
          remainingAmount={reassignRemaining}
          remainingLabel={reassignRemainingLabel}
        />
      )}
    </div>
  );
}

export default Participants;
