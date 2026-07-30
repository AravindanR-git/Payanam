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
import Overview from "./pages/Reports/Overview";
import CategoryAnalysis from "./pages/Reports/CategoryAnalysis";
import DayWiseAnalysis from "./pages/Reports/DayWiseAnalysis";
import LocationAnalysis from "./pages/Reports/LocationAnalysis";
import MemberInsights from "./pages/Reports/MemberInsights";
import Timeline from "./pages/Reports/Timeline";
import AIInsights from "./pages/Reports/AIInsights";
import History from "./pages/Reports/History";
import TripHistory from "./pages/TripHistory/TripHistory";

import { seedDatabase } from "./database/seed/seedDatabase";
import ExpenseRepository from "./database/repositories/ExpenseRepository";

function App() {

  useEffect(() => {

    seedDatabase();

  }, []);

  useEffect(() => {
    const resolveManualLocations = () => {
      ExpenseRepository.resolveMissingManualLocations();
    };

    resolveManualLocations();

    window.addEventListener("online", resolveManualLocations);

    return () => {
      window.removeEventListener(
        "online",
        resolveManualLocations
      );
    };
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
            <Route path="/history" element={<TripHistory />} />
            <Route
              path="/reports/:tripId/overview"
              element={<Overview />}
            />

            <Route
              path="/reports/:tripId/categories"
              element={<CategoryAnalysis />}
            />

            <Route
              path="/reports/:tripId/daywise"
              element={<DayWiseAnalysis />}
            />

            <Route
              path="/reports/:tripId/location"
              element={<LocationAnalysis />}
            />

            <Route
              path="/reports/:tripId/members"
              element={<MemberInsights />}
            />

            <Route
              path="/reports/:tripId/timeline"
              element={<Timeline />}
            />

            <Route
              path="/reports/:tripId/ai"
              element={<AIInsights />}
            />

            <Route
              path="/reports/:tripId/history"
              element={<History />}
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
