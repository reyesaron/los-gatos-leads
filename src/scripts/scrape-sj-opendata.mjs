#!/usr/bin/env node
// San Jose Open Data Portal scraper — replaces the old tab-delimited file approach
// Source: data.sanjoseca.gov CKAN Datastore API (CC0 license, updated daily)
// Only pulls SFR permits without a contractor on record = actual leads

import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "sanjose-scraped.json");

const RESOURCE_ID = "761b7ae8-3be1-4ad6-923d-c7af6404a904";
const API_BASE = "https://data.sanjoseca.gov/api/3/action/datastore_search_sql";

const SFR_TYPES = ["Single-Family", "1 & 2 Family Residential", "Single Dwelling Unit"];
const WORK_TYPES = ["New Construction", "Additions/Alterations", "Demolition"];

// APN prefix → zip → neighborhood
const APN_TO_NEIGHBORHOOD = {
  // Almaden Valley (95120)
  "562": "Almaden Valley", "563": "Almaden Valley", "564": "Almaden Valley",
  "565": "Almaden Valley", "566": "Almaden Valley", "567": "Almaden Valley",
  "568": "Almaden Valley", "569": "Almaden Valley", "570": "Almaden Valley",
  "571": "Almaden Valley", "572": "Almaden Valley", "573": "Almaden Valley",
  "574": "Almaden Valley", "575": "Almaden Valley", "576": "Almaden Valley",
  "577": "Almaden Valley", "578": "Almaden Valley", "579": "Almaden Valley",
  "580": "Almaden Valley", "581": "Almaden Valley", "582": "Almaden Valley",
  "583": "Almaden Valley", "584": "Almaden Valley", "585": "Almaden Valley",
  "586": "Almaden Valley", "587": "Almaden Valley", "588": "Almaden Valley",
  "589": "Almaden Valley",
  // Willow Glen (95125, 95126)
  "254": "Willow Glen", "255": "Willow Glen", "256": "Willow Glen",
  "257": "Willow Glen", "258": "Willow Glen", "259": "Willow Glen",
  "261": "Willow Glen", "262": "Willow Glen", "263": "Willow Glen",
  "264": "Willow Glen", "265": "Willow Glen",
  "410": "Willow Glen", "411": "Willow Glen", "412": "Willow Glen",
  "413": "Willow Glen", "414": "Willow Glen",
  "429": "Willow Glen", "430": "Willow Glen", "431": "Willow Glen",
  "432": "Willow Glen", "433": "Willow Glen", "434": "Willow Glen",
  "435": "Willow Glen", "436": "Willow Glen", "437": "Willow Glen",
  "438": "Willow Glen",
  // Cambrian (95124)
  "439": "Cambrian", "440": "Cambrian", "441": "Cambrian",
  "442": "Cambrian", "443": "Cambrian", "444": "Cambrian",
  "445": "Cambrian", "446": "Cambrian", "447": "Cambrian",
  "448": "Cambrian", "486": "Cambrian", "487": "Cambrian",
  "488": "Cambrian",
  // West San Jose (95128, 95129, 95117)
  "297": "West San Jose", "298": "West San Jose", "299": "West San Jose",
  "300": "West San Jose", "301": "West San Jose", "302": "West San Jose",
  "303": "West San Jose", "304": "West San Jose",
  "372": "West San Jose", "373": "West San Jose", "374": "West San Jose",
  "375": "West San Jose", "376": "West San Jose", "377": "West San Jose",
  "378": "West San Jose",
};

function getNeighborhood(apn) {
  if (!apn) return null;
  const prefix = apn.replace(/\s/g, "").slice(0, 3);
  return APN_TO_NEIGHBORHOOD[prefix] || null;
}

function isSignificantWork(folderName) {
  const fn = (folderName || "").toUpperCase();
  // Filter out minor work
  if (/MINOR.*KITCHEN|MINOR.*BATH|WINDOW.*REPLAC|PATIO.*DOOR|REROOF|PANEL.*UPGRADE|EVCS|EV.*CHARGER|WATER.*HEATER|FURNACE|BRACE.*BOLT|PATIO.*COVER|REMOVE.*PATIO|PERMIT.*TO.*FINAL|BLDG.*FINAL|FIRE.*DAMAGE|CODE.*CASE/i.test(fn)) return false;
  // Must be significant work
  if (/DEMO|REBUILD|NEW.*RESID|NEW.*SFR|NEW.*HOME|ADDITION|ADD\/|ADD\s|REMODEL|SECOND.*STORY|2ND.*STORY|ADU|ACCESSORY.*DWELLING|GARAGE|ALTERATION|ALTER/i.test(fn)) return true;
  return false;
}

