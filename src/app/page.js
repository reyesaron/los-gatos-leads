import { readFile } from "fs/promises";
import path from "path";
import { PROJECTS, LETTER_PAGES, SCRAPED_LETTERS } from "@/data/projects";
import LeadsApp from "@/components/LeadsApp";

async function getScrapedData() {
  try {
    const filePath = path.join(process.cwd(), "src", "data", "scraped.json");
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    if (data.projects?.length > 0) return data;
  } catch {
    // No scraped data yet — fall back to hardcoded
  }
  return null;
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const scraped = await getScrapedData();

  const projects = scraped?.projects || PROJECTS;
  const scrapedLetters = scraped?.scrapedLetters || SCRAPED_LETTERS;
  const scrapedAt = scraped?.scrapedAt || null;

  return (
    <LeadsApp
      projects={projects}
      letterPages={LETTER_PAGES}
      scrapedLetters={scrapedLetters}
      scrapedAt={scrapedAt}
    />
  );
}
