#!/usr/bin/env node
/**
 * Populate Joes Studio with a local, searchable library of reusable
 * Wikimedia Commons SVG certificate/border designs. No user-side downloads are needed.
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
const headers = { "User-Agent": "JoesStudio-TemplateLibrary/1.1 (https://github.com/Quranhub1/Joes-Studio-Development; certificate asset importer)" };

function getTitle(item, id) {
  const title = String(item?.title || item?.name || item?.description || `Certificate design ${id}`);
  return title.replace(/^File:/i, "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 140);
}
function isFlagged(item) {
  const text = JSON.stringify([item?.tags, item?.tag, item?.flags, item?.status, item?.description]).toLowerCase();
  return /pd_issue|need-review|nsfw|not safe for work/.test(text);
}
async function fetchWithRetry(url, options = {}, attempts = 2, timeoutMs = 12000) {
  let lastError;
  const { timeoutMs: _timeoutMs, ...fetchOptions } = options;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: { ...headers, ...(fetchOptions.headers || {}) },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) return response;
      const error = new Error(`HTTP ${response.status} from ${url}`);
      if (response.status < 500 && response.status !== 429) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) {
      const delayMs = 750 * attempt;
      console.warn(`Request attempt ${attempt}/${attempts} failed: ${lastError?.cause?.message || lastError?.message || lastError}. Retrying in ${delayMs}ms.`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`Request failed after ${attempts} attempts: ${lastError?.cause?.message || lastError?.message || lastError}`);
}
async function fetchJson(url) {
  const response = await fetchWithRetry(url, {}, 2, 12000);
  const data = await response.json();
  if (data?.error) throw new Error(`Wikimedia API error: ${data.error.info || data.error.code}`);
  return data;
}
function cleanMetadata(value) {
  return String(value || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 500);
}
function hasReusableLicense(shortName) {
  const license = String(shortName || "").toLowerCase();
  return license.includes("public domain") || license.includes("cc0")
    || /creative commons attribution(?:-sharealike)?/.test(license)
    || /cc by(?:-sa)?\s*([1234.]|$)/.test(license);
}
async function searchCommons(term) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", `${term} filetype:svg`);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", "50");
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|extmetadata");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxlag", "5");
  const data = await fetchJson(url);
  const pages = Object.values(data?.query?.pages || {});
  return pages.flatMap((page) => {
    const info = page?.imageinfo?.[0];
    const title = String(page?.title || "");
    if (!info?.url || !/\.svg(?:$|\?)/i.test(info.url) || !/\.svg$/i.test(title)) return [];
    const meta = info.extmetadata || {};
    const license = cleanMetadata(meta.LicenseShortName?.value || meta.License?.value);
    if (!hasReusableLicense(license)) return [];
    const pageId = String(page.pageid || "");
    if (!pageId) return [];
    const artist = cleanMetadata(meta.Artist?.value || meta.Credit?.value || "Wikimedia Commons contributor");
    const description = cleanMetadata(meta.ImageDescription?.value || title);
    const tags = [term, "certificate", "vector", "svg"];
    return [{
      itemId: pageId,
      name: getTitle({ title }, pageId),
      creator: artist || "Wikimedia Commons contributor",
      sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      downloadUrl: info.url,
      sourceName: "Wikimedia Commons",
      license,
      licenseUrl: cleanMetadata(meta.LicenseUrl?.value),
      description,
      tags,
    }];
  });
}

await fs.mkdir(outputDir, { recursive: true });
const found = new Map();
const searchErrors = [];
// Run a small number of independent searches concurrently: a single slow API request
// must not stall the entire import for many minutes.
let nextTermIndex = 0;
const workerCount = Math.min(3, SEARCH_TERMS.length);
async function searchWorker() {
  while (nextTermIndex < SEARCH_TERMS.length && found.size < MAX_ASSETS) {
    const term = SEARCH_TERMS[nextTermIndex++];
    try {
      const items = await searchCommons(term);
      for (const item of items) {
        if (!item.itemId || isFlagged(item)) continue;
        const existing = found.get(item.itemId);
        const metadata = {
          ...item,
          searchTerms: [...new Set([...(existing?.searchTerms || []), term])],
        };
        found.set(item.itemId, { ...existing, ...metadata, searchTerms: metadata.searchTerms });
      }
      console.log(`Commons search "${term}" returned ${items.length} reusable SVGs.`);
    } catch (error) {
      searchErrors.push({ term, error: String(error?.message || error) });
      console.warn(`Wikimedia Commons search failed for "${term}": ${error.message}`);
    }
  }
}
await Promise.all(Array.from({ length: workerCount }, () => searchWorker()));
if (!found.size) {
  throw new Error("No reusable SVG results were discovered from Wikimedia Commons. Nothing was changed; check the API/network.");
}

const existingCatalogue = JSON.parse(await fs.readFile(cataloguePath, "utf8"));
const existingIds = new Set(existingCatalogue.map((item) => item.id));
const manifestItems = [];
const failures = [];
for (const item of [...found.values()].slice(0, MAX_ASSETS)) {
  const id = `commons-web-certificate-${item.itemId}`;
  const localFile = `./templates/web-certificates/${id}.svg`;
  const target = path.join(outputDir, `${id}.svg`);
  try {
    let svg;
    try {
      const response = await fetchWithRetry(item.downloadUrl, { redirect: "follow" }, 2, 20000);
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
      ...item, id,
      localFile, importedAt: new Date().toISOString(),
    };
    manifestItems.push(record);
    if (!existingIds.has(id)) {
      existingCatalogue.push({
        id, name: item.name, desc: `Reusable SVG artwork from Wikimedia Commons. Contributor: ${item.creator}. License: ${item.license}. ${item.description || ""} Opens in the Joes Studio vector editor.`,
        category: "Certificates", type: "svg-template", thumbnail: localFile, url: localFile,
        tags: [...new Set([...item.tags, ...item.searchTerms, "certificate", "web design", "wikimedia commons", item.license.toLowerCase()])],
        style: "Sourced vector artwork", sourceName: item.sourceName, sourceUrl: item.sourceUrl,
        creator: item.creator, license: item.license, licenseUrl: item.licenseUrl,
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
  source: "Wikimedia Commons",
  license: "Only public-domain, CC0, and Creative Commons Attribution/ShareAlike SVGs are imported; attribution and license metadata are retained.",
  searchTerms: SEARCH_TERMS,
  discovered: found.size,
  imported: manifestItems.length,
  failedSearches: searchErrors,
  failedDownloads: failures,
  items: manifestItems,
}, null, 2) + "\n");
await fs.writeFile(cataloguePath, JSON.stringify(existingCatalogue, null, 2) + "\n");
console.log(`Imported ${manifestItems.length} local SVGs from Wikimedia Commons. Gallery catalogue now contains ${existingCatalogue.length} templates.`);
if (!manifestItems.length) process.exitCode = 1;
