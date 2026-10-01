import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Guide.css";
import PayanamLogo from "../../components/PayanamBrand/PayanamLogo";

const sections = [
  { id: "getting-started", title: "Getting Started", text: "Create a trip, choose Friends / Family or Thiru Payanam, then add the trip details and participants. Starting a journey opens its expense and trip-management tools." },
  { id: "participants", title: "Participants", text: "Add the adults and children travelling with you. Participant details are used in trip tracking and participant views; Sabarimala Irumudi collection tracks payment status per person." },
  { id: "expenses", title: "Expenses", text: "Record real spending with Add Expense, categories, and expense items. Only actual expenses entered through the expense system affect normal trip expense totals. Expense insights can show dates and locations when available." },
  { id: "transport", title: "Transport", text: "Save vehicles under Settings → Saved Vehicles, then add a vehicle to a trip. Agreements can use a rate per kilometre or package pricing, with distance and driver beta details. Choose which actual Transport expense items are included in the settlement. Vehicle expense likely is an estimate while the trip is active; it becomes a finalized settlement only when Transport is settled. Vehicle details saved to a trip are a snapshot, so later edits to a saved vehicle do not rewrite that trip." },
  { id: "places", title: "Places", text: "Save places with a category, photo, rating, notes, and trip association. GPS can locate the place; retry for another reading or open manual selection to search or move the pin and confirm corrected coordinates. Places Near Me uses your current location. Map tiles may be unavailable offline, but saving places does not require a network connection." },
  { id: "thirupayanam", title: "Thiru Payanam", text: "Create a Thiru Payanam for a walking journey. Transport is optional: leave it unset to keep the journey on foot, or add transport when needed. You can still record expenses and places, then complete the journey using its journey controls." },
  { id: "sabarimala", title: "Sabarimala & Irumudi", text: "Irumudi collection uses one fixed amount per participant; adult or child status does not change the amount. Mark each participant Paid or Pending individually. Pending people remain visible. Irumudi is tracked and reported separately and does not inflate normal Trip Expenses." },
  { id: "offline", title: "Offline Mode & Sync", text: "Payanam is designed to keep working when you're offline. Trip data is stored locally on the device, so you can continue using saved local data without internet. Synchronization uses the signed-in account and requires an internet connection; queued changes can be pushed and account data pulled when sync runs. To use data on another device, sign in to the same account and allow it to reconnect and sync. If data seems missing, check the account, reconnect to the internet, and retry sync before creating duplicate records. Offline map tiles may not be available." },
  { id: "reports", title: "Reports", text: "Trip reports summarize recorded trip data. Normal Trip Expenses come from actual expense entries. Finalized vehicle settlement is recorded separately from the active estimate. Sabarimala Irumudi appears in its separate collection/report section; places and location insights appear when relevant data is available." },
];

const faqs = [
  ["Does Payanam work without internet?", "Yes. The app stores trip data locally, so existing local features can continue offline. Sync and online map tiles need an internet connection."],
  ["Will my trips sync to another device?", "Sync requires the same signed-in account and an internet connection. On the other device, reconnect and let account sync run; if a trip is missing, verify the account and retry sync."],
  ["What happens if I change my vehicle details during a trip?", "The trip keeps its vehicle snapshot. Editing the saved vehicle later does not change the vehicle already attached to that trip."],
  ["Is Vehicle Expense Likely an actual expense?", "No. It is a live estimate. A finalized transport settlement is created after you review and confirm settlement."],
  ["Can I correct an inaccurate GPS location?", "Yes. Retry GPS or select Set Location Manually, move/search for the location, and confirm it."],
  ["Can I add a place manually?", "Yes. Open manual location selection, choose the map location, and confirm before saving the place."],
  ["Does Irumudi count as a normal trip expense?", "No. Irumudi collection is tracked separately and does not increase normal trip expense totals."],
  ["Are children charged differently for Irumudi?", "No. The same per-person amount applies to adults and children."],
  ["What happens if someone hasn't paid Irumudi?", "Their status stays Pending and remains visible in the collection summary. You can continue with pending participants."],
  ["Can I continue a trip after Transport settlement?", "Transport settlement finalizes the vehicle payout. The trip and its other tools remain available according to their normal trip state."],
  ["Why can't I end my journey yet?", "Check the journey screen for required trip steps or pending setup. Complete the indicated requirement, then try ending the journey again."],
  ["Where can I see my saved vehicles?", "Open Settings → Saved Vehicles."],
  ["Where can I see places I've visited?", "Open Trip Places to browse saved places, filter by trip/category/rating, or view their map."],
];

export default function Guide() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const shownSections = useMemo(() => sections.filter((item) => !normalized || `${item.title} ${item.text}`.toLowerCase().includes(normalized)), [normalized]);
  const shownFaqs = useMemo(() => faqs.filter(([question, answer]) => !normalized || `${question} ${answer}`.toLowerCase().includes(normalized)), [normalized]);
  useEffect(() => {
    const sectionId = location.hash.slice(1);
    if (!sectionId) return;
    const section = document.getElementById(sectionId);
    if (section instanceof HTMLDetailsElement) section.open = true;
    section?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [location.hash]);
  return <main className="guide-page">
    <header className="guide-header"><button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft size={20}/></button><PayanamLogo variant="icon" className="guide-brand-icon" decorative/><div><h1>Payanam Guide</h1><p>Everything you need to plan, track, and complete your journey with confidence.</p></div></header>
    <label className="guide-search"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={'Search “transport”, “sync”, “Irumudi”…'} aria-label="Search guide"/>{query && <button onClick={() => setQuery("")} aria-label="Clear search">Clear</button>}</label>
    <div className="guide-content">{shownSections.map((section) => <details id={section.id} className="guide-section" key={section.id} open={Boolean(normalized)}><summary><span><BookOpen size={18}/>{section.title}</span></summary><p>{section.text}</p></details>)}
      <details className="guide-section guide-faq" open={Boolean(normalized)}><summary><span><BookOpen size={18}/>Frequently Asked Questions</span></summary>{shownFaqs.length ? shownFaqs.map(([question, answer]) => <details className="guide-question" key={question} open={Boolean(normalized)}><summary>{question}</summary><p>{answer}</p></details>) : <p>No matching questions.</p>}</details>
      {!shownSections.length && !shownFaqs.length && <p className="guide-no-results">No guide topics match “{query}”. Try another word.</p>}
    </div>
  </main>;
}
