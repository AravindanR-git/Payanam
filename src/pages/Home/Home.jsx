import "./Home.css";

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import Header from "../../components/Header/Header";
import Card from "../../components/Card/Card";
import Button from "../../components/Button/Button";
import ListItem from "../../components/ListItem/ListItem";

import {
  Plus,
  Clock3,
  User,
  Settings2,
  Languages,
} from "lucide-react";

function Home() {
  const navigate = useNavigate();

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
        description="Ready for your next journey?"
      />

      <Card>
        <div className="hero-card">

          <div className="hero-icon">
            🚗
          </div>

          <h2>No Active Journey</h2>

          <p>
            Start a Friends / Family Trip or
            a Thiru Payanam and manage every
            expense in one place.
          </p>

          <div className="hero-button">

            <Button onClick={() => navigate("/create-trip")}>
              <Plus size={18} />
              Create Trip
            </Button>

          </div>

        </div>
      </Card>

      <section className="quick-access">

        <h3>Quick Access</h3>

        <ListItem
          icon={<Clock3 size={20} />}
          title="Previous Trips"
          onClick={() => navigate("/history")}
        />

        <ListItem
          icon={<User size={20} />}
          title="Profile"
          onClick={() => navigate("/profile")}
        />

        <ListItem
          icon={<Settings2 size={20} />}
          title="Configuration"
          onClick={() => navigate("/configuration")}
        />

      </section>
    </motion.div>
  );
}

export default Home;