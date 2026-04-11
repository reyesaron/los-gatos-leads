function extractUnitCount(p) {
  const text = `${p.scope} ${p.description} ${p.overview}`;
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

export function getLeadScore(p) {
  let s = 0, r = [];

  // -------------------------------------------------------
  // PERMIT PROXIMITY
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

  // Recency bonus
  if (p.dateFiled) {
    const mo = (Date.now() - new Date(p.dateFiled)) / (1000 * 60 * 60 * 24 * 30);
    if (mo < 3) { s += 2; r.push("Filed < 3 mo"); }
    else if (mo < 6) { s += 1; r.push("Filed < 6 mo"); }
  }

  // -------------------------------------------------------
  // TIER 1 (max +4): New construction custom homes 2,000+ SF
  //   Demo+rebuild, ground-up SFR, custom homes
  //   Extra point when proposed SF >= 2,000
  // -------------------------------------------------------
  // TIER 2 (+3): Second-story additions
  // TIER 3 (+2): Accessory structures (pool houses, garages, ADUs)
  // TIER 4 (+1): Small subdivisions (<12 lots) — pipeline leads
  // TIER 5 (-1 to -2): Large multi-family — awareness only
  // -------------------------------------------------------
  const unitCount = extractUnitCount(p);
  const text = `${p.scope} ${p.description} ${p.overview}`.toLowerCase();

  if (p.category === "New Construction") {
    const isCustomHome =
      p.scope.includes("Custom Home")
      || p.scope.includes("Demo + New") || p.scope.includes("Demo +") || p.scope.match(/\(Demo/)
      || (text.includes("demolish") && text.includes("construct"))
      || p.scope.includes("Vacant") || p.existingSF === 0;

    if (unitCount >= 50) {
      // TIER 5: commercial scale — awareness only
      s -= 2; r.push(`${unitCount}-unit (commercial scale)`);
    } else if (unitCount >= 13) {
      // TIER 5: too large
      s -= 1; r.push(`${unitCount}-unit (too large for us)`);
    } else if (isCustomHome && unitCount <= 5) {
      // TIER 1: custom home — top score
      s += 4; r.push("Custom home");
      // SF bonus baked in: 2,000+ SF gets extra via tiebreaker below
    } else if (unitCount >= 6 && unitCount <= 12) {
      s += 1; r.push(`${unitCount}-unit (borderline)`);
    } else if (unitCount >= 2 && unitCount <= 5) {
      s += 2; r.push(`${unitCount}-unit small residential`);
    } else if (p.scope.includes("Two-Family")) {
      s += 2; r.push("Two-family build");
    } else if (p.scope.includes("Two-Unit")) {
      s += 2; r.push("SB 9 two-unit");
    } else if (p.scope.includes("Builder's Remedy")) {
      s += 1; r.push("Builder's Remedy (details TBD)");
    } else if (text.includes("hotel") || p.scope.includes("Gymnasium") || p.scope.includes("Institutional") || p.scope.includes("Mixed-Use")) {
      s -= 1; r.push("Non-residential");
    } else {
      s += 2; r.push("New construction");
    }
  }

  // TIER 2: Second-story additions
  else if (p.category === "Addition") {
    if (p.scope.includes("Second-Story") || p.scope.includes("Hillside Addition") || text.includes("second-story") || text.includes("second story")) {
      s += 3; r.push("Second-story addition");
    }
    // TIER 3: Accessory structures
    else if (p.scope.includes(">1,000 SF")) {
      s += 2; r.push("Accessory >1,000 SF");
    }
    else if (p.scope.includes(">450 SF") || p.scope.includes("Accessory") || text.includes("pool house") || text.includes("garage") || text.includes("adu") || text.includes("accessory dwelling")) {
      s += 2; r.push("Accessory structure");
    }
    else if (p.scope.includes("Exterior") || p.scope.includes("Historic")) {
      s += 2; r.push("Exterior/historic renovation");
    }
    else if (p.scope.includes("CUP")) {
      s += 0; r.push("Permit only");
    }
    else {
      s += 2; r.push("Residential addition");
    }
  }

  // TIER 4: Small subdivisions — pipeline for future custom home builds
  else if (p.category === "Subdivision") {
    if (unitCount > 0 && unitCount < 12) {
      s += 1; r.push(`${unitCount}-lot subdivision (pipeline)`);
    } else if (unitCount >= 12) {
      s += 0; r.push(`${unitCount}-lot (large subdivision)`);
    } else if (p.scope.includes("Lot Split") || p.scope.includes("Urban Lot Split")) {
      s += 1; r.push("Lot split (pipeline)");
    } else {
      s += 1; r.push("Subdivision");
    }
  }

  // -------------------------------------------------------
  // SQUARE FOOTAGE — boosts custom homes with 2,000+ SF to the top
  // -------------------------------------------------------
  const isResidentialScale = (p.category === "New Construction" && unitCount < 13)
    || p.category === "Addition"
    || (p.category === "Subdivision" && unitCount < 12);

  if (isResidentialScale) {
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
