import * as cheerio from "cheerio";

const LETTER_URLS = {
  A: "https://www.losgatosca.gov/2216/Pending-Planning-Projects",
  B: "https://www.losgatosca.gov/2370/B",
  C: "https://www.losgatosca.gov/2371/C",
  D: "https://www.losgatosca.gov/2385/D",
  E: "https://www.losgatosca.gov/2372/E",
  F: "https://www.losgatosca.gov/2386/F",
  G: "https://www.losgatosca.gov/2373/G",
  H: "https://www.losgatosca.gov/2374/H",
  I: "https://www.losgatosca.gov/2387/I",
  J: "https://www.losgatosca.gov/2376/J",
  K: "https://www.losgatosca.gov/2377/K",
  L: "https://www.losgatosca.gov/2378/L",
  M: "https://www.losgatosca.gov/2379/M",
  N: "https://www.losgatosca.gov/2380/N",
  O: "https://www.losgatosca.gov/2388/O",
  P: "https://www.losgatosca.gov/2381/P",
  Q: "https://www.losgatosca.gov/2389/Q",
  R: "https://www.losgatosca.gov/2382/R",
  S: "https://www.losgatosca.gov/2383/S",
  T: "https://www.losgatosca.gov/2390/T",
  U: "https://www.losgatosca.gov/2391/U",
  V: "https://www.losgatosca.gov/2392/V",
  W: "https://www.losgatosca.gov/2393/W",
  X: "https://www.losgatosca.gov/2395/X",
  Y: "https://www.losgatosca.gov/2394/Y",
  Z: "https://www.losgatosca.gov/2396/Z",
};

function parseField(paragraphs, $, label) {
  for (let i = 0; i < paragraphs.length; i++) {
    const p = $(paragraphs[i]);
    const strong = p.find("strong").first().text().trim();
    if (strong.toLowerCase().includes(label.toLowerCase())) {
      // Get the text after the <strong> and <br>, which is the field value
      const html = p.html() || "";
      const afterBr = html.split(/<br\s*\/?>/i);
      if (afterBr.length > 1) {
        // Strip tags from the value portion
        return cheerio.load(afterBr.slice(1).join(" "))("body").text().trim();
      }
      // Fallback: get all text and remove the label
      return p.text().replace(strong, "").trim();
    }
  }
  return "";
}

function extractAPN(summary) {
  const match = summary.match(/APN[:\s]*([0-9][0-9\-,\s]+[0-9])/i);
  return match ? match[1].trim() : "";
}

function extractZoning(summary) {
  const match = summary.match(/(?:Zoned|Zoning)[:\s]*([A-Z0-9\-:½]+(?:\s*[A-Z0-9\-:½]+)*)/i);
  return match ? match[1].trim() : "";
}

function classifyProject(summary, appType) {
  const text = (summary + " " + appType).toLowerCase();
  if (text.includes("subdivision") || text.includes("lot split") || text.includes("urban lot split") || text.includes("lot line") || text.includes("lot merger")) {
    if (text.includes("construct") && !text.includes("lot split only")) return "New Construction";
    return "Subdivision";
  }
  if (text.includes("demolish") && text.includes("construct")) return "New Construction";
  if (text.includes("new single-family") || text.includes("new two-story") || text.includes("new residence")) return "New Construction";
  if (text.includes("two-unit") || text.includes("two unit")) return "New Construction";
  if (text.includes("multi-family") || text.includes("multifamily")) return "New Construction";
  if (text.includes("new maintenance") || text.includes("gymnasium") || text.includes("new gym")) return "New Construction";
  if (text.includes("vacant")) return "New Construction";
  if (text.includes("addition") || text.includes("alteration") || text.includes("second-story") || text.includes("second story")) return "Addition";
  if (text.includes("conditional use")) return "Addition";
  return "Addition";
}

