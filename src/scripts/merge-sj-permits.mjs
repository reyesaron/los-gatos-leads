#!/usr/bin/env node
// Phase 2: Merge scraped SJ permits into the app's data layer
// Reads sanjose-scraped.json, deduplicates against existing projects,
// and outputs a merged JSON that page.js can load

import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRAPED_PATH = path.join(__dirname, "..", "data", "sanjose-scraped.json");
const MERGED_PATH = path.join(__dirname, "..", "data", "sanjose-merged.json");

async function main() {
  let scraped;
  try {
    scraped = JSON.parse(await readFile(SCRAPED_PATH, "utf-8"));
  } catch {
    console.error("No sanjose-scraped.json found. Run npm run scrape:sj first.");
    process.exit(1);
  }

  // Load previous merged data to preserve firstSeen across runs
  let previousMerged = {};
  try {
    const prev = JSON.parse(await readFile(MERGED_PATH, "utf-8"));
    for (const p of prev.projects || []) {
      const key = p.appNumber || p.address;
      previousMerged[key] = p.firstSeen || prev.scrapedAt;
    }
  } catch { /* first run */ }

  const now = new Date().toISOString();
  const projects = [];

  for (const p of scraped.projects) {
    const key = p.permitNumber || p.address;
    projects.push({
      address: titleCase(p.address),
      city: "San Jose",
      neighborhood: p.neighborhood || "",
      appNumber: p.appNumber || "",
      appType: cleanField(p.appType),
      description: p.description || "",
      overview: p.overview || "",
      existingSF: p.existingSF,
      proposedSF: p.proposedSF,
      sfNote: p.sfNote || "",
      dateFiled: p.dateFiled || "",
      status: cleanField(p.status),
      planner: p.planner || "City of San Jose",
      category: p.category || "Addition",
      scope: p.scope || "Residential Work",
      zoning: p.zoning || "",
      apn: cleanField(p.apn),
      pageUrl: p.pageUrl || "https://permits.sanjoseca.gov/search",
      docs: p.docs || [],
      firstSeen: previousMerged[key] || p.firstSeen || now,
      source: "sjpermits-data",
    });
  }

  const result = {
    projects,
    scrapedAt: scraped.scrapedAt || now,
    mergedAt: now,
  };

  await writeFile(MERGED_PATH, JSON.stringify(result, null, 2));
  console.log(`Merged ${projects.length} San Jose permits → ${MERGED_PATH}`);

  // Summary
  const byCategory = {};
  const byHood = {};
  for (const p of projects) {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    byHood[p.neighborhood] = (byHood[p.neighborhood] || 0) + 1;
  }
  console.log("By category:", byCategory);
  console.log("By neighborhood:", byHood);
}

function titleCase(str) {
  return str.replace(/\b\w+/g, w =>
    w.length <= 2 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()
  ).replace(/\bSan Jose\b/gi, "San Jose").replace(/\bAv\b/g, "Ave").replace(/\bDr\b/g, "Dr").replace(/\bSt\b/g, "St").replace(/\bCt\b/g, "Ct").replace(/\bLn\b/g, "Ln").replace(/\bWy\b/g, "Way").replace(/\bBl\b/g, "Blvd").replace(/\bRd\b/g, "Rd").replace(/\bPl\b/g, "Pl");
}

function cleanField(str) {
  return (str || "").trim().replace(/\s{2,}/g, " ");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
