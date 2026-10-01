import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, CircleDashed, BookOpen } from "lucide-react";
import Button from "../../components/Button/Button";
import TripRepository from "../../database/repositories/TripRepository";
import ParticipantRepository from "../../database/repositories/ParticipantRepository";
import IrumudiRepository from "../../database/repositories/IrumudiRepository";
import { getIrumudiPeople, getIrumudiSummary, isSabarimalaTrip } from "../../utils/irumudi";
import "./Irumudi.css";

export default function Irumudi() {
  const { tripId } = useParams(); const navigate = useNavigate();
  const [trip, setTrip] = useState(null); const [participants, setParticipants] = useState([]);
  const [amount, setAmount] = useState(""); const [payments, setPayments] = useState([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const saveQueue = useRef(Promise.resolve());
  useEffect(() => { (async () => {
    const loadedTrip = await TripRepository.getTrip(tripId);
    if (!isSabarimalaTrip(loadedTrip)) { navigate("/journey", { replace: true }); return; }
    const loadedParticipants = await ParticipantRepository.getParticipantsByTrip(tripId);
    setTrip(loadedTrip); setParticipants(loadedParticipants); setAmount(loadedTrip.irumudi?.amountPerPerson != null ? String(loadedTrip.irumudi.amountPerPerson) : "");
    const stored = new Map((loadedTrip.irumudi?.participantPayments || []).map((row) => [row.key, row]));
    setPayments(getIrumudiPeople(loadedParticipants).map((person) => ({ ...person, status: stored.get(person.key)?.status === "paid" ? "paid" : "pending", updatedAt: stored.get(person.key)?.updatedAt || null })));
    setLoading(false);
  })(); }, [tripId, navigate]);
  const summaryTrip = useMemo(() => trip ? { ...trip, irumudi: { ...(trip.irumudi || {}), amountPerPerson: Number(amount || 0), participantPayments: payments } } : null, [trip, amount, payments]);
  const summary = useMemo(() => getIrumudiSummary(summaryTrip, participants), [summaryTrip, participants]);
  const save = async (nextPayments = payments, nextAmount = amount, completeSetup = false) => {
    if (!Number.isFinite(Number(nextAmount)) || Number(nextAmount) < 0) return;
    setSaving(true);
    try { const task = saveQueue.current.catch(() => {}).then(() => IrumudiRepository.save(tripId, participants, Number(nextAmount), nextPayments, completeSetup)); saveQueue.current = task; const irumudi = await task; setTrip((current) => ({ ...current, irumudi })); return true; }
    catch (error) { alert(error.message || "Could not save Irumudi collection."); return false; }
    finally { setSaving(false); }
  };
  const toggle = (key) => {
    const next = payments.map((row) => row.key === key ? { ...row, status: row.status === "paid" ? "pending" : "paid" } : row);
    setPayments(next); if (Number(amount) > 0) save(next, amount);
  };
  const continueToTrip = async () => {
    if (!(Number(amount) > 0)) { alert("Enter an Irumudi amount per person to continue."); return; }
    if (!await save(payments, amount, true)) return;
    navigate("/journey");
  };
  if (loading || !trip) return <main className="irumudi-page"><p>Loading Irumudi collection…</p></main>;
  return <main className="irumudi-page">
    <header><button type="button" onClick={() => navigate("/")} aria-label="Home"><ArrowLeft size={20}/></button><div><h1>Sabarimala Irumudi</h1><p>{trip.tripName}</p></div></header>
    <section className="irumudi-card"><label>Amount Per Person<input type="number" min="0" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} onBlur={() => Number(amount) >= 0 && save(payments, amount)} placeholder="₹ Amount"/><small>One amount applies equally to every participant, adult and child.</small></label></section>
    <button className="irumudi-guide-link" onClick={() => navigate("/guide#sabarimala")}><BookOpen size={16}/> How does Irumudi collection work?</button>
    <section className="irumudi-card"><div className="irumudi-section-title"><div><h2>Participant Collection</h2><p>Mark each person individually. Unpaid participants remain pending.</p></div><span>{payments.length} people</span></div>
      {payments.length ? <div className="irumudi-people">{payments.map((person) => <label className={`irumudi-person ${person.status}`} key={person.key}><input type="checkbox" checked={person.status === "paid"} disabled={!(Number(amount) > 0) || saving} onChange={() => toggle(person.key)}/><span className="irumudi-status-icon">{person.status === "paid" ? <Check size={16}/> : <CircleDashed size={16}/>}</span><span className="irumudi-person-name"><strong>{person.participantName}</strong><small>{person.memberType} {person.memberIndex}</small></span><span className={`irumudi-status-label ${person.status}`}>{person.status === "paid" ? "Paid" : "Pending"}</span><strong>₹{Number(amount || 0).toLocaleString("en-IN")}</strong></label>)}</div> : <p>No participants have been added to this trip.</p>}
    </section>
    {summary && <section className="irumudi-card irumudi-summary"><h2>Collection Summary</h2><div><span>Total Participants</span><strong>{summary.totalParticipants}</strong></div><div><span>Paid</span><strong>{summary.paidCount}</strong></div><div><span>Pending</span><strong>{summary.pendingCount}</strong></div><div><span>Expected Amount</span><strong>₹{summary.expectedTotal.toLocaleString("en-IN")}</strong></div><div><span>Collected</span><strong>₹{summary.collectedAmount.toLocaleString("en-IN")}</strong></div><div><span>Pending Amount</span><strong>₹{summary.pendingAmount.toLocaleString("en-IN")}</strong></div>{summary.pendingPeople.length > 0 && <p className="irumudi-pending-note">Still pending: {summary.pendingPeople.map((person) => `${person.participantName} (${person.memberType} ${person.memberIndex})`).join(", ")}. You can continue; these statuses will remain pending.</p>}</section>}
    <Button fullWidth disabled={saving || !(Number(amount) > 0)} onClick={continueToTrip}>{saving ? "Saving…" : "Continue to Trip"}</Button>
  </main>;
}
