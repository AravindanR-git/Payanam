export function isIncludedTransportExpense(expense, transport) {
  if (!transport || !expense) return false;
  const included = transport.includedItems || {};
  return (expense.selectedItems || []).some((item) => included[String(item.name || "").trim().toLowerCase()]);
}

export function getTransportCalculation(transport, expenses = []) {
  if (!transport) return { distance: 0, base: 0, includedAmount: 0, driverBeta: 0, payable: 0, additionalTransport: 0, finalCost: 0, includedExpenses: [], additionalExpenses: [] };
  const distance = transport.pricingMode === "package" ? null : (transport.settlementStatus === "FINALIZED" && transport.finalDistance != null ? Number(transport.finalDistance) : Number(transport.odometerStart) > 0 && Number(transport.currentOdometer) >= Number(transport.odometerStart) ? Number(transport.currentOdometer) - Number(transport.odometerStart) : Number(transport.currentDistance ?? transport.estimatedDistance ?? transport.manualDistance ?? 0));
  const calculatedBase = transport.pricingMode === "package" ? Number(transport.packageAmount || 0) : Number(distance || 0) * Number(transport.ratePerKm || 0);
  const base = transport.settlementStatus === "FINALIZED" ? Number(transport.finalBaseAmount ?? calculatedBase) : calculatedBase;
  const actualIncludedAmount = expenses.reduce((sum, expense) => sum + (isIncludedTransportExpense(expense, transport) ? Number(expense.amount || 0) : 0), 0);
  const includedAmount = transport.settlementStatus === "FINALIZED" && transport.finalIncludedAmount != null
    ? Number(transport.finalIncludedAmount)
    : actualIncludedAmount;
  const driverBeta = Number(transport.settlementStatus === "FINALIZED" ? transport.finalDriverBeta ?? transport.driverBetaAmount : transport.driverBetaAmount || 0);
  const payable = Math.max(0, base - includedAmount) + driverBeta;
  const additionalTransport = expenses.reduce((sum, expense) => sum + (!expense.transportSettlement && !isIncludedTransportExpense(expense, transport) && /transport/i.test(expense.categoryName || "") ? Number(expense.amount || 0) : 0), 0);
  const includedExpenses = expenses.filter((expense) => isIncludedTransportExpense(expense, transport));
  const additionalExpenses = expenses.filter((expense) => !expense.transportSettlement && !isIncludedTransportExpense(expense, transport) && /transport/i.test(expense.categoryName || ""));
  return { distance, base, includedAmount, driverBeta, payable, additionalTransport, finalCost: payable + includedAmount + additionalTransport, includedExpenses, additionalExpenses };
}

export function getTransportEstimate(transport, expenses = []) {
  const calculation = getTransportCalculation(transport, expenses);
  if (transport?.settlementStatus === "FINALIZED") return { ...calculation, estimated: false, base: Number(transport.finalBaseAmount ?? calculation.base), includedAmount: Number(transport.finalIncludedAmount ?? calculation.includedAmount), driverBeta: Number(transport.finalDriverBeta ?? calculation.driverBeta), payable: Number(transport.finalPayable ?? calculation.payable) };
  return { ...calculation, estimated: true };
}
