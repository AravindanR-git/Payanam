import PayanamLogo from "./PayanamLogo";
import "./PayanamBrand.css";

export default function PayanamTransition() {
  return (
    <div className="payanam-transition" role="status" aria-label="Starting your journey">
      <PayanamLogo className="payanam-transition-logo" />
    </div>
  );
}
