import "./CreateTrip.css";
import { motion } from "framer-motion";
import { Users, Landmark, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useLanguage from "../../i18n/useLanguage";
import TripRepository from "../../database/repositories/TripRepository";
import PayanamTransition from "../../components/PayanamBrand/PayanamTransition";

function CreateTrip() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [journeyTarget, setJourneyTarget] = useState("");

    useEffect(() => {
        if (!journeyTarget) return undefined;
        const timeout = window.setTimeout(() => navigate(journeyTarget), 700);
        return () => window.clearTimeout(timeout);
    }, [journeyTarget, navigate]);

    const startJourneyFlow = (target) => {
        if (!journeyTarget) setJourneyTarget(target);
    };

    useEffect(() => {
        const guardActiveJourney = async () => {
            const activeTrip = await TripRepository.getActiveTrip();

            if (activeTrip) {
                navigate("/journey", { replace: true });
            }
        };

        guardActiveJourney();
    }, [navigate]);

    return (
        <motion.div
            className="create-trip"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: .3 }}
        >
            <button
                className="back-btn"
                onClick={() => navigate(-1)}
            >
                <ArrowLeft size={20} />
            </button>

            <h1>{t("createJourney")}</h1>

            <p>
                {t("chooseJourneyType")}
            </p>

            <div className="trip-types">

                <div
                    className="trip-card"
                    onClick={() => startJourneyFlow("/journey-setup")}
                >

                    <Users size={40} />

                    <h2>{t("friendsJourney")}</h2>

                    <span>
                        {t("vacationsRoadTripsOutings")}
                    </span>

                </div>

                <div
                    className="trip-card"
                    onClick={() => startJourneyFlow("/thiru-payanam")}
                >

                    <Landmark size={40} />

                    <h2>{t("templeJourney")}</h2>

                    <span>
                        {t("templeSpiritualJourneys")}
                    </span>

                </div>

            </div>
            {journeyTarget && <PayanamTransition />}

        </motion.div>

    );

}

export default CreateTrip;
