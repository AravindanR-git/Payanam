import { useEffect, useState } from "react";

import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";

import ParticipantRepository from "../../database/repositories/ParticipantRepository";
import useLanguage from "../../i18n/useLanguage";

function AddParticipantSheet({
  isOpen,
  onClose,
  trip,
  participant = null,
  onSaved,
}) {
  const { t } = useLanguage();

  if (!trip) return null;

  const isFamilyTrip =
    trip.tripType === "family";

  const isTempleTrip =
    trip.tripType === "temple";

  const supportsCompanions =
    isFamilyTrip || isTempleTrip;

  const participantLabel =
    isTempleTrip
      ? t("pilgrim")
      : isFamilyTrip
        ? t("family")
        : t("friend");

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
        t("enterName", { label: participantLabel.toLowerCase() })
      );

      return;

    }

    const data = {

      name,

      adults:
        supportsCompanions
          ? adults
          : null,

      children:
        supportsCompanions
          ? children
          : null,

      memberCount:
        supportsCompanions
          ? adults + children
          : 1,

      type:
        isTempleTrip
          ? "pilgrim"
          : isFamilyTrip
            ? "family"
            : "friend",

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
        userId: trip.userId,

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

          ? `${t("edit")} ${participantLabel}`

          : `${t("add")} ${participantLabel}`

      }
    >

      <input
        className="sheet-input"
        placeholder={
          `${participantLabel} ${t("name")}`
        }
        value={name}
        onChange={(e)=>
          setName(e.target.value)
        }
      />

      {

        supportsCompanions && (

          <>

            <div className="counter-card">

              <span>{t("adults")}</span>

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

              <span>{t("children")}</span>

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
        placeholder={t("contribution")}
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

            ? `${t("update")} ${participantLabel}`

            : `${t("save")} ${participantLabel}`

        }

      </Button>

    </BottomSheet>

  );

}

export default AddParticipantSheet;
