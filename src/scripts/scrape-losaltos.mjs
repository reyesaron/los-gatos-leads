#!/usr/bin/env node
// Los Altos eTRAKiT scraper — searches planning projects (Design Review, CEQA, etc.)
// Planning projects = pre-construction, no contractor hired yet

import { chromium } from "playwright";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "losaltos-scraped.json");

const SEARCH_URL = "https://trakit.losaltosca.gov/etrakit/Search/project.aspx";
// Auto-generate year prefixes — current year + previous year (2-digit)
const now = new Date();
const currentYY = String(now.getFullYear()).slice(-2);
const prevYY = String(now.getFullYear() - 1).slice(-2);
const PREFIXES = [`${currentYY}-`, `${prevYY}-`];

async function scrapeAllProjects(browser) {
  const page = await browser.newPage();
  const allResults = [];

  for (const prefix of PREFIXES) {
    console.log(`  Searching projects containing: ${prefix}`);
    await page.goto(SEARCH_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    await page.selectOption("#cplMain_ddSearchBy", "Project #");
    await page.selectOption("#cplMain_ddSearchOper", "Contains");
    await page.fill("#cplMain_txtSearchString", prefix);
    await page.$eval("#ctl00_cplMain_btnSearch", el => el.click());
    await page.waitForTimeout(5000);

    let pageNum = 1;
    while (true) {
      console.log(`    Page ${pageNum}...`);
      const rows = await page.$$eval("table[id*='SearchRslts'] tr, .rgMasterTable tr", els =>
        els.map(e => {
          const cells = [...e.querySelectorAll("td")];
          if (cells.length < 2) return null;
          return {
            project: (cells[0]?.textContent || "").trim(),
            address: (cells[1]?.textContent || "").trim(),
          };
        }).filter(r => r && r.project && !r.project.includes("Buttons") && r.project.match(/^[A-Z]/))
      );
      allResults.push(...rows);

      const hasNext = await page.evaluate(() => {
        const links = [...document.querySelectorAll("a, input")];
        return links.some(l => l.title === "Next Page" || l.className?.includes("rgPageNext"));
      });
      if (!hasNext || pageNum >= 15) break;
      try {
        await page.click("[title='Next Page'], .rgPageNext");
        await page.waitForTimeout(3000);
        pageNum++;
      } catch { break; }
    }
  }

  await page.close();
  return allResults;
}

async function getProjectDetails(browser, projectNum) {
  const page = await browser.newPage();
  try {
    await page.goto(SEARCH_URL, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1000);

    await page.selectOption("#cplMain_ddSearchBy", "Project #");
    await page.selectOption("#cplMain_ddSearchOper", "Equals");
    await page.fill("#cplMain_txtSearchString", projectNum);
    await page.$eval("#ctl00_cplMain_btnSearch", el => el.click());
    await page.waitForTimeout(4000);

    // Click the first result to see details
    const link = await page.$("table[id*='SearchRslts'] a, .rgMasterTable a");
    if (link) {
      await link.click();
      await page.waitForTimeout(3000);
    }

    const text = await page.evaluate(() => document.body.innerText);

    const statusMatch = text.match(/Status:\s*(.+?)(?:\n|$)/i);
    const descMatch = text.match(/Description:\s*(.+?)(?:\n|$)/i) || text.match(/Project Description:\s*(.+?)(?:\n|$)/i);
    const typeMatch = text.match(/(?:Project |Application )Type:\s*(.+?)(?:\n|$)/i);

    return {
      status: statusMatch?.[1]?.trim() || "",
      description: descMatch?.[1]?.trim() || "",
      type: typeMatch?.[1]?.trim() || "",
    };
  } catch {
    return { status: "", description: "", type: "" };
  } finally {
    await page.close();
  }
}

function classifyProject(desc, type, projectNum) {
  const d = (desc + " " + type).toLowerCase();
  const prefix = projectNum.split(/\d/)[0].replace(/-$/, "");
  let category = "Addition";
  let scope = "Planning Review";

  if (/new.*(?:single family|sfr|resid|dwelling|home)|(?:single family|sfr).*new/i.test(d)) {
    category = "New Construction";
    const sfMatch = d.match(/(\d[,\d]*)\s*(?:s\.?f\.?|sf|sq)/i);
    scope = sfMatch ? `New SFR (${sfMatch[1]} SF)` : "New SFR";
  } else if (/demo|demolish.*construct|tear.*down/i.test(d)) {
    category = "New Construction";
    scope = "Demolition / Rebuild";
  } else if (/\badu\b|accessory dwelling/i.test(d)) {
    scope = "ADU / Accessory Dwelling";
  } else if (/addition|expand/i.test(d)) {
    scope = "Residential Addition";
  } else if (/remodel|renovation|alteration/i.test(d)) {
    scope = "Major Remodel";
  } else if (prefix === "DR") {
    scope = "Design Review — Residential";
  } else if (prefix === "CEQA") {
    scope = "Environmental Review";
  }

  return { category, scope };
}

const SKIP_PROJECTS = /commercial|office|retail|restaurant|industrial|church|school|multi-family|apartment|hotel/i;

async function main() {
  let previousProjects = {};
  try {
    const prev = JSON.parse(await readFile(OUT_PATH, "utf-8"));
    for (const p of prev.projects || []) {
      previousProjects[p.permitNumber || p.appNumber] = p.firstSeen || prev.scrapedAt;
    }
  } catch { /* first run */ }

  const browser = await chromium.launch({ headless: true });
  const now = new Date().toISOString();

  console.log("Scraping Los Altos planning projects...\n");
  const rawProjects = await scrapeAllProjects(browser);
  console.log(`\nTotal projects found: ${rawProjects.length}`);

  // Filter to residential prefixes (DR = Design Review, most are SFR)
  const residential = rawProjects.filter(r => {
    const prefix = r.project.split(/\d/)[0].replace(/-$/, "");
    return ["DR", "CEQA", "APPL", "EX"].includes(prefix);
  });
  console.log(`Residential-relevant projects: ${residential.length}`);

  // Get details for each
  const projects = [];
  console.log(`\nGetting details...`);
  for (let i = 0; i < residential.length; i++) {
    const r = residential[i];
    console.log(`  ${i + 1}/${residential.length}: ${r.project} — ${r.address}`);
    const details = await getProjectDetails(browser, r.project);

    if (SKIP_PROJECTS.test(details.description)) continue;

    const { category, scope } = classifyProject(details.description, details.type, r.project);

    projects.push({
      address: `${r.address}, Los Altos, CA`,
      city: "Los Altos",
      neighborhood: "",
      appNumber: r.project,
      appType: details.type || "Planning Application",
      description: details.description || `${r.project} at ${r.address}`,
      overview: `${scope} in Los Altos. ${details.status || "In Review"}. Pre-construction — no contractor.`,
      existingSF: null,
      proposedSF: (() => { const m = (details.description || "").match(/(\d[,\d]*)\s*(?:s\.?f\.?|sf|sq)/i); return m ? parseInt(m[1].replace(/,/g, "")) : null; })(),
      sfNote: "Check plans for SF",
      dateFiled: "",
      status: details.status || "In Review",
      planner: "City of Los Altos",
      category,
      scope,
      zoning: "",
      apn: "",
      pageUrl: "https://trakit.losaltosca.gov/etrakit/",
      docs: [],
      permitNumber: r.project,
      firstSeen: previousProjects[r.project] || now,
      dataSource: "losaltos-etrakit-planning",
      lastVerified: now,
      permitStage: "Planning Review",
    });

    await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close();

  console.log(`\nFiltered to ${projects.length} Los Altos leads`);
  const byCat = {};
  for (const p of projects) byCat[p.category] = (byCat[p.category] || 0) + 1;
  console.log("By category:", byCat);

  const result = { projects, scrapedAt: now, source: "Los Altos eTRAKiT (planning projects)" };
  await writeFile(OUT_PATH, JSON.stringify(result, null, 2));
  console.log(`Saved to ${OUT_PATH}`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
