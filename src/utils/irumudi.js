export function isSabarimalaTrip(trip) {
  return trip?.tripType === "temple" && String(trip.templeName || "").trim().toLowerCase() === "sabarimala";
}

export function getIrumudiPeople(participants = []) {
  return participants.flatMap((participant) => {
    let adults = Math.max(0, Number(participant.adults || 0));
    let children = Math.max(0, Number(participant.children || 0));
    if (adults + children === 0) adults = Math.max(1, Number(participant.memberCount || 1));
    return [
      ...Array.from({ length: adults }, (_, index) => ({ key: `${participant.id}:adult:${index + 1}`, participantId: participant.id, participantName: participant.name, memberType: "Adult", memberIndex: index + 1 })),
      ...Array.from({ length: children }, (_, index) => ({ key: `${participant.id}:child:${index + 1}`, participantId: participant.id, participantName: participant.name, memberType: "Child", memberIndex: index + 1 })),
    ];
  });
}

export function getIrumudiSummary(trip, participants = []) {
  if (!isSabarimalaTrip(trip) || !trip.irumudi) return null;
  const amountPerPerson = Math.max(0, Number(trip.irumudi.amountPerPerson || 0));
  const payments = new Map((trip.irumudi.participantPayments || []).map((payment) => [payment.key, payment]));
  const people = getIrumudiPeople(participants).map((person) => ({ ...person, status: payments.get(person.key)?.status === "paid" ? "paid" : "pending" }));
  const paidCount = people.filter((person) => person.status === "paid").length;
  const pendingCount = people.length - paidCount;
  return {
    amountPerPerson,
    totalParticipants: people.length,
    paidCount,
    pendingCount,
    expectedTotal: people.length * amountPerPerson,
    collectedAmount: paidCount * amountPerPerson,
    pendingAmount: pendingCount * amountPerPerson,
    people,
    pendingPeople: people.filter((person) => person.status === "pending"),
  };
}
