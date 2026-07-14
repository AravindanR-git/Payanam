import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import Home from "./pages/Home/Home";
import CreateTrip from "./pages/CreateTrip/CreateTrip";
import JourneySetup from "./pages/JourneySetup/JourneySetup";
import ThiruPayanam from "./pages/ThiruPayanam/ThiruPayanam";
import Journey from "./pages/Journey/Journey";
import ExpenseHistory from "./pages/ExpenseHistory/ExpenseHistory";
import Participants from "./pages/Participants/Participants";

import { seedDatabase } from "./database/seed/seedDatabase";

function App() {

  useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

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

      </Routes>
    </BrowserRouter>
  );
}

export default App;