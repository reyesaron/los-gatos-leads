#!/usr/bin/env node
// Cupertino Accela scraper — public search, no credentials needed
// Searches Residential New, Residential Addition, Residential Demolition
// Filters: pre-construction status only, excludes completed permits

import { chromium } from "playwright";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "cupertino-scraped.json");

const BASE_URL = "https://aca-prod.accela.com/CUPERTINO/Cap/CapHome.aspx?module=Building&TabName=Building";

const PERMIT_TYPES = ["Residential New", "Residential Addition", "Residential Demolition"];

// Only keep pre-construction statuses
const VALID_STATUSES = new Set(["Submitted", "Plan Review", "Plan Check", "Pending", "Under Review", "Corrections Required", "Approved", "Pay Fees Due"]);
const EXCLUDED_STATUSES = new Set(["Finaled", "Expired", "Void", "Cancelled", "Withdrawn"]);

// Skip minor work
const MINOR_WORK = /water heater|furnace|re-roof|reroof|panel upgrade|ev charger|solar|photovoltaic|smoke detector|siding/i;

function parseRow(text) {
  // Format: "MM/DD/YYYY BLD-YYYY-NNNN Type Address, City CA ZIP Status Description"
  const dateMatch = text.match(/^(\d{2}\/\d{2}\/\d{4})/);
  const permitMatch = text.match(/(BLD-\d{4}-\d{4})/);
  const addressMatch = text.match(/(?:Residential (?:New|Addition|Demolition|Alteration))\s+(.+?),\s*Cupertino\s*CA\s*(\d{5}(?:-\d{4})?)/i);
  const statusMatch = text.match(/(?:Cupertino\s*CA\s*\d{5}(?:-\d{4})?)\s+(Submitted|Plan Review|Plan Check|Pending|Under Review|Corrections Required|Approved|Pay Fees Due|Finaled|Expired|Void|Cancelled)/i);
  const descStart = statusMatch ? text.indexOf(statusMatch[0]) + statusMatch[0].length : -1;

  if (!permitMatch || !addressMatch) return null;

  // Extract description — everything after the status (and optional "Pay Fees Due")
  let description = "";
  if (descStart > 0) {
    description = text.slice(descStart).replace(/^[\s]*(?:Pay Fees Due)?[\s]*/, "").trim();
    // Remove trailing duplicate address
    const addrIdx = description.lastIndexOf(addressMatch[1]);
    if (addrIdx > 0) description = description.slice(0, addrIdx).trim();
  }

  return {
    date: dateMatch?.[1] || "",
    permitNumber: permitMatch[1],
    address: addressMatch[1].trim(),
    zip: addressMatch[2],
    status: statusMatch?.[1] || "Unknown",
    description,
  };
}

function classifyPermit(desc, permitType) {
  const d = desc.toLowerCase();
  let category = permitType.includes("New") ? "New Construction" : "Addition";
  let scope = "Residential Work";

  if (/new.*(?:single family|sfr|dwelling)|(?:single family|sfr).*new/i.test(d)) {
    category = "New Construction";
    const sfMatch = d.match(/(\d[,\d]*)\s*(?:s\.?f\.?|sf|sq)/i);
    scope = sfMatch ? `New SFR (${sfMatch[1]} SF)` : "New SFR";
  } else if (/\badu\b|accessory dwelling|detached.*adu|attached.*adu/i.test(d)) {
    scope = "ADU / Accessory Dwelling";
    const sfMatch = d.match(/(\d[,\d]*)\s*(?:s\.?f\.?|sf|sq)/i);
    if (sfMatch) scope += ` (${sfMatch[1]} SF)`;
  } else if (/demo|demolish/i.test(d)) {
    category = "New Construction";
    scope = "Demolition / Rebuild";
  } else if (/addition/i.test(d)) {
    const sfMatch = d.match(/(\d[,\d]*)\s*(?:s\.?f\.?|sf|sq)/i);
    scope = sfMatch ? `Residential Addition (${sfMatch[1]} SF)` : "Residential Addition";
  } else if (/garage/i.test(d)) {
    scope = "Garage";
  } else if (/remodel|alteration/i.test(d)) {
    scope = "Major Remodel";
  }

  return { category, scope };
}

function parseDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length === 3) return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  return "";
}

