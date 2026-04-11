import { scrapeAllPages } from "@/lib/scraper";
import { readFile, writeFile } from "fs/promises";
import path from "path";

const API_SECRET = process.env.SCRAPE_SECRET || "";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (API_SECRET && secret !== API_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const outPath = path.join(process.cwd(), "src", "data", "scraped.json");

    // Load previous data to preserve firstSeen dates
    let previousData = null;
    try {
      const raw = await readFile(outPath, "utf-8");
      previousData = JSON.parse(raw);
    } catch { /* first run */ }

    const result = await scrapeAllPages(previousData);
    await writeFile(outPath, JSON.stringify(result, null, 2));

    const newCount = result.projects.filter(p => p.firstSeen === result.scrapedAt).length;

    return Response.json({
      ok: true,
      projectCount: result.projects.length,
      newProjects: newCount,
      scrapedLetters: result.scrapedLetters,
      scrapedAt: result.scrapedAt,
      errors: result.errors,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
