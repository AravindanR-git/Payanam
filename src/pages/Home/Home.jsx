import "./Home.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock3,
  Languages,
  Play,
  Plus,
  Settings2,
  User,
} from "lucide-react";

import Header from "../../components/Header/Header";
import Card from "../../components/Card/Card";
import Button from "../../components/Button/Button";
import ListItem from "../../components/ListItem/ListItem";
import TripRepository from "../../database/repositories/TripRepository";
import useLanguage from "../../i18n/useLanguage";

function Home() {
  const navigate = useNavigate();
  const [activeTrip, setActiveTrip] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { language, t } = useLanguage();

  useEffect(() => {
    const loadActiveTrip = async () => {
      const trip = await TripRepository.getActiveTrip();
      setActiveTrip(trip);
      setIsLoading(false);
    };

    loadActiveTrip();
  }, []);

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

      <Header
        subtitle="Good Morning 👋"
        title="Aravin"
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
                <Button onClick={() => navigate("/journey")}>
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
          icon={<User size={20} />}
          title={t("profile")}
          onClick={() => navigate("/profile")}
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
