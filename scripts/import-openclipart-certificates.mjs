#!/usr/bin/env node
/**
 * Download real, already-published certificate/diploma SVG artwork from Wikimedia
 * Commons. This script does not draw, synthesize, or rewrite the source artwork.
 * Only files with a reusable, identifiable licence are bundled.
 */
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "templates", "web-certificates");
const cataloguePath = path.join(root, "templates", "templates.json");
const manifestPath = path.join(outputDir, "manifest.json");
const MAX_ASSETS = Math.max(1, Math.min(1000, Number(process.env.MAX_CERTIFICATE_ASSETS || 1000)));
const API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "JoesStudioCertificateLibrary/1.0 (certificate template import; contact via repository issues)";
const searches = [
  'certificate template filemime:svg',
  'diploma template filemime:svg',
  'certificate award filemime:svg',
  'certificate design filemime:svg',
  'certificate border filemime:svg',
  'diploma certificate filemime:svg'
];
const allowedLicense = /public domain|CC0|CC BY(?:-SA)?(?: 3\.0| 4\.0| 2\.0)?/i;
const slugify = (s) => String(s).normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 90);
const plain = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/&quot;/g, '"').trim();
async function getJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept": "application/json" } });
  if (!response.ok) throw new Error(`Wikimedia Commons API returned HTTP ${response.status}`);
  return response.json();
}
async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  // Remove previous locally generated designs so they cannot be mistaken for downloads.
  for (const name of await fs.readdir(outputDir)) {
    if (/^joes-original-certificate-\d+\.svg$/i.test(name)) await fs.rm(path.join(outputDir, name), { force: true });
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
        if (!info?.url || !/\.svg(?:$|\?)/i.test(info.url)) continue;
        if (!/(certificate|diploma|award|attestation)/i.test(title)) continue;
        const meta = info.extmetadata || {};
        const license = plain(meta.LicenseShortName?.value || meta.License?.value || "");
        if (!allowedLicense.test(license)) continue;
        const licenseUrl = plain(meta.LicenseUrl?.value || "");
        const author = plain(meta.Artist?.value || meta.Credit?.value || "Author not specified");
        const description = plain(meta.ImageDescription?.value || title.replace(/^File:/, ""));
        candidates.set(title, {
          title: title.replace(/^File:/, ""),
          sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
          downloadUrl: info.url, author, license, licenseUrl, description
        });
      }
    } catch (error) {
      console.warn(`Search failed for "${term}": ${error.message}`);
    }
  }

  const catalogue = JSON.parse(await fs.readFile(cataloguePath, "utf8"));
  const retained = catalogue.filter((item) => !String(item.id || "").startsWith("joes-original-certificate-"));
  const imported = [];
  const usedNames = new Set();
  for (const item of [...candidates.values()].slice(0, MAX_ASSETS)) {
    const base = slugify(item.title) || "certificate-artwork";
    let filename = `${base}.svg`;
    let n = 2;
    while (usedNames.has(filename)) filename = `${base}-${n++}.svg`;
    usedNames.add(filename);
    try {
      const response = await fetch(item.downloadUrl, { headers: { "User-Agent": USER_AGENT } });
      if (!response.ok) throw new Error(`download HTTP ${response.status}`);
      const svg = await response.text();
      if (!/<svg[\s>]/i.test(svg) || svg.length < 100) throw new Error("download was not a valid SVG document");
      // Save the downloaded source artwork without replacing its design or text.
      await fs.writeFile(path.join(outputDir, filename), svg, "utf8");
      const id = `commons-certificate-${slugify(item.title).slice(0, 70)}`;
      const entry = {
        id, name: item.title.replace(/\.svg$/i, ""),
        desc: item.description || "Certificate artwork downloaded from Wikimedia Commons.",
        category: "Certificates", type: "svg-template",
        thumbnail: `./templates/web-certificates/${filename}`,
        url: `./templates/web-certificates/${filename}`,
        tags: ["certificate", "downloaded", "Wikimedia Commons", item.license],
        style: "Original downloaded SVG artwork",
        sourceName: "Wikimedia Commons", sourceUrl: item.sourceUrl,
        creator: item.author, license: item.license, licenseUrl: item.licenseUrl,
        downloadedFile: `./templates/web-certificates/${filename}`
      };
      retained.push(entry);
      imported.push({ id, name: entry.name, localFile: entry.downloadedFile, sourceUrl: item.sourceUrl, creator: item.author, license: item.license, licenseUrl: item.licenseUrl });
      console.log(`Downloaded: ${item.title}`);
    } catch (error) {
      console.warn(`Skipping ${item.title}: ${error.message}`);
    }
  }

  const importedIds = new Set(imported.map((item) => item.id));
  const finalCatalogue = retained.filter((item) => !String(item.id || "").startsWith("commons-certificate-") || importedIds.has(item.id));
  await fs.writeFile(cataloguePath, JSON.stringify(finalCatalogue, null, 2) + "\n");
  await fs.writeFile(manifestPath, JSON.stringify({
    title: "Joes Studio Downloaded Certificate Artwork Library",
    source: "Original SVG files downloaded from Wikimedia Commons; each item links to its source page",
    method: "Downloaded existing files; no certificate designs are generated by this importer",
    imported: imported.length,
    totalCertificateTemplates: finalCatalogue.filter((item) => item.category === "Certificates").length,
    licensePolicy: "Only items with identifiable public-domain, CC0, CC BY, or CC BY-SA licences are imported",
    items: imported
  }, null, 2) + "\n");
  console.log(`Imported ${imported.length} real SVG files from Wikimedia Commons.`);
  if (!imported.length) throw new Error("No licensed certificate SVGs were downloaded. No synthetic fallback is created; inspect API/network or broaden the source search.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
