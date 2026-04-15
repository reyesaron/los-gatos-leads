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
  const [lgScraped, sjMerged, paScraped] = await Promise.all([
    loadJSON("scraped.json"),
    loadJSON("sanjose-merged.json"),
    loadJSON("paloalto-scraped.json"),
  ]);

  // LG projects: scraped data if available, otherwise hardcoded
  const lgProjects = lgScraped?.projects || PROJECTS.filter(p => !p.city || p.city === "Los Gatos");

  // Non-LG hardcoded projects (Saratoga, manually added SJ) — exclude completed/on-market
  const nonLGHardcoded = PROJECTS.filter(p => {
    if (!p.city || p.city === "Los Gatos") return false;
    const s = (p.status || "").toLowerCase();
    if (s.includes("completed") || s.includes("on market")) return false;
    return true;
  });

  // SJ scraped permits (deduplicate against hardcoded SJ by address)
  const hardcodedSJAddresses = new Set(
    nonLGHardcoded.filter(p => p.city === "San Jose").map(p => p.address.toLowerCase())
  );
  const sjScrapedProjects = (sjMerged?.projects || []).filter(
    p => !hardcodedSJAddresses.has(p.address.toLowerCase())
  );

  // PA scraped permits
  const paProjects = (paScraped?.projects || []);

  const projects = [...lgProjects, ...nonLGHardcoded, ...sjScrapedProjects, ...paProjects];
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
