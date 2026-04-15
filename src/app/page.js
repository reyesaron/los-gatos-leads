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

function normalizeAddress(addr) {
  return (addr || "").toLowerCase().replace(/[,.\s]+/g, " ").replace(/\s*(ca|california)\s*\d{5}.*$/i, "").trim();
}

function deduplicateProjects(allProjects) {
  const seen = new Map();
  const result = [];
  for (const p of allProjects) {
    const key = normalizeAddress(p.address);
    if (!key) { result.push(p); continue; }
    if (seen.has(key)) {
      // Keep the one with more data — prefer scraped over hardcoded, prefer one with more fields filled
      const existing = seen.get(key);
      const existingScore = (existing.description?.length || 0) + (existing.proposedSF ? 100 : 0) + (existing.dateFiled ? 50 : 0);
      const newScore = (p.description?.length || 0) + (p.proposedSF ? 100 : 0) + (p.dateFiled ? 50 : 0);
      if (newScore > existingScore) {
        // Replace with richer entry
        const idx = result.indexOf(existing);
        if (idx >= 0) result[idx] = p;
        seen.set(key, p);
      }
    } else {
      seen.set(key, p);
      result.push(p);
    }
  }
  return result;
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

  // Scraped data from open data portals
  const sjProjects = (sjMerged?.projects || []);
  const paProjects = (paScraped?.projects || []);

  // Merge all sources then deduplicate by normalized address
  // Order matters: scraped data comes last so it wins over hardcoded on ties
  const allRaw = [...nonLGHardcoded, ...lgProjects, ...sjProjects, ...paProjects];
  const projects = deduplicateProjects(allRaw);

  const scrapedLetters = lgScraped?.scrapedLetters || SCRAPED_LETTERS;
  const scrapedAt = lgScraped?.scrapedAt || sjMerged?.scrapedAt || paScraped?.scrapedAt || null;

  return (
    <LeadsApp
      projects={projects}
      scrapedAt={scrapedAt}
    />
  );
}
