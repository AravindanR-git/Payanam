/** Calculate a donor's unspent contribution from recorded donor allocations.
 * Older expenses that only have paidByDonorId are included when no allocation
 * row exists for that expense, avoiding both missed and double-counted usage.
 */
export function calculateRemainingDonorBalance({
  contributionAmount = 0,
  allocations = [],
  expenses = [],
  excludeExpenseId = null,
}) {
  const allocatedExpenseIds = new Set(allocations.map((row) => row.expenseId));
  const allocatedSpend = allocations
    .filter((row) => row.expenseId !== excludeExpenseId)
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const legacySpend = expenses
    .filter((row) => row.id !== excludeExpenseId && !allocatedExpenseIds.has(row.id))
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return Math.max(0, Number(contributionAmount || 0) - allocatedSpend - legacySpend);
}

export function availableDonors(donors) {
  return donors.filter((donor) => Number(donor.available || 0) > 0);
}

export function donorAllocationExceedsBalance(amount, available) {
  return Number(amount || 0) > Number(available || 0) + 0.000001;
}
