#!/usr/bin/env node
// San Jose Open Data Portal scraper
// Source: data.sanjoseca.gov CKAN Datastore API (CC0 license, updated daily)
// Pulls from 3 datasets:
//   1. Active Building Permits — issued, no contractor = needs a GC
//   2. Last 30 Days Planning Permits — earliest stage, no contractor field = best leads
//   3. Last 60-180 Days Planning Permits — pipeline leads in plan review

import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "sanjose-scraped.json");

const API_BASE = "https://data.sanjoseca.gov/api/3/action/datastore_search_sql";

// Dataset resource IDs — planning permits only (pre-construction leads)
const DATASETS = {
  planning30: "711a7de0-217c-4bd7-98b9-e1b1d02ea187",
  planning60_180: "a6df12fb-ca4b-49e8-8cde-d444b112877b",
};

// APN prefix → neighborhood
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

function isSignificantBuildingWork(folderName) {
  const fn = (folderName || "").toUpperCase();
  if (/MINOR.*KITCHEN|MINOR.*BATH|WINDOW.*REPLAC|PATIO.*DOOR|REROOF|PANEL.*UPGRADE|EVCS|EV.*CHARGER|WATER.*HEATER|FURNACE|BRACE.*BOLT|PATIO.*COVER|REMOVE.*PATIO|PERMIT.*TO.*FINAL|BLDG.*FINAL|FIRE.*DAMAGE|CODE.*CASE/i.test(fn)) return false;
  if (/DEMO|REBUILD|NEW.*RESID|NEW.*SFR|NEW.*HOME|ADDITION|ADD\/|ADD\s|REMODEL|SECOND.*STORY|2ND.*STORY|ADU|ACCESSORY.*DWELLING|GARAGE|ALTERATION|ALTER/i.test(fn)) return true;
  return false;
}

function isCompleted(permitApprovals) {
  const s = (permitApprovals || "").toLowerCase();
  if (!s || s === "active") return false;
  // Only complete if ALL 4 disciplines (B, E, M, P) show complete
  const hasB = /b[-\s]*(?:4\.\s*)?complete/i.test(s);
  const hasE = /e[-\s]*(?:4\.\s*)?complete/i.test(s);
  const hasM = /m[-\s]*(?:4\.\s*)?complete/i.test(s);
  const hasP = /p[-\s]*(?:4\.\s*)?complete/i.test(s);
  return hasB && hasE && hasM && hasP;
}

function classifyPermit(folderName, workDesc) {
  const fn = (folderName || "").toUpperCase();
  const work = workDesc || "";
  let category = "Addition";
  let scope = "Residential Work";

  if (work === "New Construction" || /DEMO.*REBUILD|DEMO.*NEW|NEW.*RESID|NEW.*SFR|NEW.*HOME/i.test(fn)) {
    category = "New Construction";
    scope = /DEMO/i.test(fn) ? "Custom Home (Demo/Rebuild)" : "New SFR";
  } else if (/SECOND.*STORY|2ND.*STORY/i.test(fn)) {
    scope = "Second-Story Addition";
  } else if (/ADU|ACCESSORY.*DWELLING/i.test(fn)) {
    scope = "ADU / Accessory Dwelling";
  } else if (/GARAGE/i.test(fn)) {
    scope = "Garage (New/Rebuild)";
  } else if (/ADDITION|ADD\//i.test(fn)) {
    scope = "Residential Addition";
  } else if (/REMODEL/i.test(fn)) {
    scope = "Major Remodel";
  } else {
    scope = "Residential Alteration";
  }

  return { category, scope };
}

function parseDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split(" ")[0].split("/");
  if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  return "";
}

