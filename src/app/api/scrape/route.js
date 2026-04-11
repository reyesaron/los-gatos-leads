import { scrapeAllPages } from "@/lib/scraper";
import { writeFile } from "fs/promises";
import path from "path";

const API_SECRET = process.env.SCRAPE_SECRET || "";

export async function GET(request) {
  // Simple auth check — pass ?secret=YOUR_SECRET
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (API_SECRET && secret !== API_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await scrapeAllPages();

    // Write scraped data to a JSON file the app can read at build/runtime
    const outPath = path.join(process.cwd(), "src", "data", "scraped.json");
    await writeFile(outPath, JSON.stringify(result, null, 2));

    return Response.json({
      ok: true,
      projectCount: result.projects.length,
      scrapedLetters: result.scrapedLetters,
      scrapedAt: result.scrapedAt,
      errors: result.errors,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
