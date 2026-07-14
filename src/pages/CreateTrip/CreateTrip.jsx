import "./CreateTrip.css";
import { motion } from "framer-motion";
import { Users, Landmark, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

function CreateTrip() {

    const navigate = useNavigate();

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

            <h1>Create Journey</h1>

            <p>
                Choose the type of journey
            </p>

            <div className="trip-types">

                <div
                    className="trip-card"
                    onClick={() => navigate("/journey-setup")}
                >

                    <Users size={40} />

                    <h2>Friends / Family</h2>

                    <span>
                        Vacations, Road Trips & Outings
                    </span>

                </div>

                <div
                    className="trip-card"
                    onClick={() => alert("Coming Soon")}
                >

                    <Landmark size={40} />

                    <h2>Thiru Payanam</h2>

                    <span>
                        Temple & Spiritual Journeys
                    </span>

                </div>

            </div>

        </motion.div>

    );

}

export default CreateTrip;