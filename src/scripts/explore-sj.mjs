#!/usr/bin/env node
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
});

// --- Explore 1: Permit Activity Reports ---
console.log("=== Exploring Permit Activity Reports ===");
const page1 = await context.newPage();
try {
  await page1.goto("https://sjpermits.org/permits/general/reportdata.asp", { waitUntil: "networkidle", timeout: 30000 });
  await page1.screenshot({ path: "sj-reports.png", fullPage: true });
  console.log("Screenshot saved: sj-reports.png");
  const text1 = await page1.evaluate(() => document.body.innerText.slice(0, 4000));
  console.log(text1);
  const links1 = await page1.$$eval("a", els => els.map(e => ({ text: e.textContent?.trim().slice(0, 80), href: e.href })).filter(l => l.text && (l.href.includes("pdf") || l.href.includes("csv") || l.href.includes("xls") || l.href.includes("report") || l.href.includes("data"))));
  console.log("\nData/report links:", JSON.stringify(links1.slice(0, 20), null, 2));
} catch (err) {
  console.error("Reports error:", err.message);
}
await page1.close();

// --- Explore 2: Search by address and see results ---
console.log("\n=== Exploring address search results ===");
const page2 = await context.newPage();
try {
  await page2.goto("https://permits.sanjoseca.gov/search", { waitUntil: "networkidle", timeout: 30000 });
  await page2.waitForTimeout(2000);

  // Try searching a known address in Willow Glen
  const houseInput = page2.locator("#mat-input-1");
  const streetInput = page2.locator("#mat-input-2");
  await houseInput.fill("1100");
  await streetInput.fill("Minnesota");
  await page2.waitForTimeout(1500);

  // Check for autocomplete dropdown
  const suggestions = await page2.$$eval("[role='option'], .mat-option, mat-option", els =>
    els.map(e => e.textContent?.trim()).filter(Boolean)
  );
  console.log("Street suggestions:", suggestions);

  if (suggestions.length > 0) {
    // Click first suggestion
    await page2.locator("[role='option'], .mat-option, mat-option").first().click();
    await page2.waitForTimeout(1000);
  }

  // Click search
  const searchButtons = page2.locator("button:has-text('Search')");
  await searchButtons.nth(1).click(); // 2nd Search button (address section)
  await page2.waitForTimeout(5000);

  await page2.screenshot({ path: "sj-search-results.png", fullPage: true });
  console.log("Screenshot saved: sj-search-results.png");

  const text2 = await page2.evaluate(() => document.body.innerText.slice(0, 5000));
  console.log("\nResults page text:\n", text2);

  // Check for result table elements
  const resultElements = await page2.$$eval("table, [class*='result'], [class*='permit'], [class*='record'], tr, .mat-row, mat-row", els =>
    els.slice(0, 10).map(e => ({ tag: e.tagName, class: e.className?.toString().slice(0, 80), text: e.textContent?.trim().slice(0, 200) }))
  );
  console.log("\nResult elements:", JSON.stringify(resultElements.slice(0, 5), null, 2));

} catch (err) {
  console.error("Search error:", err.message);
  await page2.screenshot({ path: "sj-search-error.png" });
}

await browser.close();
