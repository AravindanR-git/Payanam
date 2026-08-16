import { translations } from "../i18n/translations";

export function generateTripPrintData(trip, insights, expenses, language = "en") {
  const t = (key) => translations[language]?.[key] || translations.en[key] || key;
  const totalCollected = insights.totalCollected || 0;
  const totalSpent = insights.totalSpent || 0;
  const balance = insights.balance || 0;
  const daysActive = insights.daysActive || 0;

  const locationMap = {};
  expenses.forEach((expense) => {
    const location = expense.locationName?.trim() || t("unknownLocation");
    if (!locationMap[location]) {
      locationMap[location] = [];
    }
    locationMap[location].push(expense);
  });

  const tripTypeLabel = trip?.tripType === "temple"
    ? t("templeJourney")
    : trip?.tripType === "friends"
      ? t("friendsJourney")
      : t("familyJourney");

  return {
    tripName: trip?.tripName || t("tripSummary"),
    tripType: tripTypeLabel,
    createdAt: trip?.createdAt || new Date().toISOString(),
    endedAt: trip?.endedAt || trip?.endDate || null,
    summary: {
      totalCollected,
      totalSpent,
      balance,
      daysActive,
    },
    participants: insights.participantContributions || [],
    settlement: insights.settlement || [],
    settlementDetails: insights.settlementDetails || [],
    topCategories: insights.topCategories || [],
    topLocations: insights.topLocations || [],
    expensesByLocation: locationMap,
    recentExpenses: expenses.slice(0, 20),
    t,
  };
}

