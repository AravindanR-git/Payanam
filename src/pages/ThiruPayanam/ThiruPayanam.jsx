import "./ThiruPayanam.css";

import { useState } from "react";
import { ArrowLeft, Landmark } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/Button/Button";
import Card from "../../components/Card/Card";
import Input from "../../components/Input/Input";
import PageHeader from "../../components/PageHeader/PageHeader";
import FamilySection from "../../components/FamilySection/FamilySection";
import TripRepository from "../../database/repositories/TripRepository";
import ParticipantRepository from "../../database/repositories/ParticipantRepository";
import useLanguage from "../../i18n/useLanguage";
import { useAuth } from "../../contexts/useAuth";

const TEMPLE_OPTIONS = ["Sabarimala", "Tirumala", "Custom Temple"];

function ThiruPayanam() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [templeOption, setTempleOption] = useState("Sabarimala");
  const [customTempleName, setCustomTempleName] = useState("");
  const [journeyName, setJourneyName] = useState("");
  const [contributionPerPerson, setContributionPerPerson] =
    useState(1000);
  const [pilgrims, setPilgrims] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  const templeName =
    templeOption === "Custom Temple"
      ? customTempleName.trim()
      : templeOption;

  const totalPeople = pilgrims.reduce(
    (sum, pilgrim) =>
      sum + Number(pilgrim.adults || 0) + Number(pilgrim.children || 0),
    0
  );

  const totalCollected = pilgrims.reduce(
    (sum, pilgrim) => sum + Number(pilgrim.contribution || 0),
    0
  );

  const createJourney = async () => {
    if (!templeName) {
      alert(t("enterTempleName"));
      return;
    }

    if (!journeyName.trim()) {
      alert(t("enterJourneyName"));
      return;
    }

    if (pilgrims.length === 0) {
      alert(t("addAtLeastOnePilgrim"));
      return;
    }

    setIsCreating(true);

    try {
      const trip = await TripRepository.createTrip({
        userId: user?.id,
        tripName: journeyName.trim(),
        tripType: "temple",
        templeName,
        defaultContributionPerPerson: contributionPerPerson,
      });

      await ParticipantRepository.createMany(
        pilgrims.map((pilgrim) => ({
          tripId: trip.id,
          type: "pilgrim",
          name: pilgrim.familyName,
          adults: pilgrim.adults,
          children: pilgrim.children,
          memberCount:
            Number(pilgrim.adults || 0) +
            Number(pilgrim.children || 0),
          initialContribution: pilgrim.contribution,
        }))
      );

      navigate("/journey");
    } catch (error) {
      console.error(error);
      alert(t("unableToCreateTempleJourney"));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="thiru-payanam-page">
      <button
        type="button"
        className="back-button"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={20} />
      </button>

      <PageHeader
        title={t("thiruPayanam")}
        subtitle={t("planTempleJourney")}
      />

      <Card className="temple-setup-card">
        <div className="temple-title-row">
          <Landmark size={22} />
          <h2>{t("templeDetails")}</h2>
        </div>

        <label className="temple-field-label">{t("temple")}</label>
        <div className="temple-options">
          {TEMPLE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={
                templeOption === option
                  ? "temple-option active"
                  : "temple-option"
              }
              onClick={() => setTempleOption(option)}
            >
              {option}
            </button>
          ))}
        </div>

        {templeOption === "Custom Temple" && (
          <Input
            label={t("templeName")}
            value={customTempleName}
            placeholder={t("templeNamePlaceholder")}
            onChange={(event) => setCustomTempleName(event.target.value)}
          />
        )}

        <Input
          label={t("journeyName")}
          value={journeyName}
          placeholder={`${templeName || t("temple")} ${t("pilgrimage")}`}
          onChange={(event) => setJourneyName(event.target.value)}
        />

        <Input
          label={t("contributionPerPerson")}
          type="number"
          value={contributionPerPerson}
          onChange={(event) =>
            setContributionPerPerson(Number(event.target.value))
          }
        />
      </Card>

      <FamilySection
        families={pilgrims}
        setFamilies={setPilgrims}
        defaultContributionPerPerson={contributionPerPerson}
        groupLabel="Pilgrim"
        groupLabelPlural="Pilgrims"
        nameLabel={t("pilgrimName")}
        namePlaceholder={t("enterPilgrimName")}
        defaultAdults={1}
      />

      <Card className="temple-summary-card">
        <h3>{t("journeySummary")}</h3>
        <div><span>{t("pilgrimEntries")}</span><strong>{pilgrims.length}</strong></div>
        <div><span>{t("totalPeople")}</span><strong>{totalPeople}</strong></div>
        <div className="temple-summary-total">
          ₹{totalCollected.toLocaleString("en-IN")}
        </div>
      </Card>

      <div className="create-button">
        <Button fullWidth disabled={isCreating} onClick={createJourney}>
          {isCreating ? t("creatingJourney") : t("createTempleJourney")}
        </Button>
      </div>
    </div>
  );
}

export default ThiruPayanam;
