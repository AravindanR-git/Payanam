import "./TripHistory.css";

import { useEffect, useState } from "react";
import { ArrowLeft, Play, ReceiptText } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/Button/Button";
import TripRepository from "../../database/repositories/TripRepository";
import ReportRepository from "../../database/repositories/ReportRepository";

function TripHistory() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [continuingTripId, setContinuingTripId] = useState(null);

  const loadTrips = async () => {
    setLoading(true);

    try {
      const completedTrips =
        await TripRepository.getCompletedTrips();

      const tripsWithSummary = await Promise.all(
        completedTrips.map(async (trip) => ({
          ...trip,
          summary: await ReportRepository.getOverview(trip.id),
        }))
      );

      setTrips(tripsWithSummary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const continueTrip = async (trip) => {
    const confirmed = window.confirm(
      "Continue this journey? You can add late expenses after reopening it."
    );

    if (!confirmed) return;

    setContinuingTripId(trip.id);

    try {
      await TripRepository.continueTrip(trip.id);
      navigate("/journey");
    } catch (error) {
      alert(error.message || "Unable to continue this journey.");
      setContinuingTripId(null);
    }
  };

  return (
    <div className="trip-history-page">
      <button
        type="button"
        className="back-btn"
        onClick={() => navigate("/")}
      >
        <ArrowLeft size={20} />
      </button>

      <h1>Previous Trips</h1>
      <p className="trip-history-subtitle">
        Completed journeys and their final balances.
      </p>

      {loading ? (
        <p className="trip-history-empty">Loading trips...</p>
      ) : trips.length === 0 ? (
        <div className="trip-history-empty">
          <ReceiptText size={34} />
          <h2>No completed journeys yet</h2>
          <p>End a journey to keep its summary here.</p>
        </div>
      ) : (
        <div className="trip-history-list">
          {trips.map((trip) => {
            const endedAt = trip.endedAt || trip.endDate;
            const canContinue =
              TripRepository.canContinueTrip(trip);

            return (
              <article key={trip.id} className="trip-history-card">
                <div className="trip-history-card-header">
                  <div>
                    <h2>{trip.tripName}</h2>
                    <span>
                      {trip.tripType === "temple"
                        ? "Temple Journey"
                        : `${trip.tripType === "family" ? "Family" : "Friends"} Journey`}
                    </span>
                  </div>
                  <span className="completed-badge">Completed</span>
                </div>

                <p className="trip-ended-date">
                  Ended {new Date(endedAt).toLocaleDateString("en-IN")}
                </p>

                <div className="trip-history-totals">
                  <div>
                    <span>Collected</span>
                    <strong>₹{trip.summary.collected.toLocaleString("en-IN")}</strong>
                  </div>
                  <div>
                    <span>Spent</span>
                    <strong>₹{trip.summary.spent.toLocaleString("en-IN")}</strong>
                  </div>
                  <div>
                    <span>Balance</span>
                    <strong>₹{trip.summary.balance.toLocaleString("en-IN")}</strong>
                  </div>
                </div>

                <div className="trip-history-actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      navigate(`/reports/${trip.id}/overview`)
                    }
                  >
                    View Insights
                  </Button>

                  {canContinue && (
                    <Button
                      size="sm"
                      disabled={continuingTripId === trip.id}
                      onClick={() => continueTrip(trip)}
                    >
                      <Play size={15} />
                      {continuingTripId === trip.id
                        ? "Continuing..."
                        : "Continue Journey"}
                    </Button>
                  )}
                </div>

                {canContinue && (
                  <p className="continue-window-note">
                    Available to continue for 24 hours after ending.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TripHistory;
