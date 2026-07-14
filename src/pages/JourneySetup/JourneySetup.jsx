import "./JourneySetup.css";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/Button/Button";
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

  const createJourney = async  () => {
    if (!tripName.trim()) {
      alert("Please enter a trip name.");
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

    // Backend/localStorage will come later
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

} catch (error) {

  console.error(error);

  alert("Unable to create journey.");

}

    
  };

  return (
    <div className="journey-setup">

      <button
        className="back-btn"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={20} />
      </button>

      <h1>Start a New Journey</h1>

      <div className="form-group">

        <label>Journey Name</label>

        <input
          type="text"
          placeholder="Ooty Trip 2026"
          value={tripName}
          onChange={(e) => setTripName(e.target.value)}
        />

      </div>

      <div className="form-group">

        <label>Journey Type</label>

        <div className="toggle">

          <button
            type="button"
            className={
              tripGroup === "friends"
                ? "active"
                : ""
            }
            onClick={() =>
              setTripGroup("friends")
            }
          >
            Friends
          </button>

          <button
            type="button"
            className={
              tripGroup === "family"
                ? "active"
                : ""
            }
            onClick={() =>
              setTripGroup("family")
            }
          >
            Family
          </button>

        </div>

      </div>

      <div className="form-group">

        <label>
          Default Contribution Per Person
        </label>

        <input
          type="number"
          value={defaultContributionPerPerson}
          onChange={(e) =>
            setDefaultContributionPerPerson(
              Number(e.target.value)
            )
          }
        />

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

      <div className="summary-card">

        <h3>Journey Summary</h3>

        {tripGroup === "friends" ? (
          <>
            <p>
              Participants : {friends.length}
            </p>
          </>
        ) : (
          <>
            <p>
              Families : {families.length}
            </p>

            <p>
              Adults : {totalAdults}
            </p>

            <p>
              Children : {totalChildren}
            </p>

            <p>
              Total People :{" "}
              {totalAdults + totalChildren}
            </p>
          </>
        )}

        <hr />

        <h2>
          ₹
          {totalCollected.toLocaleString(
            "en-IN"
          )}
        </h2>

      </div>

      <Button onClick={createJourney}>
        Create Journey
      </Button>

    </div>
  );
}

export default JourneySetup;