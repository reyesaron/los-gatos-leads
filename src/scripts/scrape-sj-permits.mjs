#!/usr/bin/env node
// Phase 1: Scrape San Jose permit data from public tab-delimited text files
// Source: csjpbce.sanjoseca.gov/reportviewer/permitdataMonths/
// No browser needed — data is downloadable in text format

import { writeFile, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "sanjose-scraped.json");

// Target zip codes → neighborhoods
const ZIP_TO_NEIGHBORHOOD = {
  "95120": "Almaden Valley",
  "95124": "Cambrian",
  "95125": "Willow Glen",
  "95126": "Willow Glen",
  "95128": "West San Jose",
  "95129": "West San Jose",
  "95117": "West San Jose",
  "95008": "Campbell",  // technically Campbell but adjacent
};

// APN prefix → zip mapping (San Jose APN ranges by area)
// These are approximate based on Santa Clara County APN patterns
const APN_TO_ZIP = {
  "254": "95125", "255": "95125", "256": "95125", "257": "95125", "258": "95125", "259": "95125",
  "261": "95125", "262": "95125", "263": "95125", "264": "95125", "265": "95125",
  "410": "95125", "411": "95125", "412": "95125", "413": "95125", "414": "95125",
  "429": "95125", "430": "95125", "431": "95125", "432": "95125", "433": "95125", "434": "95125",
  "435": "95125", "436": "95125", "437": "95125", "438": "95125",
  "439": "95124", "440": "95124", "441": "95124",
  "442": "95124", "443": "95124", "444": "95124", "445": "95124",
  "446": "95124", "447": "95124", "448": "95124",
  "486": "95124", "487": "95124", "488": "95124",
  "562": "95120", "563": "95120", "564": "95120", "565": "95120", "566": "95120",
  "567": "95120", "568": "95120", "569": "95120", "570": "95120", "571": "95120",
  "572": "95120", "573": "95120", "574": "95120", "575": "95120", "576": "95120",
  "577": "95120", "578": "95120", "579": "95120", "580": "95120", "581": "95120",
  "582": "95120", "583": "95120", "584": "95120", "585": "95120", "586": "95120",
  "587": "95120", "588": "95120", "589": "95120",
  "372": "95129", "373": "95129", "374": "95129", "375": "95129", "376": "95129",
  "377": "95129", "378": "95129",
  "297": "95128", "298": "95128", "299": "95128", "300": "95128",
  "301": "95117", "302": "95117", "303": "95117", "304": "95117",
};

function apnToZip(apn) {
  const prefix = apn.replace(/\s/g, "").slice(0, 3);
  return APN_TO_ZIP[prefix] || null;
}

function isTargetArea(apn) {
  const zip = apnToZip(apn);
  return zip && ZIP_TO_NEIGHBORHOOD[zip];
}

function parsePermitLine(header, line) {
  const cols = line.split("\t");
  if (cols.length < 20) return null;

  const raw = {};
  for (let i = 0; i < header.length && i < cols.length; i++) {
    raw[header[i]] = (cols[i] || "").trim();
  }

  return raw;
}

function isQualifyingPermit(raw) {
  const subcode = raw.SUBCODE || "";
  const workcode = raw.WORKCODE || "";
  const location = (raw.JOBLOCATION || "").toUpperCase();
  const sqft = parseInt(raw.SQFT) || 0;
  const desc = (raw.DESCRIPTION || "").toUpperCase();
  const fullText = `${location} ${desc}`;

  // Must be single-family residential
  if (subcode !== "4030" && subcode !== "4059") return false;

  // Must be new construction (140) or additions/alterations (30) or demolition (70)
  if (workcode !== "140" && workcode !== "30" && workcode !== "70") return false;

  // Filter out minor work (sub-trades, reroofs, window replacements, etc.)
  if (workcode === "30") {
    const isMinor = /MINOR|KITCHEN.*BATH.*REMODEL|WINDOW.*REPLAC|PATIO.*DOOR|REROOF|FOUNDATION.*REPAIR|PANEL.*UPGRADE|EVCS|EV.*CHARGER|WATER.*HEATER|FURNACE|BRACE.*BOLT/i.test(fullText);
    if (isMinor) return false;

    // Must be demo/rebuild, addition, second story, ADU, or 2000+ SF
    const isSignificant = sqft >= 2000
      || /DEMO.*REBUILD|DEMO.*NEW|DEMO.*CONSTRUCT|NEW.*RESID|NEW.*SFR|NEW.*HOME|ADDITION|SECOND.*STORY|2ND.*STORY|2-STORY.*ADD|ADU|ACCESSORY.*DWELLING|GARAGE.*CONVERSION/i.test(fullText);
    if (!isSignificant) return false;
  }

  return true;
}

