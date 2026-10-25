#!/usr/bin/env node
/**
 * Populate Joes Studio with a large local, searchable library of original
 * OpenClipart SVG certificate/border designs. No user-side downloads are needed.
 *
 * Run in a network-enabled Node 20+ build/CI environment:
 *   node scripts/import-openclipart-certificates.mjs
 *
 * The catalogue is discovered from public search results, de-duplicated, and
 * stored locally. Individual download failures are recorded and do not discard
 * successfully imported designs. We skip flagged/uncertain items when metadata
 * exposes those flags. Keep a cap so an upstream search regression cannot fill
 * the repository with the entire clipart collection.
 */
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "templates", "web-certificates");
const cataloguePath = path.join(root, "templates", "templates.json");
const manifestPath = path.join(outputDir, "manifest.json");
const MAX_ASSETS = Number(process.env.MAX_CERTIFICATE_ASSETS || 1000);
const SEARCH_TERMS = [
  "certificate", "certificate border", "certificate frame", "diploma",
  "award certificate", "achievement certificate", "graduation certificate",
  "wedding certificate", "ornate certificate", "certificate template",
  "award border", "diploma border", "certificate ornament",
];
const headers = { "User-Agent": "JoesStudio-TemplateLibrary/1.0 (local asset importer)" };

function extractId(item) {
  const candidates = [
    item?.id, item?.clipart_id, item?.svg?.id, item?.detail_link,
    item?.url, item?.link,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "number" || /^\d+$/.test(String(candidate || ""))) return String(candidate);
    const match = String(candidate || "").match(/(?:detail\/|openclipart\.org\/)(\d{3,})(?:\/|$|\?)/i)
      || String(candidate || "").match(/\/download\/(\d{3,})/i);
    if (match) return match[1];
  }
  return null;
}
function getTitle(item, id) {
  const title = String(item?.title || item?.name || item?.description || `Certificate design ${id}`);
  return title.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 140);
}
function isFlagged(item) {
  const text = JSON.stringify([item?.tags, item?.tag, item?.flags, item?.status, item?.description]).toLowerCase();
  return /pd_issue|need-review|nsfw|not safe for work/.test(text);
}
async function fetchJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}
async function search(term) {
  const url = new URL("https://openclipart.org/search/json/");
  url.searchParams.set("query", term);
  url.searchParams.set("sort", "downloads");
  url.searchParams.set("amount", "200");
  const data = await fetchJson(url);
  const items = Array.isArray(data?.payload) ? data.payload
    : Array.isArray(data?.data?.files) ? data.data.files
    : Array.isArray(data?.files) ? data.files : [];
  return items;
}

await fs.mkdir(outputDir, { recursive: true });
const found = new Map();
const searchErrors = [];
for (const term of SEARCH_TERMS) {
  try {
    const items = await search(term);
    for (const item of items) {
      const itemId = extractId(item);
      if (!itemId || isFlagged(item)) continue;
      const existing = found.get(itemId);
      const metadata = {
        itemId,
        name: getTitle(item, itemId),
        creator: item?.artist_name || item?.creator || item?.author || item?.artist || "OpenClipart contributor",
        sourceUrl: item?.detail_link || item?.page_url || `https://openclipart.org/detail/${itemId}`,
        tags: Array.isArray(item?.tags) ? item.tags.map(String).slice(0, 20) : [term],
        searchTerms: [...new Set([...(existing?.searchTerms || []), term])],
      };
      found.set(itemId, { ...existing, ...metadata, searchTerms: metadata.searchTerms });
    }
  } catch (error) {
    searchErrors.push({ term, error: String(error?.message || error) });
    console.warn(`Search failed for "${term}": ${error.message}`);
  }
  if (found.size >= MAX_ASSETS) break;
}
if (!found.size) {
  throw new Error("No OpenClipart results were discovered. Nothing was changed; check the upstream search endpoint.");
}

const existingCatalogue = JSON.parse(await fs.readFile(cataloguePath, "utf8"));
const existingIds = new Set(existingCatalogue.map((item) => item.id));
const manifestItems = [];
const failures = [];
for (const item of [...found.values()].slice(0, MAX_ASSETS)) {
  const id = `oc-web-certificate-${item.itemId}`;
  const localFile = `./templates/web-certificates/${id}.svg`;
  const target = path.join(outputDir, `${id}.svg`);
  try {
    let svg;
    try {
      const response = await fetch(`https://openclipart.org/download/${item.itemId}`, { headers, redirect: "follow" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      svg = await response.text();
    } catch (error) {
      throw new Error(`download failed: ${error.message}`);
    }
    if (!/<svg[\s>]/i.test(svg.slice(0, 5000))) throw new Error("response was not an SVG document");
    // Avoid importing scripts or external resources into the editor from SVG files.
    if (/<script\b|<foreignObject\b|(?:href|xlink:href)\s*=\s*["']https?:/i.test(svg)) {
      throw new Error("SVG contains script, foreignObject, or external network references");
    }
    await fs.writeFile(target, svg, "utf8");
    const record = {
      ...item, id, sourceName: "OpenClipart", license: "CC0 1.0 / public domain dedication",
      downloadUrl: `https://openclipart.org/download/${item.itemId}`,
      localFile, importedAt: new Date().toISOString(),
    };
    manifestItems.push(record);
    if (!existingIds.has(id)) {
      existingCatalogue.push({
        id, name: item.name, desc: `Original vector artwork from OpenClipart. Source contributor: ${item.creator}. CC0; opens in the Joes Studio vector editor.`,
        category: "Certificates", type: "svg-template", thumbnail: localFile, url: localFile,
        tags: [...new Set([...item.tags, ...item.searchTerms, "certificate", "web design", "openclipart", "cc0"])],
        style: "Original web design", sourceName: "OpenClipart", sourceUrl: item.sourceUrl,
        creator: item.creator, license: "CC0 1.0",
      });
      existingIds.add(id);
    }
    console.log(`Imported ${item.name} (${item.itemId})`);
  } catch (error) {
    failures.push({ itemId: item.itemId, name: item.name, sourceUrl: item.sourceUrl, error: String(error?.message || error) });
    console.warn(`Skipped ${item.itemId} - ${error.message}`);
  }
}
await fs.writeFile(manifestPath, JSON.stringify({
  title: "Joes Studio bundled web certificate designs",
  source: "OpenClipart",
  license: "CC0 1.0 / public domain dedication; records marked for review are skipped where detectable",
  searchTerms: SEARCH_TERMS,
  discovered: found.size,
  imported: manifestItems.length,
  failedSearches: searchErrors,
  failedDownloads: failures,
  items: manifestItems,
}, null, 2) + "\n");
await fs.writeFile(cataloguePath, JSON.stringify(existingCatalogue, null, 2) + "\n");
console.log(`Imported ${manifestItems.length} local SVGs. Gallery catalogue now contains ${existingCatalogue.length} templates.`);
if (!manifestItems.length) process.exitCode = 1;
