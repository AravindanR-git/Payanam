import "./TripHistory.css";

import { useEffect, useState } from "react";
import { ArrowLeft, Play, ReceiptText, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Button from "../../components/Button/Button";
import TripRepository from "../../database/repositories/TripRepository";
import ReportRepository from "../../database/repositories/ReportRepository";
import { generateTripPrintData, openTripPrintWindow } from "../../utils/tripPdfExport";
import useLanguage from "../../i18n/useLanguage";

function TripHistory() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
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
      t("continueJourney")
    );

    if (!confirmed) return;

    setContinuingTripId(trip.id);

    try {
      await TripRepository.continueTrip(trip.id);
      navigate("/journey");
    } catch (error) {
      console.error(error);
      alert(error.message || t("unableToContinueJourney"));
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

      <h1>{t("previousTrips")}</h1>
      <p className="trip-history-subtitle">
        {t("completedJourneys")}
      </p>

      {loading ? (
        <p className="trip-history-empty">{t("loading")}</p>
      ) : trips.length === 0 ? (
        <div className="trip-history-empty">
          <ReceiptText size={34} />
          <h2>{t("noCompletedJourneys")}</h2>
          <p>{t("endJourneyToKeepSummary")}</p>
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
                        ? t("templeJourney")
                        : `${trip.tripType === "family" ? t("family") : t("friends")} ${t("journey").toLowerCase()}`}
                    </span>
                  </div>
                  <span className="completed-badge">{t("ended")}</span>
                </div>

                <p className="trip-ended-date">
                  {t("endedAt")} {new Date(endedAt).toLocaleDateString("en-IN")}
                </p>

                <div className="trip-history-totals">
                  <div>
                    <span>{t("collected")}</span>
                    <strong>₹{trip.summary.collected.toLocaleString("en-IN")}</strong>
                  </div>
                  <div>
                    <span>{t("spent")}</span>
                    <strong>₹{trip.summary.spent.toLocaleString("en-IN")}</strong>
                  </div>
                  <div>
                    <span>{t("balance")}</span>
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
                    {t("viewInsights")}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      const insights = await ReportRepository.getAIInsights(trip.id);
                      const expenses = await ReportRepository.getOverview(trip.id);
                      const printData = generateTripPrintData(
                        insights.trip,
                        insights,
                        expenses.recentExpenses,
                        language
                      );
                      openTripPrintWindow(printData);
                    }}
                  >
                    <Printer size={15} />
                    {t("printReport")}
                  </Button>

                  {canContinue && (
                    <Button
                      size="sm"
                      disabled={continuingTripId === trip.id}
                      onClick={() => continueTrip(trip)}
                    >
                      <Play size={15} />
                      {continuingTripId === trip.id
                        ? t("continuingJourney")
                        : t("continueJourneyBtn")}
                    </Button>
                  )}
                </div>

                {canContinue && (
                  <p className="continue-window-note">
                    {t("availableToContinue")}
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