function classifyProject(raw) {
  const location = (raw.JOBLOCATION || "").toUpperCase();
  const desc = (raw.DESCRIPTION || "").toUpperCase();
  const fullText = `${location} ${desc}`;
  const sqft = parseInt(raw.SQFT) || 0;
  const workcode = raw.WORKCODE || "";

  let category = "Addition";
  let scope = "Residential Work";

  if (workcode === "140" || /DEMO.*REBUILD|DEMO.*NEW|DEMO.*CONSTRUCT|NEW.*RESID|NEW.*SFR|NEW.*HOME/i.test(fullText)) {
    category = "New Construction";
    if (/DEMO.*REBUILD|DEMO/i.test(fullText)) {
      scope = sqft > 0 ? `Custom Home (Demo/Rebuild — ${sqft.toLocaleString()} SF)` : "Custom Home (Demo/Rebuild)";
    } else {
      scope = sqft > 0 ? `New SFR (${sqft.toLocaleString()} SF)` : "New SFR";
    }
  } else if (/SECOND.*STORY|2ND.*STORY|2-STORY.*ADD/i.test(fullText)) {
    scope = "Second-Story Addition";
  } else if (/ADU|ACCESSORY.*DWELLING/i.test(fullText)) {
    scope = "ADU / Accessory Dwelling";
  } else if (/GARAGE/i.test(fullText)) {
    scope = "Garage (New/Rebuild)";
  } else if (/ADDITION/i.test(fullText)) {
    scope = sqft > 0 ? `Residential Addition (${sqft.toLocaleString()} SF)` : "Residential Addition";
  } else if (/ALTER/i.test(fullText)) {
    scope = "Major Alteration";
  }

  return { category, scope };
}

function extractAddress(jobLocation) {
  // Job location format: "1234 STREET NAME  (BEPM100%) DESCRIPTION"
  const match = jobLocation.match(/^(.+?)\s{2,}\(/);
  if (match) return match[1].trim();
  // Fallback: take everything before first parenthesis
  const paren = jobLocation.indexOf("(");
  if (paren > 0) return jobLocation.slice(0, paren).trim();
  return jobLocation.trim();
}

function extractJobDescription(jobLocation) {
  // Extract the part after the permit codes
  const match = jobLocation.match(/\)\s*(.+)/);
  return match ? match[1].trim() : "";
}