function cleanAddress(folderName) {
  return (folderName || "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}

async function queryDatastore(sql) {
  const url = `${API_BASE}?sql=${encodeURIComponent(sql)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.success) throw new Error(`API error: ${JSON.stringify(data)}`);
  return data.result.records;
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

  const now = new Date().toISOString();
  const allProjects = new Map(); // keyed by permit number to dedup

  // Building permits skipped — if inspections are happening, they already have a GC.
  // Only planning permits are valid leads (pre-construction, no builder hired).

  // === 1. Planning Permits (last 30 days) — earliest stage, best leads ===
  console.log("1. Querying Planning Permits (last 30 days)...");
  const planningRecords30 = await queryDatastore(
    `SELECT * FROM "${DATASETS.planning30}" ORDER BY "ISSUEDATE" DESC LIMIT 200`
  );
  console.log(`   Raw: ${planningRecords30.length} planning applications`);

  let planning30Count = 0;
  for (const r of planningRecords30) {
    const apn = (r.ASSESSORS_PARCEL_NUMBER || "").trim();
    const neighborhood = getNeighborhood(apn);
    if (!neighborhood) continue;

    const permitNumber = (r.FOLDERNUMBER || "").trim();
    if (!permitNumber || allProjects.has(permitNumber)) continue;

    const folderName = r.FOLDERNAME || r.FOLDERDESCRIPTION || "";
    const subDesc = (r.SUBDESCRIPTION || "").toLowerCase();
    // Skip non-residential planning apps
    if (/commercial|industrial|office|retail|hotel|antenna|cell/i.test(subDesc)) continue;

    const { category, scope } = classifyPermit(folderName, r.WORKDESCRIPTION);
    const applicant = (r.APPLICANT || "").trim();
    const owner = (r.OWNERNAME || "").trim();
    const zoning = (r.ZONING || "").trim();
    const projectMgr = (r.PROJECTMANAGER || "").trim();

    allProjects.set(permitNumber, {
      address: `${cleanAddress(folderName)}, San Jose`,
      city: "San Jose",
      neighborhood,
      appNumber: permitNumber,
      appType: r.FOLDERDESCRIPTION || "Planning Application",
      description: `${folderName} — Applicant: ${applicant}. Owner: ${owner}. Zoning: ${zoning}. Ref: ${r.REFERENCEFILE || ""}.`,
      overview: `Planning application in ${neighborhood}. In plan review — no contractor yet. Early-stage lead.`,
      existingSF: null, proposedSF: null,
      sfNote: "In planning review — SF will be on building permit",
      dateFiled: parseDate(r.ISSUEDATE),
      status: "In Plan Review",
      planner: projectMgr || "City of San Jose",
      category, scope, zoning,
      apn, pageUrl: "https://permits.sanjoseca.gov/search",
      docs: [], permitNumber, owner,
      valuation: 0,
      firstSeen: previousProjects[permitNumber] || now,
      dataSource: "sj-opendata-planning-30",
      lastVerified: now,
      permitStage: "Planning Review",
    });
    planning30Count++;
  }
  console.log(`   Filtered: ${planning30Count} leads in target neighborhoods`);

  // === 3. Planning Permits (60-180 days) — pipeline leads ===
  console.log("2. Querying Planning Permits (60-180 days)...");
  const planningRecords180 = await queryDatastore(
    `SELECT * FROM "${DATASETS.planning60_180}" ORDER BY "ISSUEDATE" DESC LIMIT 600`
  );
  console.log(`   Raw: ${planningRecords180.length} planning applications`);

  let planning180Count = 0;
  for (const r of planningRecords180) {
    const apn = (r.ASSESSORS_PARCEL_NUMBER || "").trim();
    const neighborhood = getNeighborhood(apn);
    if (!neighborhood) continue;

    const permitNumber = (r.FOLDERNUMBER || "").trim();
    if (!permitNumber || allProjects.has(permitNumber)) continue;

    const folderName = r.FOLDERNAME || r.FOLDERDESCRIPTION || "";
    const subDesc = (r.SUBDESCRIPTION || "").toLowerCase();
    if (/commercial|industrial|office|retail|hotel|antenna|cell/i.test(subDesc)) continue;

    const { category, scope } = classifyPermit(folderName, r.WORKDESCRIPTION);
    const applicant = (r.APPLICANT || "").trim();
    const owner = (r.OWNERNAME || "").trim();
    const zoning = (r.ZONING || "").trim();
    const projectMgr = (r.PROJECTMANAGER || "").trim();

    allProjects.set(permitNumber, {
      address: `${cleanAddress(folderName)}, San Jose`,
      city: "San Jose",
      neighborhood,
      appNumber: permitNumber,
      appType: r.FOLDERDESCRIPTION || "Planning Application",
      description: `${folderName} — Applicant: ${applicant}. Owner: ${owner}. Zoning: ${zoning}. Ref: ${r.REFERENCEFILE || ""}.`,
      overview: `Planning application in ${neighborhood}. In review 60-180 days — pipeline lead.`,
      existingSF: null, proposedSF: null,
      sfNote: "In planning review — SF will be on building permit",
      dateFiled: parseDate(r.ISSUEDATE),
      status: "In Plan Review (60-180 days)",
      planner: projectMgr || "City of San Jose",
      category, scope, zoning,
      apn, pageUrl: "https://permits.sanjoseca.gov/search",
      docs: [], permitNumber, owner,
      valuation: 0,
      firstSeen: previousProjects[permitNumber] || now,
      dataSource: "sj-opendata-planning-180",
      lastVerified: now,
      permitStage: "Planning Review",
    });
    planning180Count++;
  }
  console.log(`   Filtered: ${planning180Count} leads in target neighborhoods`);

  // === Summary ===
  const projects = [...allProjects.values()];
  console.log(`\nTotal: ${projects.length} leads`);

  const byHood = {}, byCat = {}, byStage = {};
  for (const p of projects) {
    byHood[p.neighborhood] = (byHood[p.neighborhood] || 0) + 1;
    byCat[p.category] = (byCat[p.category] || 0) + 1;
    byStage[p.permitStage] = (byStage[p.permitStage] || 0) + 1;
  }
  console.log("By neighborhood:", byHood);
  console.log("By category:", byCat);
  console.log("By stage:", byStage);

  const result = {
    projects,
    scrapedAt: now,
    source: "San Jose Open Data Portal (data.sanjoseca.gov)",
    datasets: ["active-building-permits", "last-30-days-planning-permits", "last-60-180-days-planning-permits"],
    dataLicense: "CC0",
  };

  await writeFile(OUT_PATH, JSON.stringify(result, null, 2));
  console.log(`\nSaved to ${OUT_PATH}`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
