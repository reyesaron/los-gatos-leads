#!/usr/bin/env node
import { scrapeAllPages } from "../src/lib/scraper.js";
import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "src", "data", "scraped.json");

console.log("Scraping Los Gatos planning pages...");
const result = await scrapeAllPages();

await writeFile(outPath, JSON.stringify(result, null, 2));
console.log(`Done — ${result.projects.length} projects across ${result.scrapedLetters.length} letters`);
if (result.errors.length) console.warn("Errors:", result.errors);