async function fetchPermitData(url) {
  console.log(`Fetching: ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "ApexDesignBuild-LeadsTool/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function main() {
  // Load previous data to preserve firstSeen
  let previousProjects = {};
  try {
    const prev = JSON.parse(await readFile(OUT_PATH, "utf-8"));
    for (const p of prev.projects || []) {
      previousProjects[p.permitNumber] = p.firstSeen || prev.scrapedAt;
    }
  } catch { /* first run */ }

  // Fetch last week + last month data for freshest results
  const urls = [
    { url: "https://csjpbce.sanjoseca.gov/reportviewer/permitdataWeeks/PDIssue_latestWeek.txt", label: "Last week" },
    { url: "https://csjpbce.sanjoseca.gov/reportviewer/permitdataMonths/PDIssue_latest.txt", label: "Last month" },
  ];

  const allPermits = new Map(); // keyed by permit number to dedup

  for (const { url, label } of urls) {
    try {
      const text = await fetchPermitData(url);
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) continue;

      const header = lines[0].split("\t").map(h => h.trim());
      console.log(`${label}: ${lines.length - 1} permits`);

      for (let i = 1; i < lines.length; i++) {
        const raw = parsePermitLine(header, lines[i]);
        if (!raw) continue;

        const apn = raw.APN || "";
        const zip = apnToZip(apn);
        if (!zip || !ZIP_TO_NEIGHBORHOOD[zip]) continue;

        if (!isQualifyingPermit(raw)) continue;

        // Skip permits that already have a GC/builder on record — not a lead for us
        const contractor = (raw.CONTRACTOR || "").trim();
        if (contractor) continue;

        const permitNumber = (raw.FOLDERNUMBER || "").trim();
        if (!permitNumber || allPermits.has(permitNumber)) continue;

        const address = extractAddress(raw.JOBLOCATION || "");
        const jobDesc = extractJobDescription(raw.JOBLOCATION || "");
        const { category, scope } = classifyProject(raw);
        const sqft = parseInt(raw.SQFT) || 0;
        const neighborhood = ZIP_TO_NEIGHBORHOOD[zip];
        const now = new Date().toISOString();

        allPermits.set(permitNumber, {
          address: `${address}, San Jose`,
          city: "San Jose",
          neighborhood,
          zip,
          appNumber: permitNumber,
          appType: raw.WORKDESC || "",
          description: `${jobDesc || raw.JOBLOCATION || ""} — Contractor: ${(raw.CONTRACTOR || "Owner").trim()}. APN: ${apn}.`,
          overview: `${scope} in ${neighborhood}. ${sqft > 0 ? `${sqft.toLocaleString()} SF.` : ""} Permit ${(raw.PERMITAPPROVALS || "").trim()}.`.trim(),
          existingSF: category === "New Construction" ? 0 : null,
          proposedSF: sqft > 0 ? sqft : null,
          sfNote: sqft > 0 ? `${sqft.toLocaleString()} SF per permit` : "SF not listed on permit",
          dateFiled: raw.ISSUEDATE ? formatDate(raw.ISSUEDATE) : "",
          status: (raw.PERMITAPPROVALS || "Pending").trim(),
          planner: "City of San Jose",
          category,
          scope,
          zoning: "",
          apn,
          pageUrl: `https://permits.sanjoseca.gov/search`,
          docs: [],
          permitNumber,
          contractor: (raw.CONTRACTOR || "").trim(),
          valuation: parseInt(raw.PERMITVALUATION) || 0,
          firstSeen: previousProjects[permitNumber] || now,
          source: "sjpermits-data",
        });
      }
    } catch (err) {
      console.error(`Error fetching ${label}:`, err.message);
    }
  }

  const projects = [...allPermits.values()];
  console.log(`\nFound ${projects.length} qualifying SFR permits in target areas`);

  // Show summary
  const byHood = {};
  for (const p of projects) {
    byHood[p.neighborhood] = (byHood[p.neighborhood] || 0) + 1;
  }
  console.log("By neighborhood:", byHood);

  const result = {
    projects,
    scrapedAt: new Date().toISOString(),
    source: "sjpermits.org permit data files",
    targetZips: Object.keys(ZIP_TO_NEIGHBORHOOD),
  };

  await writeFile(OUT_PATH, JSON.stringify(result, null, 2));
  console.log(`Saved to ${OUT_PATH}`);
}

function formatDate(dateStr) {
  // "29-MAR-26" → "2026-03-29"
  const months = { JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06", JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12" };
  const match = dateStr.match(/(\d{2})-([A-Z]{3})-(\d{2})/);
  if (!match) return "";
  const [, day, mon, yr] = match;
  const year = parseInt(yr) > 50 ? `19${yr}` : `20${yr}`;
  return `${year}-${months[mon] || "01"}-${day}`;
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
