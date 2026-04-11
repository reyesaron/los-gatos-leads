function extractUnitCount(p) {
  const text = `${p.scope} ${p.description} ${p.overview}`;
  // Match all patterns: "25 units", "13 New Homes", "25 Custom Homes",
  // "12 lots", "138-unit", "64-unit", "25-unit", "12 residences", etc.
  const patterns = [
    /(\d+)[\s-]*units?\b/gi,
    /(\d+)\s*(?:new\s+|custom\s+)?(?:homes?|residences?|dwellings?)\b/gi,
    /(\d+)[\s-]*(?:lot|parcel)s?\b/gi,
    /(\d+)[\s-]*(?:townhomes?|condos?|flats?|buildings?)\b/gi,
  ];
  let maxCount = 0;
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(text)) !== null) {
      const n = parseInt(m[1]);
      if (n > maxCount) maxCount = n;
    }
  }
  return maxCount;
}

function isTooLarge(p, unitCount) {
  if (unitCount > 5) return true;
  // Catch projects that slip past unit regex — large acreage subdivisions,
  // "major" multi-phase, hotel, etc.
  const text = `${p.scope} ${p.description} ${p.overview}`.toLowerCase();
  if (/\b\d{2,}\s*acres?\b/.test(text)) return true; // 10+ acres
  if (text.includes("hotel")) return true;
  if (text.includes("shopping center") || text.includes("commercial complex")) return true;
  return false;
}

export function getLeadScore(p) {
  let s = 0, r = [];

  // -------------------------------------------------------
  // PRIORITY 1: Permit proximity — recently issued or close to issuing
  // -------------------------------------------------------
  const status = p.status || "";
  if (status.includes("Intent to approve") || status.includes("Approved")) {
    s += 3; r.push("Near approval");
  } else if (status.includes("Commission") || status.includes("DRC") || status.includes("Committee")) {
    s += 2; r.push("Near hearing");
  } else if (status.includes("Under Construction") || status.includes("demolition")) {
    s += 2; r.push("Under construction");
  } else if (status.includes("EIR") || status.includes("CEQA")) {
    s += 1; r.push("Environmental review");
  } else if (status.includes("Pending")) {
    s += 1; r.push("Pending");
  } else if (status.includes("MOU")) {
    s += 1; r.push("MOU in progress");
  } else if (status.includes("Ministerial")) {
    s += 1; r.push("Ministerial");
  }

  // Recency bonus — recently filed = actively moving
  if (p.dateFiled) {
    const mo = (Date.now() - new Date(p.dateFiled)) / (1000 * 60 * 60 * 24 * 30);
    if (mo < 3) { s += 2; r.push("Filed < 3 mo"); }
    else if (mo < 6) { s += 1; r.push("Filed < 6 mo"); }
  }

  // -------------------------------------------------------
  // PRIORITY 2: New construction, ≤5 units — our sweet spot
  // -------------------------------------------------------
  const unitCount = extractUnitCount(p);
  const tooLarge = isTooLarge(p, unitCount);

  if (p.category === "New Construction") {
    if (tooLarge) {
      s -= 2; r.push(unitCount > 5 ? `${unitCount}-unit (too large)` : "Project too large");
    } else if (unitCount >= 2 && unitCount <= 5) {
      s += 3; r.push(`${unitCount}-unit new construction`);
    } else if (p.scope.includes("Demo + New") || p.scope.includes("Demo +") || p.scope.match(/\(Demo/)) {
      s += 3; r.push("Full demo/rebuild");
    } else if (p.scope.includes("Vacant") || p.existingSF === 0) {
      s += 3; r.push("Ground-up build");
    } else if (p.scope.includes("Two-Family")) {
      s += 3; r.push("Two-family build");
    } else if (p.scope.includes("Two-Unit")) {
      s += 2; r.push("SB 9 two-unit");
    } else if (p.scope.includes("Custom Home")) {
      s += 3; r.push("Custom home");
    } else if (p.scope.includes("Builder's Remedy")) {
      s += 1; r.push("Builder's Remedy (details TBD)");
    } else if (p.scope.includes("Gymnasium") || p.scope.includes("Institutional") || p.scope.includes("Mixed-Use")) {
      s -= 1; r.push("Non-residential");
    } else {
      s += 2; r.push("New construction");
    }
  } else if (p.category === "Addition") {
    if (p.scope.includes(">1,000 SF")) { s += 1; r.push("Large accessory >1,000 SF"); }
    else if (p.scope.includes("Second-Story") || p.scope.includes("Hillside Addition")) { s += 1; r.push("Addition"); }
    else if (p.scope.includes(">450 SF")) { s += 1; r.push("Accessory >450 SF"); }
    else if (p.scope.includes("CUP")) { s += 0; r.push("Permit only"); }
    else { s += 1; r.push("Addition"); }
  } else if (p.category === "Subdivision") {
    s += 0; r.push("Subdivision only");
  }

  // -------------------------------------------------------
  // PRIORITY 3: Square footage tiebreaker — only for qualifying leads
  // (new construction, not too large)
  // -------------------------------------------------------
  const isQualified = p.category === "New Construction" && !tooLarge;

  if (isQualified) {
    if (p.proposedSF !== null && p.existingSF !== null) {
      const netNew = p.proposedSF - p.existingSF;
      if (netNew >= 5000) { s += 3; r.push(`${netNew.toLocaleString()} net new SF`); }
      else if (netNew >= 2000) { s += 2; r.push(`${netNew.toLocaleString()} net new SF`); }
      else if (netNew >= 500) { s += 1; r.push(`${netNew.toLocaleString()} net new SF`); }
    } else if (p.proposedSF !== null) {
      if (p.proposedSF >= 5000) { s += 3; r.push(`${p.proposedSF.toLocaleString()} SF proposed`); }
      else if (p.proposedSF >= 2000) { s += 2; r.push(`${p.proposedSF.toLocaleString()} SF proposed`); }
      else if (p.proposedSF >= 500) { s += 1; r.push(`${p.proposedSF.toLocaleString()} SF proposed`); }
    } else if (p.existingSF === 0) {
      s += 1; r.push("Vacant lot (all new SF)");
    }
  }

  return { score: Math.min(Math.max(s, 0), 10), reasons: r };
}
