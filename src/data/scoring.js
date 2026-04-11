export function getLeadScore(p) {
  let s = 0, r = [];

  // --- Category base score: new construction is king ---
  if (p.category === "New Construction") {
    s += 3;
    r.push("New construction");
  } else if (p.category === "Addition") {
    s += 1;
    r.push("Addition");
  } else if (p.category === "Subdivision") {
    s += 0;
    r.push("Subdivision only");
  }

  // --- Scale scoring: custom homes & small residential prioritized ---
  const unitMatch = p.scope.match(/(\d+)\s*Units?/i) || p.scope.match(/(\d+)\s*New\s*Homes?/i);
  const unitCount = unitMatch ? parseInt(unitMatch[1]) : 0;

  if (unitCount > 5) { s -= 2; r.push(`${unitCount}-unit (too large)`); }
  else if (unitCount >= 2 && unitCount <= 5) { s += 2; r.push(`${unitCount}-unit small residential`); }
  else if (p.scope.includes("Demo + New") || p.scope.includes("Demo +") || p.scope.match(/\(Demo/)) { s += 3; r.push("Full demo/rebuild"); }
  else if (p.scope.includes("Vacant")) { s += 3; r.push("Ground-up on vacant lot"); }
  else if (p.scope.includes("Two-Family")) { s += 2; r.push("Two-family build"); }
  else if (p.scope.includes("Two-Unit")) { s += 2; r.push("SB 9 two-unit"); }
  else if (p.scope.includes("Gymnasium") || p.scope.includes("Institutional") || p.scope.includes("Mixed-Use")) { s -= 1; r.push("Non-residential"); }
  else if (p.scope.includes(">1,000 SF")) { s += 1; r.push("Large accessory >1,000 SF"); }
  else if (p.scope.includes("Second-Story") || p.scope.includes("Hillside Addition")) { s += 1; r.push("Addition scope"); }
  else if (p.scope.includes(">450 SF")) { s += 1; r.push("Accessory >450 SF"); }
  else if (p.scope.includes("Lot Split") || p.scope.includes("Lot Line") || p.scope.includes("Lot Merger")) { s += 0; r.push("Land action only"); }
  else if (p.scope.includes("CUP")) { s += 0; r.push("Permit only"); }
  else { s += 1; r.push("General scope"); }

  // --- Square footage scoring: net new SF = revenue signal ---
  if (p.proposedSF !== null && p.existingSF !== null) {
    const netNew = p.proposedSF - p.existingSF;
    if (netNew >= 5000) { s += 3; r.push(`${netNew.toLocaleString()} net new SF`); }
    else if (netNew >= 2000) { s += 2; r.push(`${netNew.toLocaleString()} net new SF`); }
    else if (netNew >= 500) { s += 1; r.push(`${netNew.toLocaleString()} net new SF`); }
  } else if (p.existingSF === 0) {
    // Vacant lot = all new construction, but we don't know the proposed SF
    s += 1; r.push("Vacant lot (all new SF)");
  }

  // --- Recency scoring ---
  const mo = (Date.now() - new Date(p.dateFiled)) / (1000 * 60 * 60 * 24 * 30);
  if (mo < 3) { s += 2; r.push("Recently filed"); }
  else if (mo < 6) { s += 1; r.push("< 6 mo"); }

  // --- Status scoring ---
  if (p.status.includes("Pending")) { s += 1; r.push("Pending"); }
  if (p.status.includes("Commission") || p.status.includes("DRC") || p.status.includes("Committee")) { s += 1; r.push("Near hearing"); }
  if (p.status.includes("Intent to approve")) { s += 2; r.push("Near approval"); }

  return { score: Math.min(s, 10), reasons: r };
}
