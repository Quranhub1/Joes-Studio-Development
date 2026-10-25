#!/usr/bin/env node
/**
 * Import real, already-published certificate and diploma artwork.
 * Original source SVG bytes are preserved; no designs are generated here.
 * The gallery catalogue is populated only with usable layouts, not logos/icons.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const outputDir = path.join(root, "templates", "web-certificates");
const cataloguePath = path.join(root, "templates", "templates.json");
const manifestPath = path.join(outputDir, "manifest.json");
const MAX_ASSETS = Math.max(1, Math.min(1000, Number(process.env.MAX_CERTIFICATE_ASSETS || 1000)));
const API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "JoesStudioCertificateLibrary/2.0 (licensed artwork importer; https://github.com/Quranhub1/Joes-Studio-Development)";
const searches = [
  '"certificate of achievement" filemime:svg',
  '"certificate of completion" filemime:svg',
  '"certificate of appreciation" filemime:svg',
  '"certificate template" filemime:svg',
  '"diploma certificate" filemime:svg',
  '"certificate frame" filemime:svg',
  '"award certificate" filemime:svg',
  '"certificate border" filemime:svg'
];
const allowedLicense = /public domain|CC0|CC BY(?:-SA)?(?: 2\\.0| 3\\.0| 4\\.0)?/i;
const rejectTitle = /logo|logotype|emblem|coat of arms|icon|symbol|monopoly|stock certificate|savings certificate|seal only|badge only|flag|diagram|chart|map|font|typeface/i;
const slugify = (s) => String(s).normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 80);
const plain = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchRetry(url, options = {}, attempts = 6) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers: { "User-Agent": USER_AGENT, ...(options.headers || {}) } });
      if (response.ok) return response;
      if (![429, 500, 502, 503, 504].includes(response.status)) throw new Error("HTTP " + response.status);
      const retryAfter = Number(response.headers.get("retry-after") || 0);
      await sleep(Math.max(retryAfter * 1000, Math.min(30000, 1200 * (2 ** attempt))));
      lastError = new Error("HTTP " + response.status);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await sleep(Math.min(30000, 1000 * (2 ** attempt)));
    }
  }
  throw lastError || new Error("Request failed");
}
async function getJson(url) {
  const response = await fetchRetry(url, { headers: { Accept: "application/json" } });
  return response.json();
}
function usableCertificate(title, description, svg) {
  const text = (title + " " + description).toLowerCase();
  if (rejectTitle.test(text)) return false;
  if (!/(certificate|diploma|award|attestation|achievement|appreciation|completion)/i.test(text)) return false;
  // Reject SVGs that are only a logo/mark rather than a document-sized layout.
  const viewBox = svg.match(/viewBox=["']([^"']+)["']/i)?.[1] || "";
  const dims = viewBox.split(/[ ,]+/).map(Number);
  if (dims.length === 4 && dims[2] > 0 && dims[3] > 0) {
    const ratio = dims[2] / dims[3];
    if (ratio < 0.65 || ratio > 2.2) return false;
  }
  const visualElements = (svg.match(/<(?:path|rect|circle|ellipse|polygon|polyline|line|text|image)\\b/gi) || []).length;
  return visualElements >= 5;
}
async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const existingFiles = await fs.readdir(outputDir);
  for (const name of existingFiles) {
    if (/^joes-original-certificate-\\d+\\.svg$/i.test(name)) await fs.rm(path.join(outputDir, name), { force: true });
  }

  const candidates = new Map();
  for (const term of searches) {
    const params = new URLSearchParams({
      action: "query", format: "json", generator: "search", gsrsearch: term,
      gsrnamespace: "6", gsrlimit: "50", prop: "imageinfo",
      iiprop: "url|extmetadata"
    });
    try {
      const data = await getJson(`${API}?${params}`);
      for (const page of Object.values(data.query?.pages || {})) {
        const title = page.title || "";
        const info = page.imageinfo?.[0];
        if (!info?.url || !/\\.svg(?:$|\\?)/i.test(info.url) || rejectTitle.test(title)) continue;
        const meta = info.extmetadata || {};
        const license = plain(meta.LicenseShortName?.value || meta.License?.value || "");
        if (!allowedLicense.test(license)) continue;
        const licenseUrl = plain(meta.LicenseUrl?.value || "");
        const author = plain(meta.Artist?.value || meta.Credit?.value || "Author not specified");
        const description = plain(meta.ImageDescription?.value || title.replace(/^File:/, ""));
        if (!/(certificate|diploma|award|attestation|achievement|appreciation|completion)/i.test(title + " " + description)) continue;
        candidates.set(title, {
          title: title.replace(/^File:/, ""), sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
          downloadUrl: info.url, author, license, licenseUrl, description
        });
      }
    } catch (error) {
      console.warn(`Search failed for "${term}": ${error.message}`);
    }
    await sleep(900);
  }

  let catalogue = JSON.parse(await fs.readFile(cataloguePath, "utf8"));
  // Remove stale entries from this import family before rebuilding from verified downloads.
  catalogue = catalogue.filter((item) => !String(item.id || "").startsWith("commons-certificate-"));
  const retained = catalogue.filter((item) => !String(item.id || "").startsWith("joes-original-certificate-"));
  const imported = [];
  const usedNames = new Set();
  const seenHashes = new Set();
  for (const item of [...candidates.values()].slice(0, MAX_ASSETS)) {
    const base = slugify(item.title) || "certificate-artwork";
    let filename = `${base}.svg`;
    let n = 2;
    while (usedNames.has(filename)) filename = `${base}-${n++}.svg`;
    usedNames.add(filename);
    try {
      const response = await fetchRetry(item.downloadUrl, { headers: { Accept: "image/svg+xml,text/plain;q=0.9,*/*;q=0.8" } });
      const svg = await response.text();
      if (!/<svg[\\s>]/i.test(svg.slice(0, 5000)) || svg.length < 300) throw new Error("not a valid SVG document");
      if (!usableCertificate(item.title, item.description, svg)) throw new Error("not a usable certificate layout (logo/icon or unsuitable page shape)");
      const digest = crypto.createHash("sha256").update(svg).digest("hex");
      if (seenHashes.has(digest)) throw new Error("duplicate artwork");
      seenHashes.add(digest);
      // Preserve the downloaded source artwork; do not redraw or replace the design.
      await fs.writeFile(path.join(outputDir, filename), svg, "utf8");
      const id = `commons-certificate-${slugify(item.title).slice(0, 65)}`;
      const localFile = `./templates/web-certificates/${filename}`;
      const entry = {
        id, name: item.title.replace(/\\.svg$/i, "").replace(/_/g, " "),
        desc: item.description || "Original certificate layout downloaded from Wikimedia Commons.",
        category: "Certificates", type: "svg-template", thumbnail: localFile, url: localFile,
        tags: ["certificate", "original download", "editable vector", item.license],
        style: "Original downloaded SVG artwork", sourceName: "Wikimedia Commons",
        sourceUrl: item.sourceUrl, creator: item.author, license: item.license,
        licenseUrl: item.licenseUrl, downloadedFile: localFile
      };
      retained.push(entry);
      imported.push({ id, name: entry.name, localFile, sourceUrl: item.sourceUrl, creator: item.author, license: item.license, licenseUrl: item.licenseUrl, sha256: digest });
      console.log(`Imported licensed certificate layout: ${item.title}`);
    } catch (error) {
      console.warn(`Skipping ${item.title}: ${error.message}`);
    }
    await sleep(1100);
  }

  // Delete old downloaded assets not present in the new verified catalogue.
  const activeFiles = new Set(imported.map((item) => path.basename(item.localFile)));
  for (const name of await fs.readdir(outputDir)) {
    if (name.endsWith(".svg") && !activeFiles.has(name) && !/^joes-original-certificate-\\d+\\.svg$/i.test(name)) {
      // Keep only importer-owned files; unrelated curated files are not touched.
      const oldManifest = await fs.readFile(manifestPath, "utf8").catch(() => "{}");
      let oldItems = [];
      try { oldItems = JSON.parse(oldManifest).items || []; } catch {}
      if (oldItems.some((item) => path.basename(item.localFile || "") === name)) await fs.rm(path.join(outputDir, name), { force: true });
    }
  }
  await fs.writeFile(cataloguePath, JSON.stringify(retained, null, 2) + "\\n");
  await fs.writeFile(manifestPath, JSON.stringify({
    title: "Joes Studio Original Certificate Artwork Library",
    source: "Verified original SVG artwork downloaded from Wikimedia Commons",
    method: "Source SVGs are downloaded unchanged; no generated designs or logos are substituted",
    imported: imported.length,
    totalCertificateTemplates: retained.filter((item) => item.category === "Certificates").length,
    licensePolicy: "Only public-domain, CC0, CC BY, or CC BY-SA assets with source/creator/licence metadata are eligible",
    items: imported
  }, null, 2) + "\\n");
  console.log(`Imported ${imported.length} valid, unique certificate layouts.`);
  if (!imported.length) throw new Error("No suitable licensed certificate layouts were downloaded. Existing catalogue is retained, and no synthetic fallback is created.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
