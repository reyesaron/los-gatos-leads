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

  // Non-LG projects (Saratoga etc.) always come from hardcoded data
  const nonLGProjects = PROJECTS.filter(p => p.city && p.city !== "Los Gatos");

  // LG projects come from scraper when available, otherwise hardcoded
  const lgProjects = scraped?.projects || PROJECTS.filter(p => !p.city || p.city === "Los Gatos");

  const projects = [...lgProjects, ...nonLGProjects];
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
