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

const TEMPLE_OPTIONS = ["Sabarimala", "Tirumala", "Custom Temple"];

function ThiruPayanam() {
  const navigate = useNavigate();
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
      alert("Enter the temple name.");
      return;
    }

    if (!journeyName.trim()) {
      alert("Enter a journey name.");
      return;
    }

    if (pilgrims.length === 0) {
      alert("Add at least one pilgrim.");
      return;
    }

    setIsCreating(true);

    try {
      const trip = await TripRepository.createTrip({
        userId: "demo-user",
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
      alert("Unable to create the temple journey.");
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
        title="Thiru Payanam"
        subtitle="Plan a temple journey and its shared expenses"
      />

      <Card className="temple-setup-card">
        <div className="temple-title-row">
          <Landmark size={22} />
          <h2>Temple Details</h2>
        </div>

        <label className="temple-field-label">Temple</label>
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
            label="Temple Name"
            value={customTempleName}
            placeholder="Eg. Arupadai Veedu or Thiruvannamalai"
            onChange={(event) => setCustomTempleName(event.target.value)}
          />
        )}

        <Input
          label="Journey Name"
          value={journeyName}
          placeholder={`${templeName || "Temple"} Pilgrimage`}
          onChange={(event) => setJourneyName(event.target.value)}
        />

        <Input
          label="Contribution Per Person"
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
        nameLabel="Pilgrim Name"
        namePlaceholder="Enter pilgrim name"
        defaultAdults={1}
      />

      <Card className="temple-summary-card">
        <h3>Journey Summary</h3>
        <div><span>Pilgrim entries</span><strong>{pilgrims.length}</strong></div>
        <div><span>Total people</span><strong>{totalPeople}</strong></div>
        <div className="temple-summary-total">
          ₹{totalCollected.toLocaleString("en-IN")}
        </div>
      </Card>

      <div className="create-button">
        <Button fullWidth disabled={isCreating} onClick={createJourney}>
          {isCreating ? "Creating Journey..." : "Create Temple Journey"}
        </Button>
      </div>
    </div>
  );
}

export default ThiruPayanam;
