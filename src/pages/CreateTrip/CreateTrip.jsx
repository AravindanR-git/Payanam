import "./CreateTrip.css";
import { motion } from "framer-motion";
import { Users, Landmark, ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useLanguage from "../../i18n/useLanguage";
import TripRepository from "../../database/repositories/TripRepository";

function CreateTrip() {
    const navigate = useNavigate();
    const { t } = useLanguage();

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
                    onClick={() => navigate("/journey-setup")}
                >

                    <Users size={40} />

                    <h2>{t("friendsJourney")}</h2>

                    <span>
                        {t("vacationsRoadTripsOutings")}
                    </span>

                </div>

                <div
                    className="trip-card"
                    onClick={() => navigate("/thiru-payanam")}
                >

                    <Landmark size={40} />

                    <h2>{t("templeJourney")}</h2>

                    <span>
                        {t("templeSpiritualJourneys")}
                    </span>

                </div>

            </div>

        </motion.div>

    );

}

export default CreateTrip;
