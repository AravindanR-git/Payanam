import db from "../db";
import { enqueueSync } from "../../services/syncEnqueue";
import { uploadEntity } from "../../services/supabaseSync";
import { getIrumudiPeople, getIrumudiSummary, isSabarimalaTrip } from "../../utils/irumudi";

const IrumudiRepository = {
  async save(tripId, participants, amountPerPerson, requestedPayments = null, completeSetup = false) {
    const trip = await db.trips.get(tripId);
    if (!isSabarimalaTrip(trip)) throw new Error("Irumudi collection is only available for Sabarimala trips.");
    const amount = Number(amountPerPerson);
    if (!Number.isFinite(amount) || amount < 0) throw new Error("Enter a valid Irumudi amount per person.");
    const now = new Date().toISOString();
    const old = trip.irumudi || {};
    const oldByKey = new Map((old.participantPayments || []).map((row) => [row.key, row]));
    const requestedByKey = requestedPayments ? new Map(requestedPayments.map((row) => [row.key, row])) : oldByKey;
    const activePeople = getIrumudiPeople(participants);
    const activeKeys = new Set(activePeople.map((person) => person.key));
    const activePayments = activePeople.map((person) => {
      const previous = oldByKey.get(person.key);
      const request = requestedByKey.get(person.key);
      const status = request?.status === "paid" ? "paid" : previous?.status === "paid" && !requestedPayments ? "paid" : "pending";
      return { ...previous, ...person, status, updatedAt: previous?.status === status ? previous.updatedAt : now };
    });
    const retainedRemoved = (old.participantPayments || []).filter((row) => !activeKeys.has(row.key));
    const currentTrip = { ...trip, irumudi: { ...old, amountPerPerson: amount, participantPayments: [...activePayments, ...retainedRemoved], setupCompleted: old.setupCompleted || completeSetup, completedAt: old.completedAt || (completeSetup ? now : null), updatedAt: now }, updatedAt: now };
    const summary = getIrumudiSummary(currentTrip, participants);
    currentTrip.irumudi = { ...currentTrip.irumudi, totalParticipants: summary.totalParticipants, paidCount: summary.paidCount, pendingCount: summary.pendingCount, expectedTotal: summary.expectedTotal, collectedAmount: summary.collectedAmount, pendingAmount: summary.pendingAmount };
    await db.trips.update(tripId, { irumudi: currentTrip.irumudi, updatedAt: now });
    await enqueueSync("trips", tripId, "UPDATE", currentTrip);
    if (navigator.onLine) uploadEntity("trips", currentTrip).catch((error) => console.error("Irumudi sync failed", error));
    return currentTrip.irumudi;
  },
};

export default IrumudiRepository;
