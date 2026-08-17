import "./Home.css";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock3,
  Languages,
  Play,
  Plus,
  Settings2,
  LogOut,
} from "lucide-react";

import Header from "../../components/Header/Header";
import Card from "../../components/Card/Card";
import Button from "../../components/Button/Button";
import ListItem from "../../components/ListItem/ListItem";
import TripRepository from "../../database/repositories/TripRepository";
import useLanguage from "../../i18n/useLanguage";
import { useAuth } from "../../contexts/useAuth";
import safeLogout from "../../services/safeLogout";
import { onTripChange } from "../../services/tripSyncEvents";

function getTimeBasedGreeting(t) {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return t("goodMorning") || "Good Morning";
  if (hour >= 12 && hour < 17) return t("goodAfternoon") || "Good Afternoon";
  if (hour >= 17 && hour < 21) return t("goodEvening") || "Good Evening";
  return t("goodNight") || "Good Night";
}

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTrip, setActiveTrip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();
  const { user, profile } = useAuth();

  useEffect(() => {
    const loadActiveTrip = async () => {
      const trip = await TripRepository.getActiveTrip();
      console.log('[Home] loadActiveTrip: trip=', trip ? { id: trip.id, name: trip.tripName, status: trip.status } : null);
      setActiveTrip(trip);
      setIsLoading(false);

      const skipRedirect =
        location.state?.skipHomeRedirect === true;

      if (trip && !skipRedirect) {
        navigate("/journey", { replace: true });
      }
    };

    loadActiveTrip();
  }, [navigate, location.state?.skipHomeRedirect]);

  useEffect(() => {
    const unsubscribe = onTripChange(async () => {
      const trip = await TripRepository.getActiveTrip();
      console.log('[Home] onTripChange: trip=', trip ? { id: trip.id, name: trip.tripName, status: trip.status } : null);
      setActiveTrip(trip);

      if (trip && location.pathname === "/") {
        navigate("/journey", { replace: true });
      }
    });

    return unsubscribe;
  }, [navigate, location.pathname]);

  const continueJourney = () => {
    navigate("/journey");
  };

  const handleLogout = async () => {
    await safeLogout();
    navigate("/login", { replace: true });
  };

  const displayName = profile?.display_name || user?.email || "User";
  const greeting = getTimeBasedGreeting(t);

  return (
    <motion.div
      className="home"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="language-switch">
        <Languages size={18} />
        <span>EN | தமிழ்</span>
      </div>

      <button className="home-logout-btn" onClick={handleLogout}>
        <LogOut size={18} />
      </button>

      <Header
        subtitle={greeting}
        title={displayName}
        description={
          activeTrip
            ? t("activeJourney")
            : t("readyJourney")
        }
      />

      {!isLoading && (
        <Card>
          <div className="hero-card">
            <div className="hero-icon">
              {activeTrip?.tripType === "temple" ? "🛕" : "🚗"}
            </div>

            <h2>
              {activeTrip
                ? activeTrip.tripName
                : t("noActiveJourney")}
            </h2>

            <p>
              {activeTrip
                ? "Continue your journey to add expenses, manage participants, and view insights."
                : "Start a Friends / Family Trip or a Thiru Payanam and manage every expense in one place."}
            </p>

            <div className="hero-button">
              {activeTrip ? (
                <Button onClick={continueJourney}>
                  <Play size={18} />
                  {t("continueJourney")}
                </Button>
              ) : (
                <Button onClick={() => navigate("/create-trip")}>
                  <Plus size={18} />
                  {t("createTrip")}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <section className="quick-access">
        <h3>{t("quickAccess")}</h3>

        <ListItem
          icon={<Clock3 size={20} />}
          title={t("previousTrips")}
          onClick={() => navigate("/history")}
        />

        <ListItem
          icon={<Settings2 size={20} />}
          title={t("settings")}
          onClick={() => navigate("/settings")}
        />
      </section>
    </motion.div>
  );
}

export default Home;
