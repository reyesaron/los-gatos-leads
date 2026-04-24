#!/usr/bin/env node
import { scrapeAllPages } from "../src/lib/scraper.js";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "src", "data", "scraped.json");

// Load previous data so we can track firstSeen dates
let previousData = null;
try {
  const raw = await readFile(outPath, "utf-8");
  previousData = JSON.parse(raw);
} catch {
  // No previous data — first run
}

const startTime = Date.now();
console.log("Scraping Los Gatos planning pages...");

let result;
let status = "success";
let errorMessages = [];

try {
  result = await scrapeAllPages(previousData);
  await writeFile(outPath, JSON.stringify(result, null, 2));
  errorMessages = result.errors || [];

  const newCount = result.projects.filter(p => p.firstSeen === result.scrapedAt).length;
  console.log(`Done — ${result.projects.length} projects across ${result.scrapedLetters.length} letters`);
  if (newCount > 0) console.log(`${newCount} new project(s) detected`);
  if (result.errors.length) {
    console.warn("Errors:", result.errors);
    // Partial failure — some pages failed but we still got data
    if (result.projects.length === 0) status = "failure";
  }
} catch (err) {
  status = "failure";
  errorMessages = [err.message];
  console.error("Scraper failed:", err.message);
  process.exitCode = 1;
}

const duration = Math.round((Date.now() - startTime) / 1000);

// Log to audit API if SCRAPER_LOG_TOKEN and SCRAPER_LOG_URL are set
const logToken = process.env.SCRAPER_LOG_TOKEN;
const logUrl = process.env.SCRAPER_LOG_URL || "https://los-gatos-leads.vercel.app/api/scrape/log";

if (logToken) {
  try {
    await fetch(logUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scraper: "los-gatos",
        status,
        projectCount: result?.projects?.length || 0,
        newCount: result?.projects?.filter(p => p.firstSeen === result?.scrapedAt).length || 0,
        errors: errorMessages,
        duration,
        token: logToken,
      }),
    });
    console.log("Scrape run logged to audit.");
  } catch (logErr) {
    console.warn("Failed to log scrape run:", logErr.message);
  }
}
