import "./Participants.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  Pencil,
  Trash2,
} from "lucide-react";

import TripRepository from "../../database/repositories/TripRepository";
import ParticipantRepository from "../../database/repositories/ParticipantRepository";
import ExpenseRepository from "../../database/repositories/ExpenseRepository";

import AddParticipantSheet from "../../components/AddParticipantSheet/AddParticipantSheet";

function Participants() {

  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);

  const [participants, setParticipants] = useState([]);

  const [showSheet, setShowSheet] = useState(false);

  const [selectedParticipant, setSelectedParticipant] =
    useState(null);

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {

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

    const expenses =
      await ExpenseRepository.getExpensesByTrip(
        activeTrip.id
      );

    const result = memberList.map((participant) => {

      const personalSpent = expenses
        .filter(
          (expense) =>
            expense.paymentSource === "participant" &&
            expense.paidByParticipantId === participant.id
        )
        .reduce(
          (sum, expense) =>
            sum + Number(expense.amount || 0),
          0
        );

      return {

        ...participant,

        personalSpent,

      };

    });

    setParticipants(result);

  };

  const totalPeople = participants.reduce(
    (sum, participant) =>
      sum + Number(participant.memberCount || 1),
    0
  );

  const deleteParticipant = async (id) => {

    const ok = window.confirm(
      "Delete this participant?"
    );

    if (!ok) return;

    await ParticipantRepository.deleteParticipant(id);

    loadParticipants();

  };

  return (

    <div className="participants-page">

      <button
        className="back-btn"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={20}/>
      </button>

      <h1>Participants</h1>

      <div className="participant-summary">

        <div className="summary-item">

          <span>Groups</span>

          <h2>{participants.length}</h2>

        </div>

        <div className="summary-item">

          <span>People</span>

          <h2>{totalPeople}</h2>

        </div>

      </div>

      {participants.map((participant) => (

        <div
          className="participant-card"
          key={participant.id}
        >

          <div className="avatar">

            {participant.name
              ? participant.name.charAt(0).toUpperCase()
              : "?"}

          </div>

          <div className="participant-content">

            <h3>{participant.name}</h3>

            {participant.memberCount > 1 && (

              <p className="family-info">

                👨 Adults: {participant.adults || 0}

                &nbsp;&nbsp;

                🧒 Children: {participant.children || 0}

                &nbsp;&nbsp;

                👥 Total: {participant.memberCount}

              </p>

            )}

            <div className="info-row">

              <span>Contribution</span>

              <strong>

                ₹{Number(
                  participant.initialContribution || 0
                ).toLocaleString("en-IN")}

              </strong>

            </div>

            <div className="info-row">

              <span>Personal Wallet</span>

              <strong>

                ₹{participant.personalSpent.toLocaleString("en-IN")}

              </strong>

            </div>

            <div className="info-row">

              <span>Status</span>

              <strong className="status">

                ✓ Contributed

              </strong>

            </div>

            <div className="action-row">

              <button
                className="icon-btn"
                onClick={() => {

                  setSelectedParticipant(
                    participant
                  );

                  setShowSheet(true);

                }}
              >

                <Pencil size={18}/>

              </button>

              <button
                className="icon-btn delete"
                onClick={() =>
                  deleteParticipant(
                    participant.id
                  )
                }
              >

                <Trash2 size={18}/>

              </button>

            </div>

          </div>

        </div>

      ))}

      <button
        className="floating-btn"
        onClick={() => {

          setSelectedParticipant(null);

          setShowSheet(true);

        }}
      >

        <UserPlus size={24}/>

      </button>

      {trip && (

        <AddParticipantSheet

          isOpen={showSheet}

          onClose={() => {

            setShowSheet(false);

            setSelectedParticipant(null);

          }}

          trip={trip}

          participant={selectedParticipant}

          onSaved={loadParticipants}

        />

      )}

    </div>

  );

}

export default Participants;