function classifyPermit(record) {
  const fn = (record.FOLDERNAME || "").toUpperCase();
  const work = record.WORKDESCRIPTION || "";
  const sqft = parseInt(record.SQUAREFOOTAGE) || 0;

  let category = "Addition";
  let scope = "Residential Work";

  if (work === "New Construction" || /DEMO.*REBUILD|DEMO.*NEW|NEW.*RESID|NEW.*SFR|NEW.*HOME/i.test(fn)) {
    category = "New Construction";
    scope = /DEMO/i.test(fn) ? "Custom Home (Demo/Rebuild)" : "New SFR";
    if (sqft > 0) scope += ` (${sqft.toLocaleString()} SF)`;
  } else if (/SECOND.*STORY|2ND.*STORY/i.test(fn)) {
    scope = "Second-Story Addition";
  } else if (/ADU|ACCESSORY.*DWELLING/i.test(fn)) {
    scope = "ADU / Accessory Dwelling";
  } else if (/GARAGE/i.test(fn)) {
    scope = "Garage (New/Rebuild)";
  } else if (/ADDITION|ADD\//i.test(fn)) {
    scope = sqft > 0 ? `Residential Addition (${sqft.toLocaleString()} SF)` : "Residential Addition";
  } else if (/REMODEL/i.test(fn)) {
    scope = "Major Remodel";
  } else {
    scope = "Residential Alteration";
  }

  return { category, scope };
}

function extractAddress(folderName) {
  // Remove permit codes like (BEPM100%), (B100%), etc.
  return (folderName || "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}

async function main() {
  // Load previous data for firstSeen tracking
  let previousProjects = {};
  try {
    const prev = JSON.parse(await readFile(OUT_PATH, "utf-8"));
    for (const p of prev.projects || []) {
      previousProjects[p.permitNumber || p.appNumber] = p.firstSeen || prev.scrapedAt;
    }
  } catch { /* first run */ }

  const sfrTypes = SFR_TYPES.map(t => `'${t}'`).join(",");
  const workTypes = WORK_TYPES.map(t => `'${t}'`).join(",");

  // Query: SFR permits, no contractor, new construction + additions, recent (last 2 years)
  const sql = `SELECT * FROM "${RESOURCE_ID}" WHERE "SUBTYPEDESCRIPTION" IN (${sfrTypes}) AND "CONTRACTOR" IS NULL AND "WORKDESCRIPTION" IN (${workTypes}) AND "ISSUEDATE" > '2024-01-01' ORDER BY "ISSUEDATE" DESC LIMIT 500`;

  console.log("Querying San Jose Open Data Portal...");

  const url = `${API_BASE}?sql=${encodeURIComponent(sql)}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.success) {
    console.error("API error:", data);
    process.exit(1);
  }

  const records = data.result.records;
  console.log(`Raw results: ${records.length} permits`);

  const now = new Date().toISOString();
  const projects = [];

  for (const r of records) {
    const folderName = r.FOLDERNAME || "";
    if (!isSignificantWork(folderName)) continue;

    const apn = (r.ASSESSORS_PARCEL_NUMBER || "").trim();
    const neighborhood = getNeighborhood(apn);
    if (!neighborhood) continue; // Not in our target areas

    const permitNumber = (r.FOLDERNUMBER || "").trim();
    const { category, scope } = classifyPermit(r);
    const sqft = parseInt(r.SQUAREFOOTAGE) || 0;
    const address = extractAddress(folderName);
    const owner = (r.OWNERNAME || "").trim();
    const issueDate = r.ISSUEDATE ? r.ISSUEDATE.split(" ")[0].replace(/(\d+)\/(\d+)\/(\d+)/, "$3-$1-$2").replace(/-(\d)(?=\/|-|$)/g, "-0$1") : "";
    // Reformat date: M/D/YYYY → YYYY-MM-DD
    let dateFiled = "";
    if (r.ISSUEDATE) {
      const parts = r.ISSUEDATE.split(" ")[0].split("/");
      if (parts.length === 3) {
        dateFiled = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
      }
    }

    projects.push({
      address: `${address}, San Jose`,
      city: "San Jose",
      neighborhood,
      appNumber: permitNumber,
      appType: r.WORKDESCRIPTION || "",
      description: `${folderName} — Owner: ${owner}. APN: ${apn}. Valuation: $${(parseInt(r.PERMITVALUATION) || 0).toLocaleString()}.`,
      overview: `${scope} in ${neighborhood}. ${sqft > 0 ? `${sqft.toLocaleString()} SF.` : ""} No contractor on record.`.trim(),
      existingSF: category === "New Construction" ? 0 : null,
      proposedSF: sqft > 0 ? sqft : null,
      sfNote: sqft > 0 ? `${sqft.toLocaleString()} SF per permit` : "SF not listed on permit",
      dateFiled,
      status: (r.PERMITAPPROVALS || r.Status || "Active").trim(),
      planner: "City of San Jose",
      category,
      scope,
      zoning: "",
      apn,
      pageUrl: "https://permits.sanjoseca.gov/search",
      docs: [],
      permitNumber,
      owner,
      valuation: parseInt(r.PERMITVALUATION) || 0,
      firstSeen: previousProjects[permitNumber] || now,
      dataSource: "sj-opendata",
      lastVerified: now,
    });
  }

  console.log(`Filtered to ${projects.length} leads in target neighborhoods`);

  // Summary
  const byHood = {};
  const byCat = {};
  for (const p of projects) {
    byHood[p.neighborhood] = (byHood[p.neighborhood] || 0) + 1;
    byCat[p.category] = (byCat[p.category] || 0) + 1;
  }
  console.log("By neighborhood:", byHood);
  console.log("By category:", byCat);

  const result = {
    projects,
    scrapedAt: now,
    source: "San Jose Open Data Portal (data.sanjoseca.gov)",
    dataLicense: "CC0",
  };

  await writeFile(OUT_PATH, JSON.stringify(result, null, 2));
  console.log(`Saved to ${OUT_PATH}`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
