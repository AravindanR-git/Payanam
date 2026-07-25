import "./JourneySetup.css";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/Button/Button";
import Input from "../../components/Input/Input";
import SegmentedControl from "../../components/SegmentedControl/SegmentedControl";
import PageHeader from "../../components/PageHeader/PageHeader";
import JourneySummaryCard from "../../components/JourneySummaryCard/JourneySummaryCard";

import FriendsSection from "../../components/FriendsSection/FriendsSection";
import FamilySection from "../../components/FamilySection/FamilySection";

import TripRepository from "../../database/repositories/TripRepository";
import ParticipantRepository from "../../database/repositories/ParticipantRepository";

function JourneySetup() {
  const navigate = useNavigate();

  const [tripName, setTripName] = useState("");

  const [tripGroup, setTripGroup] = useState("friends");

  const [defaultContributionPerPerson, setDefaultContributionPerPerson] =
    useState(5000);

  const [friends, setFriends] = useState([]);

  const [families, setFamilies] = useState([]);

  const totalCollected =
    tripGroup === "friends"
      ? friends.reduce(
          (sum, item) => sum + Number(item.contribution || 0),
          0
        )
      : families.reduce(
          (sum, item) => sum + Number(item.contribution || 0),
          0
        );

  const totalAdults = families.reduce(
    (sum, item) => sum + Number(item.adults || 0),
    0
  );

  const totalChildren = families.reduce(
    (sum, item) => sum + Number(item.children || 0),
    0
  );

  const createJourney = async () => {
    if (!tripName.trim()) {
      alert("Please enter a journey name.");
      return;
    }

    if (tripGroup === "friends" && friends.length === 0) {
      alert("Please add at least one member.");
      return;
    }

    if (tripGroup === "family" && families.length === 0) {
      alert("Please add at least one family.");
      return;
    }

    try {
      const trip = await TripRepository.createTrip({
        userId: "demo-user",
        tripName,
        tripType: tripGroup,
        defaultContributionPerPerson,
      });

      if (tripGroup === "friends") {
        for (const member of friends) {
          await ParticipantRepository.createParticipant({
            tripId: trip.id,
            type: "friend",
            name: member.name,
            adults: 1,
            children: 0,
            initialContribution: member.contribution,
          });
        }
      } else {
        for (const family of families) {
          await ParticipantRepository.createParticipant({
            tripId: trip.id,
            type: "family",
            name: family.familyName,
            adults: family.adults,
            children: family.children,
            initialContribution: family.contribution,
          });
        }
      }

      navigate("/journey");
    } catch (err) {
      console.error(err);
      alert("Unable to create journey.");
    }
  };

  return (
    <div className="journey-page">

      <button
        className="back-button"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={20} />
      </button>

      <PageHeader
        title="Create Journey"
        subtitle="Set up your new trip"
      />

      <div className="journey-card">

        <Input
          label="Journey Name"
          value={tripName}
          placeholder="Ooty Friends Trip"
          onChange={(e) =>
            setTripName(e.target.value)
          }
        />

        <Input
          label="Contribution Per Person"
          type="number"
          value={defaultContributionPerPerson}
          onChange={(e) =>
            setDefaultContributionPerPerson(
              Number(e.target.value)
            )
          }
        />

        <div className="segment-block">

          <label className="segment-label">
            Journey Type
          </label>

          <SegmentedControl
            options={["Friends", "Family"]}
            value={
              tripGroup === "friends"
                ? "Friends"
                : "Family"
            }
            onChange={(value) =>
              setTripGroup(value.toLowerCase())
            }
          />

        </div>

      </div>

      {tripGroup === "friends" ? (
        <FriendsSection
          members={friends}
          setMembers={setFriends}
          defaultContributionPerPerson={
            defaultContributionPerPerson
          }
        />
      ) : (
        <FamilySection
          families={families}
          setFamilies={setFamilies}
          defaultContributionPerPerson={
            defaultContributionPerPerson
          }
        />
      )}

      <JourneySummaryCard
        tripGroup={tripGroup}
        friends={friends}
        families={families}
        totalAdults={totalAdults}
        totalChildren={totalChildren}
        totalCollected={totalCollected}
      />

      <div className="create-button">

        <Button
          fullWidth
          onClick={createJourney}
        >
          Create Journey
        </Button>

      </div>

    </div>
  );
}

export default JourneySetup;