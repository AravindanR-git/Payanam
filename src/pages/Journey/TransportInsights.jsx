import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, CheckCircle2, BookOpen } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import TripRepository from "../../database/repositories/TripRepository";
import ExpenseRepository from "../../database/repositories/ExpenseRepository";
import CategoryRepository from "../../database/repositories/CategoryRepository";
import ItemRepository from "../../database/repositories/ItemRepository";
import db from "../../database/db";
import { enqueueSync } from "../../services/syncEnqueue";
import { uploadEntity } from "../../services/supabaseSync";
import { getTransportEstimate, isIncludedTransportExpense } from "../../utils/transportAccounting";
import "./TransportInsights.css";

export default function TransportInsights() {
  const { tripId } = useParams(); const navigate = useNavigate();
  const [trip, setTrip] = useState(null); const [vehicle, setVehicle] = useState(null);
  const [expenses, setExpenses] = useState([]); const [itemChoices, setItemChoices] = useState([]);
  const [review, setReview] = useState(null); const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => {
    const [loadedTrip, loadedExpenses, categories] = await Promise.all([
      TripRepository.getTrip(tripId), ExpenseRepository.getExpensesByTrip(tripId), CategoryRepository.getCategories(null),
    ]);
    setTrip(loadedTrip); setVehicle(loadedTrip?.transport || null); setExpenses(loadedExpenses);
    const category = categories.find((row) => row.name.toLowerCase() === "transport");
    if (category) setItemChoices(await ItemRepository.getItems(category.id));
  })(); }, [tripId]);

  const persist = async (nextVehicle = vehicle) => {
    if (!trip || !nextVehicle || nextVehicle.settlementStatus === "FINALIZED") return;
    setSaving(true);
    try {
      const updatedTrip = { ...trip, transport: nextVehicle, updatedAt: new Date().toISOString() };
      await db.trips.update(trip.id, { transport: nextVehicle, updatedAt: updatedTrip.updatedAt });
      await enqueueSync("trips", trip.id, "UPDATE", updatedTrip);
      if (navigator.onLine) uploadEntity("trips", updatedTrip).catch((error) => console.error("Transport agreement sync failed", error));
      setTrip(updatedTrip);
    } finally { setSaving(false); }
  };
  const edit = (key, value) => setVehicle((current) => ({ ...current, [key]: value }));
  const editAndSave = async (key, value) => {
    const next = { ...vehicle, [key]: value };
    setVehicle(next); await persist(next);
  };
  const includedItems = vehicle?.includedExpenseItems || [];
  const toggleIncludedItem = (item) => {
    const exists = includedItems.some((entry) => entry.id === item.id);
    const nextItems = exists ? includedItems.filter((entry) => entry.id !== item.id) : [...includedItems, { id: item.id, name: item.name }];
    const next = { ...vehicle, includedExpenseItems: nextItems, includedItems: Object.fromEntries(nextItems.map((entry) => [entry.name.toLowerCase(), true])) };
    setVehicle(next); persist(next);
  };
  const estimate = useMemo(() => vehicle ? getTransportEstimate(vehicle, expenses) : null, [vehicle, expenses]);
  const actualIncluded = expenses.filter((expense) => isIncludedTransportExpense(expense, vehicle));
  const includedTotal = actualIncluded.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const excludedTransport = expenses.filter((expense) => !expense.transportSettlement && !isIncludedTransportExpense(expense, vehicle) && /transport/i.test(expense.categoryName || ""));

  if (!trip) return <main className="transport-insights"><p>Loading transport…</p></main>;
  if (!vehicle) return <main className="transport-insights"><header><button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft /></button><h1>Transport</h1></header><p>This trip has no vehicle agreement.</p></main>;
  const finalized = vehicle.settlementStatus === "FINALIZED";
  const updateReview = (key, value) => setReview((current) => ({ ...current, [key]: value }));
  const reviewDistance = vehicle.pricingMode === "package" ? Number(review?.finalDistance || vehicle.estimatedDistance || 0) : Number(vehicle.odometerStart) > 0 ? Number(review?.endOdometer || 0) - Number(vehicle.odometerStart) : Number(review?.finalDistance ?? vehicle.currentDistance ?? vehicle.manualDistance ?? vehicle.estimatedDistance ?? 0);
  const reviewBase = vehicle.pricingMode === "package" ? Number(vehicle.packageAmount || 0) : reviewDistance * Number(vehicle.ratePerKm || 0);
  const reviewPayout = Math.max(0, reviewBase - includedTotal) + Number(review?.finalBeta ?? vehicle.driverBetaAmount ?? 0);

  const openReview = () => setReview({ endOdometer: String(vehicle.currentOdometer ?? ""), finalDistance: String(vehicle.currentDistance ?? vehicle.manualDistance ?? vehicle.estimatedDistance ?? 0), finalBeta: String(vehicle.driverBetaAmount ?? 0) });
  const confirmSettlement = async () => {
    const start = vehicle.pricingMode === "package" ? 0 : Number(vehicle.odometerStart || 0);
    const end = Number(review.endOdometer);
    const finalDistance = start > 0 ? end - start : Number(review.finalDistance);
    const finalBeta = Number(review.finalBeta);
    if (vehicle.pricingMode !== "package" && (!Number.isFinite(finalDistance) || finalDistance < 0 || (start > 0 && (!Number.isFinite(end) || end < start)))) { alert("Enter a valid final distance or odometer reading."); return; }
    if (!Number.isFinite(finalBeta) || finalBeta < 0) { alert("Driver beta must be zero or greater."); return; }
    if (!window.confirm(`Confirm vehicle payout of ₹${reviewPayout.toLocaleString("en-IN")}?`)) return;
    setSaving(true);
    try {
      const currentExpenses = await ExpenseRepository.getExpensesByTrip(trip.id);
      let settlement = currentExpenses.find((expense) => expense.transportSettlement || expense.id === vehicle.settlementExpenseId)
        || await db.expenses.where("transportSettlementTripId").equals(trip.id).first();
      if (!settlement) {
        const categories = await CategoryRepository.getCategories(null, trip.userId);
        let category = categories.find((row) => row.name.toLowerCase() === "transport");
        if (!category) category = await CategoryRepository.createCategory({ name: "Transport", userId: trip.userId, tripTypes: ["all"] });
        let item = (await ItemRepository.getItems(category.id)).find((row) => row.name.toLowerCase() === "vehicle / transport settlement");
        if (!item) item = await ItemRepository.createItem({ name: "Vehicle / Transport Settlement", categoryId: category.id, userId: trip.userId });
        try {
          settlement = await ExpenseRepository.createExpense({ tripId: trip.id, transportSettlementTripId: trip.id, userId: trip.userId, categoryId: category.id, categoryName: category.name, itemId: item.id, selectedItems: [{ id: item.id, name: item.name }], amount: reviewPayout, expenseTime: new Date().toISOString(), paymentSource: "fund", notes: "Final vehicle transport settlement", transportSettlement: true });
        } catch (error) {
          if (error?.name !== "ConstraintError") throw error;
          settlement = await db.expenses.where("transportSettlementTripId").equals(trip.id).first();
          if (!settlement) throw error;
        }
      }
      const finalVehicle = { ...vehicle, currentOdometer: start > 0 ? end : vehicle.currentOdometer, odometerEnd: start > 0 ? end : null, finalDistance: vehicle.pricingMode === "package" ? null : finalDistance, finalDriverBeta: finalBeta, finalIncludedAmount: includedTotal, finalBaseAmount: reviewBase, finalPayable: reviewPayout, settlementStatus: "FINALIZED", settlementExpenseId: settlement.id };
      const updatedTrip = { ...trip, transport: finalVehicle, updatedAt: new Date().toISOString() };
      await db.trips.update(trip.id, { transport: finalVehicle, updatedAt: updatedTrip.updatedAt });
      await enqueueSync("trips", trip.id, "UPDATE", updatedTrip);
      if (navigator.onLine) uploadEntity("trips", updatedTrip).catch((error) => console.error("Settlement sync failed", error));
      setTrip(updatedTrip); setVehicle(finalVehicle); setExpenses(await ExpenseRepository.getExpensesByTrip(trip.id)); setReview(null);
    } catch (error) { console.error(error); alert("Could not finalize the transport settlement."); }
    finally { setSaving(false); }
  };

  return <main className="transport-insights"><header><button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft /></button><div><h1>Transport Insights</h1><p>Review your vehicle agreement, distance, expenses, and final payout.</p></div>{!finalized && <button onClick={() => persist()} disabled={saving} aria-label="Save agreement"><Save size={18} /></button>}</header><button className="transport-guide-link" onClick={() => navigate("/guide#transport")}><BookOpen size={16}/> Need help with Transport? View Guide</button>
    <section><h2>Vehicle</h2>{vehicle.photo && <img className="transport-insights-photo" src={vehicle.photo} alt={vehicle.name} />}<p><strong>{vehicle.name}</strong> · {vehicle.vehicleType}</p><p>Driver: {vehicle.driverName || "Not specified"}{vehicle.driverPhone ? ` · ${vehicle.driverPhone}` : ""}</p><p>{vehicle.ownership === "own" ? "Private / own vehicle" : "Rented vehicle"}</p></section>
    <section><h2>Live agreement estimate</h2>
      <label>Pricing mode<select disabled={finalized} value={vehicle.pricingMode} onChange={(event) => editAndSave("pricingMode", event.target.value)}><option value="perKm">Per KM</option><option value="package">Package</option></select></label>
      {vehicle.pricingMode === "package" ? <label>Package amount ₹<input disabled={finalized} type="number" min="0" value={vehicle.packageAmount ?? 0} onChange={(e) => edit("packageAmount", Number(e.target.value))} onBlur={() => persist()} /></label> : <>
        <label>Rate / km ₹<input disabled={finalized} type="number" min="0" value={vehicle.ratePerKm ?? 0} onChange={(e) => edit("ratePerKm", Number(e.target.value))} onBlur={() => persist()} /></label>
        <label>Estimated distance km<input disabled={finalized} type="number" min="0" value={vehicle.estimatedDistance ?? 0} onChange={(e) => edit("estimatedDistance", Number(e.target.value))} onBlur={() => persist()} /></label>
      </>}
      <label>Estimated days<input disabled={finalized} type="number" min="1" value={vehicle.tripDays ?? 1} onChange={(e) => { const days = Number(e.target.value); const beta = vehicle.driverBetaManuallySet ? vehicle.driverBetaAmount : Number(vehicle.driverBetaPerDay || 0) * days; setVehicle({ ...vehicle, tripDays: days, driverBetaAmount: beta, estimatedDriverBeta: beta }); }} onBlur={() => persist()} /></label>
      <label>Estimated driver beta ₹<input disabled={finalized} type="number" min="0" value={vehicle.driverBetaAmount ?? 0} onChange={(e) => { const beta = Number(e.target.value); setVehicle({ ...vehicle, driverBetaAmount: beta, estimatedDriverBeta: beta, driverBetaManuallySet: true }); }} onBlur={() => persist()} /></label>
      <p>Base: ₹{estimate.base.toLocaleString("en-IN")} · Less included actuals: ₹{estimate.includedAmount.toLocaleString("en-IN")} · Beta: ₹{estimate.driverBeta.toLocaleString("en-IN")}</p><strong>Vehicle expense likely: ₹{estimate.payable.toLocaleString("en-IN")} approx.</strong>
    </section>
    <section><h2>Live distance</h2><p>Starting odometer: {vehicle.odometerStart || 0}</p>{vehicle.pricingMode !== "package" && (Number(vehicle.odometerStart) > 0 ? <label>Current odometer<input disabled={finalized} type="number" min={vehicle.odometerStart} value={vehicle.currentOdometer ?? vehicle.odometerStart} onChange={(e) => edit("currentOdometer", Number(e.target.value))} onBlur={() => { if (Number(vehicle.currentOdometer) >= Number(vehicle.odometerStart)) persist(); else { alert("Current odometer cannot be below the start reading."); setVehicle({ ...vehicle, currentOdometer: vehicle.odometerStart }); } }} /></label> : <label>Current/manual distance km<input disabled={finalized} type="number" min="0" value={vehicle.currentDistance ?? vehicle.manualDistance ?? vehicle.estimatedDistance ?? 0} onChange={(e) => edit("currentDistance", Number(e.target.value))} onBlur={() => persist()} /></label>)}<p>Current distance: {estimate.distance ?? "Package"}{estimate.distance == null ? "" : " km"}</p>{vehicle.odometerEnd != null && <p>Final odometer: {vehicle.odometerEnd}</p>}</section>
    <section><h2>Included transport items</h2>{itemChoices.length ? itemChoices.map((item) => <label className="transport-check" key={item.id}><input type="checkbox" disabled={finalized} checked={includedItems.some((entry) => entry.id === item.id)} onChange={() => toggleIncludedItem(item)} />{item.name}</label>) : <p>No Transport expense items are configured.</p>}</section>
    <section><h2>Actual included expenses</h2>{actualIncluded.length ? actualIncluded.map((expense) => <p key={expense.id}>{(expense.selectedItems || []).map((item) => item.name).join(" + ") || "Transport expense"}: ₹{Number(expense.amount || 0).toLocaleString("en-IN")}</p>) : <p>No included expenses recorded.</p>}<p>Each actual expense record is counted once, even when it contains multiple selected items.</p></section>
    <section><h2>Other actual transport expenses</h2>{excludedTransport.length ? excludedTransport.map((expense) => <p key={expense.id}>{(expense.selectedItems || []).map((item) => item.name).join(" + ") || "Transport expense"}: ₹{Number(expense.amount || 0).toLocaleString("en-IN")}</p>) : <p>None recorded.</p>}</section>
    {finalized ? <section className="settled"><CheckCircle2 /><strong>Transport finalized · payout ₹{Number(vehicle.finalPayable || 0).toLocaleString("en-IN")}</strong></section> : <button className="finalize-transport" onClick={openReview}>Complete Transport Expense</button>}
    {review && <div className="settlement-backdrop"><section className="settlement-dialog" role="dialog" aria-modal="true"><h2>Final Transport Review</h2><p>Vehicle: {vehicle.name}</p>
      {vehicle.pricingMode !== "package" && (Number(vehicle.odometerStart) > 0 ? <label>Starting odometer {vehicle.odometerStart} · current {vehicle.currentOdometer ?? vehicle.odometerStart}<input type="number" min={vehicle.odometerStart} value={review.endOdometer} onChange={(e) => updateReview("endOdometer", e.target.value)} placeholder="Final odometer" /></label> : <label>Final distance km<input type="number" min="0" value={review.finalDistance} onChange={(e) => updateReview("finalDistance", e.target.value)} /></label>)}
      <label>Final driver beta ₹<input type="number" min="0" value={review.finalBeta} onChange={(e) => updateReview("finalBeta", e.target.value)} /></label>
      <h3>Expenses already paid</h3>{actualIncluded.map((expense) => <p key={expense.id}>{(expense.selectedItems || []).map((item) => item.name).join(" + ")}: ₹{Number(expense.amount || 0).toLocaleString("en-IN")}</p>)}
      {excludedTransport.map((expense) => <p key={expense.id}>Excluded · {(expense.selectedItems || []).map((item) => item.name).join(" + ")}: ₹{Number(expense.amount || 0).toLocaleString("en-IN")}</p>)}
      <p>Base amount: ₹{Math.max(0, reviewBase).toLocaleString("en-IN")}</p><p>Less included actual expenses once: −₹{includedTotal.toLocaleString("en-IN")}</p><p>Plus final driver beta: +₹{Number(review.finalBeta || 0).toLocaleString("en-IN")}</p><strong>Vehicle payout: ₹{Math.max(0, reviewPayout).toLocaleString("en-IN")}</strong>
      <p>Confirming creates one vehicle settlement expense. Existing actual expenses remain as recorded.</p><div className="settlement-actions"><button onClick={() => setReview(null)}>Back</button><button disabled={saving} onClick={confirmSettlement}>Confirm Vehicle Settlement</button></div>
    </section></div>}
  </main>;
}
