import "./App.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import Home from "./pages/Home/Home";
import CreateTrip from "./pages/CreateTrip/CreateTrip";
import JourneySetup from "./pages/JourneySetup/JourneySetup";
import ThiruPayanam from "./pages/ThiruPayanam/ThiruPayanam";
import Journey from "./pages/Journey/Journey";
import ExpenseHistory from "./pages/ExpenseHistory/ExpenseHistory";
import Participants from "./pages/Participants/Participants";

import Settings from "./pages/Settings/Settings";
import Categories from "./pages/Categories/Categories";
import Items from "./pages/Items/Items";
import Places from "./pages/Places/Places";

import { seedDatabase } from "./database/seed/seedDatabase";

function App() {

  useEffect(() => {

    seedDatabase();

  }, []);

  return (

    <div className="app-shell">

      <div className="app-content">

        <BrowserRouter>

          <Routes>

            <Route path="/" element={<Home />} />

            <Route
              path="/create-trip"
              element={<CreateTrip />}
            />

            <Route
              path="/journey-setup"
              element={<JourneySetup />}
            />

            <Route
              path="/thiru-payanam"
              element={<ThiruPayanam />}
            />

            <Route
              path="/journey"
              element={<Journey />}
            />

            <Route
              path="/expense-history"
              element={<ExpenseHistory />}
            />

            <Route
              path="/participants"
              element={<Participants />}
            />

            <Route
              path="/settings"
              element={<Settings />}
            />

            <Route
              path="/categories"
              element={<Categories />}
            />

            <Route
              path="/items"
              element={<Items />}
            />

            <Route
              path="/places"
              element={<Places />}
            />

          </Routes>

        </BrowserRouter>

      </div>

    </div>

  );

}

export default App;