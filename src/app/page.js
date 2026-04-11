import { readFile } from "fs/promises";
import path from "path";
import { PROJECTS, LETTER_PAGES, SCRAPED_LETTERS } from "@/data/projects";
import LeadsApp from "@/components/LeadsApp";

async function loadJSON(filename) {
  try {
    const filePath = path.join(process.cwd(), "src", "data", filename);
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    if (data.projects?.length > 0) return data;
  } catch { /* not available */ }
  return null;
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const [lgScraped, sjMerged] = await Promise.all([
    loadJSON("scraped.json"),
    loadJSON("sanjose-merged.json"),
  ]);

  // LG projects: scraped data if available, otherwise hardcoded
  const lgProjects = lgScraped?.projects || PROJECTS.filter(p => !p.city || p.city === "Los Gatos");

  // Non-LG hardcoded projects (Saratoga, manually added SJ)
  const nonLGHardcoded = PROJECTS.filter(p => p.city && p.city !== "Los Gatos");

  // SJ scraped permits (deduplicate against hardcoded SJ by address)
  const hardcodedSJAddresses = new Set(
    nonLGHardcoded.filter(p => p.city === "San Jose").map(p => p.address.toLowerCase())
  );
  const sjScrapedProjects = (sjMerged?.projects || []).filter(
    p => !hardcodedSJAddresses.has(p.address.toLowerCase())
  );

  const projects = [...lgProjects, ...nonLGHardcoded, ...sjScrapedProjects];
  const scrapedLetters = lgScraped?.scrapedLetters || SCRAPED_LETTERS;
  const scrapedAt = lgScraped?.scrapedAt || sjMerged?.scrapedAt || null;

  return (
    <LeadsApp
      projects={projects}
      letterPages={LETTER_PAGES}
      scrapedLetters={scrapedLetters}
      scrapedAt={scrapedAt}
    />
  );
}