async function scrapePermitType(browser, permitType) {
  const page = await browser.newPage();
  const results = [];

  try {
    console.log(`  Searching: ${permitType}`);
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    // Select permit type
    await page.selectOption("#ctl00_PlaceHolderMain_generalSearchForm_ddlGSPermitType", permitType);

    // Date range — last 12 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    await page.fill("#ctl00_PlaceHolderMain_generalSearchForm_txtGSStartDate",
      `${(startDate.getMonth()+1).toString().padStart(2,"0")}/${startDate.getDate().toString().padStart(2,"0")}/${startDate.getFullYear()}`);
    await page.fill("#ctl00_PlaceHolderMain_generalSearchForm_txtGSEndDate",
      `${(endDate.getMonth()+1).toString().padStart(2,"0")}/${endDate.getDate().toString().padStart(2,"0")}/${endDate.getFullYear()}`);

    // Search
    await page.click("#ctl00_PlaceHolderMain_btnNewSearch");
    await page.waitForTimeout(5000);

    // Check if results exist
    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes("No matching records")) {
      console.log(`  No results for ${permitType}`);
      await page.close();
      return [];
    }

    // Scrape all pages
    let pageNum = 1;
    while (true) {
      console.log(`  Page ${pageNum}...`);

      const rows = await page.$$eval("table[id*='gdvPermit'] tr.ACA_TabRow_Odd, table[id*='gdvPermit'] tr.ACA_TabRow_Even, div.ACA_Grid_OverFlow table tbody tr", els =>
        els.map(e => e.textContent?.trim().replace(/\s+/g, " ")).filter(t => t && t.includes("BLD-"))
      );

      for (const rowText of rows) {
        const parsed = parseRow(rowText);
        if (!parsed) continue;
        if (EXCLUDED_STATUSES.has(parsed.status)) continue;
        if (!VALID_STATUSES.has(parsed.status)) continue;
        if (MINOR_WORK.test(parsed.description)) continue;
        results.push({ ...parsed, permitType });
      }

      // Check for next page
      const hasNext = await page.evaluate(() => {
        const links = [...document.querySelectorAll("a")];
        return links.some(a => a.textContent.trim() === "Next >");
      });

      if (!hasNext) break;

      await page.click("a:has-text('Next >')");
      await page.waitForTimeout(3000);
      pageNum++;

      // Safety limit
      if (pageNum > 20) break;
    }

  } catch (err) {
    console.error(`  Error scraping ${permitType}:`, err.message);
  }

  await page.close();
  return results;
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

  const browser = await chromium.launch({ headless: true });
  const now = new Date().toISOString();
  const allResults = [];

  for (const type of PERMIT_TYPES) {
    const results = await scrapePermitType(browser, type);
    allResults.push(...results);
    // Delay between searches
    await new Promise(r => setTimeout(r, 2000));
  }

  await browser.close();

  // Deduplicate by permit number
  const seen = new Set();
  const projects = [];
  for (const r of allResults) {
    if (seen.has(r.permitNumber)) continue;
    seen.add(r.permitNumber);

    const { category, scope } = classifyPermit(r.description, r.permitType);

    projects.push({
      address: `${r.address}, Cupertino, CA ${r.zip}`,
      city: "Cupertino",
      neighborhood: "",
      appNumber: r.permitNumber,
      appType: r.permitType,
      description: r.description,
      overview: `${scope} in Cupertino. ${r.status}.`,
      existingSF: category === "New Construction" ? 0 : null,
      proposedSF: (() => { const m = r.description.match(/(\d[,\d]*)\s*(?:s\.?f\.?|sf|sq)/i); return m ? parseInt(m[1].replace(/,/g, "")) : null; })(),
      sfNote: r.description.match(/\d+\s*(?:s\.?f\.?|sf|sq)/i) ? "SF per permit" : "Check plans for SF",
      dateFiled: parseDate(r.date),
      status: r.status,
      planner: "City of Cupertino",
      category,
      scope,
      zoning: "",
      apn: "",
      pageUrl: `https://aca-prod.accela.com/CUPERTINO/Cap/CapHome.aspx?module=Building`,
      docs: [],
      permitNumber: r.permitNumber,
      firstSeen: previousProjects[r.permitNumber] || now,
      dataSource: "cupertino-accela",
      lastVerified: now,
      permitStage: "Planning Review",
    });
  }

  console.log(`\nTotal: ${projects.length} Cupertino leads`);
  const byCat = {};
  for (const p of projects) byCat[p.category] = (byCat[p.category] || 0) + 1;
  console.log("By category:", byCat);

  const result = {
    projects,
    scrapedAt: now,
    source: "Cupertino Accela Citizen Access (public search)",
  };

  await writeFile(OUT_PATH, JSON.stringify(result, null, 2));
  console.log(`Saved to ${OUT_PATH}`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
