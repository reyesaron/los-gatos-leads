export function getLeadScore(p) {
  let s = 0, r = [];

  // Scope scoring
  if (p.scope.includes("119 Units")) { s += 5; r.push("Large multi-family"); }
  else if (p.scope.includes("63 Units") || p.scope.includes("58 Units")) { s += 5; r.push("Large multi-family"); }
  else if (p.scope.includes("13 New") || p.scope.includes("9 Lots")) { s += 5; r.push("Major subdivision"); }
  else if (p.scope.includes("11 Units")) { s += 4; r.push("Multi-family"); }
  else if (p.scope.includes("Gymnasium") || p.scope.includes("Institutional")) { s += 4; r.push("Institutional"); }
  else if (p.scope.includes("Demo + New") || p.scope.includes("Vacant")) { s += 4; r.push("Custom home"); }
  else if (p.scope.includes("Mixed-Use")) { s += 4; r.push("Mixed-use"); }
  else if (p.scope.includes("Two-Unit")) { s += 3; r.push("SB 9 multi-unit"); }
  else if (p.scope.includes(">1,000 SF")) { s += 3; r.push("Large accessory"); }
  else if (p.scope.includes("Exterior") || p.scope.includes("Grading")) { s += 3; r.push("Complex scope"); }
  else if (p.scope.includes("Second-Story")) { s += 2; r.push("Addition"); }
  else if (p.scope.includes(">450 SF")) { s += 2; r.push("Accessory"); }
  else if (p.scope.includes("Lot Split") || p.scope.includes("3 Lots")) { s += 1; r.push("Subdivision"); }
  else { s += 2; r.push("General"); }

  // Recency scoring
  const mo = (new Date("2026-04-10") - new Date(p.dateFiled)) / (1000 * 60 * 60 * 24 * 30);
  if (mo < 3) { s += 2; r.push("Recently filed"); }
  else if (mo < 6) { s += 1; r.push("< 6 mo"); }

  // Status scoring
  if (p.status.includes("Pending")) { s += 1; r.push("Pending"); }
  if (p.status.includes("Commission") || p.status.includes("DRC") || p.status.includes("Committee")) { s += 1; r.push("Near hearing"); }
  if (p.status.includes("Intent to approve")) { s += 2; r.push("Near approval"); }

  return { score: Math.min(s, 10), reasons: r };
}
