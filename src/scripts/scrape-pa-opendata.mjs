#!/usr/bin/env node
// Palo Alto Open Data Portal scraper
// Source: data.paloalto.gov — CSV download, updated daily
// Only pulls SFR permits without a contractor, active status, significant work

import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "paloalto-scraped.json");

// Most recent dataset (Mar 2025 - Apr 2026)
const CSV_URL = "https://data.paloalto.gov/rest/datastreams/297311/data.csv";

// Only pre-construction statuses — if permit is issued, they likely have a builder
const ACTIVE_STATUSES = new Set([
  "Pending Resubmittal", "In Plan Check",
  "Submitted", "Pending Main Permit Approval",
  "Incomplete",
]);

const MINOR_WORK = /reroof|re-roof|water heater|furnace|panel upgrade|ev charger|pv panel|solar|photovoltaic|electrical panel|smoke detector|fire alarm/i;

function isSignificant(desc) {
  if (MINOR_WORK.test(desc)) return false;
  // Focus on significant residential construction — our sweet spot
  return /new.*residen|construct.*residen|single family|addition.*residen|residen.*addition|remodel|deconstr|demolit|adu|accessory dwelling|basement|second.story|2nd.story/i.test(desc);
}

function classifyPermit(desc) {
  const d = desc.toLowerCase();
  let category = "Addition";
  let scope = "Residential Work";

  if (/deconstr|demolit.*construct|new.*single family|new.*residen|construct.*single family|construct.*residen/i.test(d)) {
    category = "New Construction";
    scope = /deconstr|demolit/i.test(d) ? "Custom Home (Demo/Rebuild)" : "New SFR";
  } else if (/second.story|2nd.story/i.test(d)) {
    scope = "Second-Story Addition";
  } else if (/\badu\b|accessory dwelling/i.test(d)) {
    scope = "ADU / Accessory Dwelling";
  } else if (/pool|spa/i.test(d)) {
    scope = "Pool / Spa";
  } else if (/garage/i.test(d)) {
    scope = "Garage";
  } else if (/addition/i.test(d)) {
    scope = "Residential Addition";
  } else if (/remodel|alteration/i.test(d)) {
    scope = "Major Remodel";
  } else if (/basement/i.test(d)) {
    scope = "Basement";
  }

  // Extract SF if mentioned
  const sfMatch = d.match(/(\d[,\d]*)\s*(?:sf|sq(?:uare)?\s*f)/i);
  if (sfMatch) {
    const sf = parseInt(sfMatch[1].replace(/,/g, ""));
    if (sf > 0) scope += ` (${sf.toLocaleString()} SF)`;
  }

  return { category, scope };
}

function parseDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  return "";
}

function parseCSV(text) {
  const lines = text.split("\n");
  if (lines.length < 2) return [];

  // Handle BOM
  const headerLine = lines[0].replace(/^\uFEFF/, "");
  const headers = parseCSVLine(headerLine);

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const record = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = (values[j] || "").trim();
    }
    records.push(record);
  }
  return records;
}

function parseCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
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

  console.log("Downloading Palo Alto permit data...");
  const res = await fetch(CSV_URL);
  const text = await res.text();
  const records = parseCSV(text);
  console.log(`Raw records: ${records.length}`);

  const now = new Date().toISOString();
  const projects = [];

  for (const r of records) {
    const status = r["RECORD STATUS"] || "";
    if (!ACTIVE_STATUSES.has(status)) continue;

    const gc = (r["BUSINESS NAME"] || "").trim();
    if (gc) continue; // Has contractor — not a lead

    const desc = r["DESCRIPTION"] || "";
    if (!isSignificant(desc)) continue;

    const permitNumber = (r["RECORD ID"] || "").trim();
    const address = (r["ADDR FULL LINE"] || "").trim();
    const apn = (r["APN"] || "").trim();
    const valuation = (r["JOB VALUE"] || "").replace(/[$,]/g, "");
    const { category, scope } = classifyPermit(desc);

    // Extract SF from description
    const sfMatch = desc.match(/(\d[,\d]*)\s*(?:sf|sq(?:uare)?\s*f)/i);
    const sqft = sfMatch ? parseInt(sfMatch[1].replace(/,/g, "")) : 0;

    projects.push({
      address: address || `${permitNumber}, Palo Alto`,
      city: "Palo Alto",
      neighborhood: "",
      appNumber: permitNumber,
      appType: "Building Permit",
      description: desc,
      overview: `${scope} in Palo Alto. ${status}. No contractor on record.`,
      existingSF: category === "New Construction" ? 0 : null,
      proposedSF: sqft > 0 ? sqft : null,
      sfNote: sqft > 0 ? `${sqft.toLocaleString()} SF per permit` : "Check plans for SF",
      dateFiled: parseDate(r["DATE OPENED"]),
      status,
      planner: "City of Palo Alto",
      category,
      scope,
      zoning: "",
      apn,
      pageUrl: "https://aca-prod.accela.com/PALOALTO/",
      docs: [],
      permitNumber,
      valuation: parseInt(valuation) || 0,
      firstSeen: previousProjects[permitNumber] || now,
      dataSource: "pa-opendata",
      lastVerified: now,
      permitStage: status.includes("Plan Check") || status.includes("Resubmittal") || status.includes("Submitted") || status.includes("Incomplete") ? "Planning Review" : "Issued",
    });
  }

  console.log(`Filtered to ${projects.length} SFR leads`);

  const byCat = {};
  const byStage = {};
  for (const p of projects) {
    byCat[p.category] = (byCat[p.category] || 0) + 1;
    byStage[p.permitStage] = (byStage[p.permitStage] || 0) + 1;
  }
  console.log("By category:", byCat);
  console.log("By stage:", byStage);

  const result = {
    projects,
    scrapedAt: now,
    source: "Palo Alto Open Data Portal (data.paloalto.gov)",
    dataLicense: "Open Data",
  };

  await writeFile(OUT_PATH, JSON.stringify(result, null, 2));
  console.log(`Saved to ${OUT_PATH}`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