function classifyScope(summary, appType, category) {
  const text = (summary + " " + appType).toLowerCase();

  // Multi-family unit counts
  const unitMatch = text.match(/(\d+)\s*(?:units?|dwelling)/i);
  if (unitMatch) {
    const count = parseInt(unitMatch[1]);
    if (count > 5) return `Multi-Family (${count} Units)`;
    if (count >= 2) return `Small Multi-Unit (${count} Units)`;
  }

  // Subdivision / new homes count
  const homeMatch = text.match(/(\d+)\s*(?:new\s+)?(?:single-family|homes|residences|lots)/i);
  if (homeMatch && text.includes("subdivision")) {
    return `Subdivision — ${homeMatch[1]} New Homes`;
  }

  if (text.includes("demolish") && text.includes("construct")) return "Custom Home (Demo + New Build)";
  if (text.includes("vacant")) return "Custom Home (Vacant Lot)";
  if (text.includes("two-unit") || text.includes("two unit")) return "Two-Unit Development (SB 9)";
  if (text.includes("two-family")) return "Two-Family Residence (Demo + New Build)";
  if (text.includes("gymnasium") || text.includes("maintenance build")) return "Institutional";
  if (text.includes("mixed-use") || text.includes("mixed use")) return "Mixed-Use";
  if (text.includes("urban lot split") || text.includes("lot split")) return "Urban Lot Split (SB 9)";
  if (text.includes("lot line")) return "Lot Line Adjustment";
  if (text.includes("lot merger")) return "Lot Merger";
  if (text.includes("subdivision")) return "Subdivision";
  if (text.includes("second-story") || text.includes("second story")) return "Second-Story Addition";
  if (text.includes("1,000 s") || text.includes("1000 s")) return "Accessory Structures (>1,000 SF)";
  if (text.includes("450 s")) return "Accessory Structure (>450 SF)";
  if (text.includes("accessory")) return "Accessory Structure";
  if (text.includes("addition")) return "Residential Addition";
  if (text.includes("conditional use")) return "Commercial CUP";
  if (text.includes("exterior")) return "Exterior Alterations";
  return "General";
}

function generateOverview(address, category, scope, summary) {
  const text = summary.toLowerCase();
  if (scope.includes("Multi-Family") && scope.match(/\d+/)) {
    const units = scope.match(/\d+/)[0];
    return `${units}-unit multi-family development. ${text.includes("demolish") ? "Demo existing + new construction." : "New construction."}`;
  }
  if (scope.includes("Demo + New Build")) return `Custom home — full demo + new build. Ground-up construction opportunity.`;
  if (scope.includes("Vacant")) return `Custom home on vacant lot — ground-up build.`;
  if (scope.includes("Two-Unit")) return `Two new units under SB 9 — ministerial project.`;
  if (scope.includes("Two-Family")) return `Two-family residence — demo + rebuild.`;
  if (scope.includes("Subdivision") && scope.match(/\d+/)) return `${scope} — multi-home subdivision project.`;
  if (scope.includes("Lot Split")) return `Lot split — watch for future development.`;
  if (scope.includes("Second-Story")) return `Second-story addition to existing home.`;
  if (scope.includes("Institutional")) return `Institutional build — non-residential.`;
  if (scope.includes("CUP")) return `Commercial conditional use permit — minimal construction scope.`;
  if (category === "Addition") return `Residential addition/alteration project.`;
  return `Planning project at ${address}.`;
}

