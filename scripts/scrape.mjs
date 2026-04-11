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

console.log("Scraping Los Gatos planning pages...");
const result = await scrapeAllPages(previousData);

await writeFile(outPath, JSON.stringify(result, null, 2));

const newCount = result.projects.filter(p => p.firstSeen === result.scrapedAt).length;
console.log(`Done — ${result.projects.length} projects across ${result.scrapedLetters.length} letters`);
if (newCount > 0) console.log(`${newCount} new project(s) detected`);
if (result.errors.length) console.warn("Errors:", result.errors);
