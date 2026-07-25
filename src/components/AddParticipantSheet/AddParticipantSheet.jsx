import { useEffect, useState } from "react";

import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";

import ParticipantRepository from "../../database/repositories/ParticipantRepository";

function AddParticipantSheet({
  isOpen,
  onClose,
  trip,
  participant = null,
  onSaved,
}) {

  if (!trip) return null;

  const isFamilyTrip =
    trip.tripType === "family";

  const [name, setName] = useState("");

  const [adults, setAdults] = useState(1);

  const [children, setChildren] = useState(0);

  const [contribution, setContribution] =
    useState("");

  useEffect(() => {

    if (!isOpen) return;

    if (participant) {

      setName(participant.name || "");

      setAdults(participant.adults || 1);

      setChildren(participant.children || 0);

      setContribution(
        participant.initialContribution || ""
      );

    } else {

      setName("");

      setAdults(1);

      setChildren(0);

      setContribution("");

    }

  }, [participant, isOpen]);

  const saveParticipant = async () => {

    if (!name.trim()) {

      alert(
        isFamilyTrip
          ? "Enter family name."
          : "Enter friend name."
      );

      return;

    }

    const data = {

      name,

      adults:
        isFamilyTrip
          ? adults
          : null,

      children:
        isFamilyTrip
          ? children
          : null,

      memberCount:
        isFamilyTrip
          ? adults + children
          : 1,

      initialContribution:
        Number(contribution) || 0,

    };

    if (participant) {

      await ParticipantRepository.updateParticipant(

        participant.id,

        data

      );

    } else {

      await ParticipantRepository.createParticipant({

        tripId: trip.id,

        ...data,

      });

    }

    if (onSaved) {

      await onSaved();

    }

    onClose();

  };

  return (

    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={

        participant

          ? isFamilyTrip
            ? "Edit Family"
            : "Edit Friend"

          : isFamilyTrip
            ? "Add Family"
            : "Add Friend"

      }
    >

      <input
        className="sheet-input"
        placeholder={
          isFamilyTrip
            ? "Family Name"
            : "Friend Name"
        }
        value={name}
        onChange={(e)=>
          setName(e.target.value)
        }
      />

      {

        isFamilyTrip && (

          <>

            <div className="counter-card">

              <span>Adults</span>

              <div className="counter">

                <button
                  type="button"
                  onClick={() =>
                    setAdults(
                      Math.max(
                        1,
                        adults - 1
                      )
                    )
                  }
                >
                  -
                </button>

                <strong>

                  {adults}

                </strong>

                <button
                  type="button"
                  onClick={() =>
                    setAdults(
                      adults + 1
                    )
                  }
                >
                  +
                </button>

              </div>

            </div>

            <div className="counter-card">

              <span>Children</span>

              <div className="counter">

                <button
                  type="button"
                  onClick={() =>
                    setChildren(
                      Math.max(
                        0,
                        children - 1
                      )
                    )
                  }
                >
                  -
                </button>

                <strong>

                  {children}

                </strong>

                <button
                  type="button"
                  onClick={() =>
                    setChildren(
                      children + 1
                    )
                  }
                >
                  +
                </button>

              </div>

            </div>

          </>

        )

      }

      <input
        className="sheet-input"
        type="number"
        placeholder="Contribution"
        value={contribution}
        onChange={(e)=>
          setContribution(
            e.target.value
          )
        }
      />

      <Button
        onClick={saveParticipant}
      >

        {

          participant

            ? "Update Participant"

            : "Save Participant"

        }

      </Button>

    </BottomSheet>

  );

}

export default AddParticipantSheet;