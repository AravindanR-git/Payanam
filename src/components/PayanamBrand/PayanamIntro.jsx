import { useEffect, useState } from "react";
import PayanamLogo from "./PayanamLogo";
import "./PayanamBrand.css";

const INTRO_SEEN_KEY = "payanam_intro_seen";

function hasSeenIntro() {
  try {
    if (window.localStorage.getItem(INTRO_SEEN_KEY) === "true") return true;
    // Existing TripLedger installs already keep these preferences. Mark them
    // as seen so the one-time Payanam intro is reserved for fresh installs.
    const existingInstall = window.localStorage.getItem("tripledger-language") !== null
      || window.localStorage.getItem("tripledger-theme") !== null;
    if (existingInstall) window.localStorage.setItem(INTRO_SEEN_KEY, "true");
    return existingInstall;
  } catch {
    return true;
  }
}

export default function PayanamIntro() {
  const [visible, setVisible] = useState(() => !hasSeenIntro());

  useEffect(() => {
    if (!visible) return undefined;
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(INTRO_SEEN_KEY, "true");
      } catch {
        // A storage restriction must never prevent the app from opening.
      }
      setVisible(false);
    }, 1450);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="payanam-launch-screen" role="status" aria-label="Payanam">
      <div className="payanam-launch-glow" />
      <PayanamLogo className="payanam-launch-logo" />
    </div>
  );
}