export function openTripPrintWindow(printData) {
  const win = window.open("", "_blank");

  if (!win) {
    alert(printData.t?.("allowPopups") || "Please allow popups to print the trip report.");

    return;
  }

  const t = printData.t || ((key) => key);
  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const {
    summary: {
      totalCollected = 0,
      totalSpent = 0,
      balance = 0,
      daysActive = 0,
    } = {},
  } = printData;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${t("tripSummary")} - ${printData.tripName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1f2937; }
          h1 { font-size: 24px; margin-bottom: 4px; }
          h2 { font-size: 18px; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #0A84FF; color: #111827; }
          h3 { font-size: 15px; margin: 18px 0 8px; color: #374151; }
          .meta { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
          .section { margin-bottom: 28px; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-top: 12px; }
          .summary-card { background: #f9fafb; border-radius: 12px; padding: 16px; border-left: 4px solid #0A84FF; }
          .summary-card .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
          .summary-card .value { font-size: 20px; font-weight: 700; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
          th { background: #f9fafb; font-weight: 600; color: #374151; }
          td { color: #1f2937; }
          .amount { text-align: right; font-weight: 600; }
          .positive { color: #16A34A; }
          .negative { color: #DC2626; }
          .settlement-box { background: #f0f9ff; border-radius: 12px; padding: 16px; margin-bottom: 12px; margin-top: 10px; }
          .location-block { margin-bottom: 16px; page-break-inside: avoid; }
          .expense-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; }
          .footer { margin-top: 40px; font-size: 12px; color: #9ca3af; text-align: center; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #0A84FF; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">${t("printSavePdf")}</button>
        </div>

        <h1>${printData.tripName}</h1>
        <p class="meta">
          ${printData.tripType} &nbsp;|&nbsp;
          ${formatDate(printData.createdAt)} ${printData.endedAt ? `→ ${formatDate(printData.endedAt)}` : "→ " + t("continue")} &nbsp;|&nbsp;
          ${daysActive} ${t("daysActive")}
        </p>

        <div class="section">
          <h2>${t("tripSummary")}</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">${t("totalCollected")}</div>
              <div class="value">${formatINR(totalCollected)}</div>
            </div>
            <div class="summary-card">
              <div class="label">${t("totalSpent")}</div>
              <div class="value">${formatINR(totalSpent)}</div>
            </div>
            <div class="summary-card">
              <div class="label">${t("fairSharePerPerson")}</div>
              <div class="value">${formatINR(printData.participants[0]?.fairShare || 0)}</div>
            </div>
            <div class="summary-card">
              <div class="label">${t("balanceColumn")}</div>
              <div class="value ${balance >= 0 ? "positive" : "negative"}">${formatINR(balance)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>${t("participantsAndShares")}</h2>
          <table>
            <thead>
              <tr>
                <th>${t("participants")}</th>
                <th>${t("contribution")}</th>
                <th>${t("personalExpenses")}</th>
                <th>${t("fairSharePerPerson")}</th>
                <th>${t("balanceColumn")}</th>
              </tr>
            </thead>
            <tbody>
              ${printData.settlementDetails.map((p) => `
                <tr>
                  <td>${p.name} ${p.type === "family" ? `(${p.memberCount})` : ""}</td>
                  <td class="amount">${formatINR(p.contribution)}</td>
                  <td class="amount">${formatINR(p.personalPayments || 0)}</td>
                  <td class="amount">${formatINR(p.fairShare)}</td>
                  <td class="amount ${p.balance >= 0 ? "positive" : "negative"}">${formatINR(p.balance)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        ${printData.settlement.length > 0 ? `
          <div class="section">
            <h2>${t("settlements")}</h2>
            <p style="margin-bottom: 12px; font-size: 14px; color: #4b5563;">
              ${t("toSettleTrip")}
            </p>
            ${printData.settlement.map((s, index) => `
              <div class="settlement-box">
                <strong>${index + 1}. ${s.from}</strong> ${t("pays")} <strong>${s.to}</strong>
                <div class="amount" style="font-size: 18px; margin-top: 4px;">${formatINR(s.amount)}</div>
              </div>
            `).join("")}
          </div>
        ` : ""}

        <div class="section">
          <h2>${t("topCategories")}</h2>
          <table>
            <thead>
              <tr>
                <th>${t("category")}</th>
                <th class="amount">${t("amount")}</th>
                <th class="amount">${t("totalSpent")} %</th>
              </tr>
            </thead>
            <tbody>
              ${printData.topCategories.map((c) => `
                <tr>
                  <td>${c.name}</td>
                  <td class="amount">${formatINR(c.amount)}</td>
                  <td class="amount">${c.percentage.toFixed(1)}%</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>${t("expensesByLocation")}</h2>
          ${Object.entries(printData.expensesByLocation).map(([location, locationExpenses]) => {
            const locationTotal = locationExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
            return `
              <div class="location-block">
                <h3>${location} (${locationExpenses.length} ${t("expensesCount")} - ${formatINR(locationTotal)})</h3>
                ${locationExpenses.map((expense) => `
                  <div class="expense-item">
                    <span>${new Date(expense.expenseTime || expense.createdAt).toLocaleDateString("en-IN")} - ${expense.selectedItems?.map(i => i.name).join(", ") || t("expense")}</span>
                    <span class="amount">${formatINR(expense.amount)}</span>
                  </div>
                `).join("")}
              </div>
            `;
          }).join("")}
        </div>

        <div class="section">
          <h2>${t("recentExpenses")}</h2>
          <table>
            <thead>
              <tr>
                <th>${t("date")}</th>
                <th>${t("items")}</th>
                <th>${t("category")}</th>
                <th>${t("location")}</th>
                <th class="amount">${t("amount")}</th>
              </tr>
            </thead>
            <tbody>
              ${printData.recentExpenses.map((expense) => `
                <tr>
                  <td>${new Date(expense.expenseTime || expense.createdAt).toLocaleDateString("en-IN")}</td>
                  <td>${expense.selectedItems?.map(i => i.name).join(", ") || t("expense")}</td>
                  <td>${expense.categoryName || "N/A"}</td>
                  <td>${expense.locationName || "N/A"}</td>
                  <td class="amount">${formatINR(expense.amount)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <div class="footer">
          ${t("generatedOn")} ${new Date().toLocaleString("en-IN")} ${t("byTripLedger")}
        </div>
      </body>
    </html>
  `;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
