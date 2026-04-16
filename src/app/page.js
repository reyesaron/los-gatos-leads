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
      // Merge into the existing entry — combine permits, descriptions, and keep best data
      const existing = seen.get(key);

      // Merge permit numbers
      const existingPermits = existing.appNumber || "";
      const newPermit = p.appNumber || "";
      if (newPermit && !existingPermits.includes(newPermit)) {
        existing.appNumber = existingPermits ? `${existingPermits}, ${newPermit}` : newPermit;
      }

      // Merge descriptions — append if different
      if (p.description && !existing.description.includes(p.description.slice(0, 40))) {
        existing.description = `${existing.description} | ${p.description}`;
      }

      // Keep the richer overview, scope, and category
      const existingScore = (existing.description?.length || 0) + (existing.proposedSF ? 100 : 0);
      const newScore = (p.description?.length || 0) + (p.proposedSF ? 100 : 0);
      if (newScore > existingScore) {
        existing.overview = p.overview;
        existing.scope = p.scope;
        existing.category = p.category;
      }

      // Keep best SF data
      if (p.proposedSF && (!existing.proposedSF || p.proposedSF > existing.proposedSF)) {
        existing.proposedSF = p.proposedSF;
        existing.sfNote = p.sfNote;
      }
      if (p.existingSF !== null && existing.existingSF === null) existing.existingSF = p.existingSF;

      // Keep best metadata
      if (p.dateFiled && !existing.dateFiled) existing.dateFiled = p.dateFiled;
      if (p.valuation && (!existing.valuation || p.valuation > existing.valuation)) existing.valuation = p.valuation;
      if (p.zoning && !existing.zoning) existing.zoning = p.zoning;
      if (p.apn && !existing.apn) existing.apn = p.apn;
    } else {
      // Clone to avoid mutating source data
      const entry = { ...p };
      seen.set(key, entry);
      result.push(entry);
    }
  }
  return result;
}

const COMMERCIAL_FILTER = /tenant\s*improve|commercial\s*(?:build|struct|project|develop)|office\s*(?:tenant|build|renov)|retail\s*(?:tenant|build)|restaurant\s*(?:tenant|improve)|industrial\s*(?:build|plant)|warehouse|hotel|motel|church|school|daycare|data\s*center|antenna|cell\s*(?:site|tower)/i;

function filterCommercial(projects) {
  return projects.filter(p => {
    const text = `${p.description || ""} ${p.scope || ""} ${p.overview || ""} ${p.appType || ""}`;
    return !COMMERCIAL_FILTER.test(text);
  });
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const [lgScraped, sjMerged, paScraped, cupScraped] = await Promise.all([
    loadJSON("scraped.json"),
    loadJSON("sanjose-merged.json"),
    loadJSON("paloalto-scraped.json"),
    loadJSON("cupertino-scraped.json"),
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
  const cupProjects = (cupScraped?.projects || []);

  // Merge all sources, filter commercial/TI, then deduplicate
  const allRaw = [...nonLGHardcoded, ...lgProjects, ...sjProjects, ...paProjects, ...cupProjects];
  const residentialOnly = filterCommercial(allRaw);
  const projects = deduplicateProjects(residentialOnly);

  const scrapedLetters = lgScraped?.scrapedLetters || SCRAPED_LETTERS;
  const scrapedAt = lgScraped?.scrapedAt || sjMerged?.scrapedAt || paScraped?.scrapedAt || cupScraped?.scrapedAt || null;

  return (
    <LeadsApp
      projects={projects}
      scrapedAt={scrapedAt}
    />
  );
}
