#!/usr/bin/env node
// Usage: node scripts/log-scrape.mjs <scraper-name> <status> [projectCount] [errors...]
// Called from GitHub Actions after each scraper step

const [,, scraper, status, projectCount, ...errors] = process.argv;

const logToken = process.env.SCRAPER_LOG_TOKEN;
const logUrl = process.env.SCRAPER_LOG_URL || "https://los-gatos-leads.vercel.app/api/scrape/log";

if (!logToken) {
  console.log("SCRAPER_LOG_TOKEN not set, skipping audit log.");
  process.exit(0);
}

if (!scraper || !status) {
  console.error("Usage: log-scrape.mjs <scraper-name> <success|failure> [projectCount] [errors...]");
  process.exit(1);
}

try {
  const res = await fetch(logUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scraper,
      status,
      projectCount: projectCount ? parseInt(projectCount) : undefined,
      errors: errors.length > 0 ? errors : undefined,
      token: logToken,
    }),
  });
  if (res.ok) {
    console.log(`Logged ${scraper}: ${status}`);
  } else {
    console.warn(`Log API returned ${res.status}`);
  }
} catch (err) {
  console.warn("Failed to log:", err.message);
}