function parsePage($, pageUrl) {
  const projects = [];
  const rows = $("div.row.outer.wide");

  rows.each((_i, row) => {
    const frView = $(row).find(".fr-view").first();
    if (!frView.length) return;

    const address = frView.find("h3 strong").text().trim();
    if (!address) return;

    const paragraphs = frView.find("p").toArray();
    const appNumberRaw = parseField(paragraphs, $, "Application Number");
    const summary = parseField(paragraphs, $, "Application Summary");
    const dateFiled = parseField(paragraphs, $, "Date Filed");
    const status = parseField(paragraphs, $, "Project Status");
    const planner = parseField(paragraphs, $, "Project Planner");

    // Parse app number and type from the combined field
    // Format is typically: "Architecture and Site Application S-25-049"
    // or "Minor Residential Development MR-23-003"
    let appType = "";
    let appNumber = "";
    const appMatch = appNumberRaw.match(/^(.+?)\s+([A-Z]{1,4}\d{0,2}-\d{2,4}-\d{2,4}(?:\s*(?:thru|through|,|and)\s*[A-Z\-\d,\s]+)*)$/i);
    if (appMatch) {
      appType = appMatch[1].trim();
      appNumber = appMatch[2].trim();
    } else {
      // Try alternate: app number might come first, or the whole thing is the type
      const altMatch = appNumberRaw.match(/([A-Z]{1,4}\d{0,2}-\d{2,4}-\d{2,4})/i);
      if (altMatch) {
        appNumber = altMatch[1];
        appType = appNumberRaw.replace(appNumber, "").trim();
      } else {
        appType = appNumberRaw;
      }
    }

    const apn = extractAPN(summary);
    const zoning = extractZoning(summary);
    const category = classifyProject(summary, appType);
    const scope = classifyScope(summary, appType, category);
    const overview = generateOverview(address, category, scope, summary);

    // Parse date to YYYY-MM-DD
    let dateISO = "";
    if (dateFiled) {
      const d = new Date(dateFiled);
      if (!isNaN(d.getTime())) {
        dateISO = d.toISOString().split("T")[0];
      }
    }

    // Parse documents from the right column
    const docs = [];
    $(row).find("li.widgetItem a").each((_j, a) => {
      const name = $(a).text().trim();
      let url = $(a).attr("href") || "";
      if (url.startsWith("/")) url = "https://www.losgatosca.gov" + url;
      if (name && url) docs.push({ name, url });
    });

    projects.push({
      address,
      appNumber,
      appType,
      description: summary,
      overview,
      existingSF: null,
      proposedSF: null,
      sfNote: "",
      dateFiled: dateISO,
      status: status || "Pending",
      planner: planner || "",
      category,
      scope,
      zoning,
      apn,
      pageUrl,
      docs,
    });
  });

  return projects;
}

function projectKey(p) {
  return `${p.address}::${p.appNumber}`.toLowerCase();
}

export async function scrapeAllPages(previousData) {
  const allProjects = [];
  const scrapedLetters = [];
  const errors = [];

  // Build a map of previously seen projects and their firstSeen dates
  const seenMap = {};
  if (previousData?.projects) {
    for (const p of previousData.projects) {
      seenMap[projectKey(p)] = p.firstSeen || previousData.scrapedAt || "";
    }
  }

  const entries = Object.entries(LETTER_URLS);

  // Scrape in batches of 4 to avoid hammering the server
  for (let i = 0; i < entries.length; i += 4) {
    const batch = entries.slice(i, i + 4);
    const results = await Promise.allSettled(
      batch.map(async ([letter, url]) => {
        const res = await fetch(url, {
          headers: { "User-Agent": "LosGatosLeadsTool/1.0" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${letter}`);
        const html = await res.text();
        const $ = cheerio.load(html);
        const projects = parsePage($, url);
        return { letter, projects };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        scrapedLetters.push(result.value.letter);
        allProjects.push(...result.value.projects);
      } else {
        errors.push(result.reason?.message || "Unknown error");
      }
    }
  }

  scrapedLetters.sort();

  const now = new Date().toISOString();

  // Tag each project with firstSeen
  for (const p of allProjects) {
    const key = projectKey(p);
    p.firstSeen = seenMap[key] || now;
  }

  return {
    projects: allProjects,
    scrapedLetters,
    scrapedAt: now,
    errors,
  };
}

export { LETTER_URLS };
