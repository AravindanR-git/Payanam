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
import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import EmailCallback from "./pages/EmailCallback/EmailCallback";
import Profile from "./pages/Profile/Profile";

import RequireAuth from "./components/RequireAuth";

import { seedDatabase } from "./database/seed/seedDatabase";
import ExpenseRepository from "./database/repositories/ExpenseRepository";
import SyncService from "./services/syncService";

function App() {

  useEffect(() => {

    seedDatabase();

  }, []);

  useEffect(() => {
    let cleanup;

    const startSync = async () => {
      cleanup = await SyncService.startAutoSync();
    };

    startSync();

    return () => {
      if (cleanup) cleanup();
    };
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

              <Route path="/login" element={<Login />} />

              <Route path="/signup" element={<Signup />} />

              <Route path="/forgot-password" element={<ForgotPassword />} />

              <Route path="/email-callback" element={<EmailCallback />} />

              <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />

              <Route
                path="/create-trip"
                element={<RequireAuth><CreateTrip /></RequireAuth>}
              />

              <Route
                path="/journey-setup"
                element={<RequireAuth><JourneySetup /></RequireAuth>}
              />

              <Route
                path="/thiru-payanam"
                element={<RequireAuth><ThiruPayanam /></RequireAuth>}
              />

              <Route
                path="/journey"
                element={<RequireAuth><Journey /></RequireAuth>}
              />

              <Route
                path="/expense-history"
                element={<RequireAuth><ExpenseHistory /></RequireAuth>}
              />
              <Route path="/history" element={<RequireAuth><TripHistory /></RequireAuth>} />
              <Route
                path="/reports/:tripId/overview"
                element={<RequireAuth><Overview /></RequireAuth>}
              />

              <Route
                path="/reports/:tripId/categories"
                element={<RequireAuth><CategoryAnalysis /></RequireAuth>}
              />

              <Route
                path="/reports/:tripId/daywise"
                element={<RequireAuth><DayWiseAnalysis /></RequireAuth>}
              />

              <Route
                path="/reports/:tripId/location"
                element={<RequireAuth><LocationAnalysis /></RequireAuth>}
              />

              <Route
                path="/reports/:tripId/members"
                element={<RequireAuth><MemberInsights /></RequireAuth>}
              />

              <Route
                path="/reports/:tripId/timeline"
                element={<RequireAuth><Timeline /></RequireAuth>}
              />

              <Route
                path="/reports/:tripId/ai"
                element={<RequireAuth><AIInsights /></RequireAuth>}
              />

              <Route
                path="/reports/:tripId/history"
                element={<RequireAuth><History /></RequireAuth>}
              />

              <Route
                path="/participants"
                element={<RequireAuth><Participants /></RequireAuth>}
              />

              <Route
                path="/settings"
                element={<RequireAuth><Settings /></RequireAuth>}
              />

              <Route
                path="/profile"
                element={<RequireAuth><Profile /></RequireAuth>}
              />

              <Route
                path="/categories"
                element={<RequireAuth><Categories /></RequireAuth>}
              />

              <Route
                path="/items"
                element={<RequireAuth><Items /></RequireAuth>}
              />

              <Route
                path="/places"
                element={<RequireAuth><Places /></RequireAuth>}
              />

            </Routes>

          </BrowserRouter>

      </div>

    </div>


  );

}

export default App;
