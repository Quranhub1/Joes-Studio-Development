#!/usr/bin/env node
/**
 * Import reviewed CC0 certificate SVGs from OpenClipart into the local app bundle.
 * Run: node scripts/import-openclipart-certificates.mjs
 *
 * Every source is pinned to an OpenClipart item page and download ID. The script
 * refuses non-SVG responses and records the source/licence beside every asset.
 * Review assets visually before publishing; CC0 does not resolve trademark or
 * provenance concerns for questionable uploads.
 */
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "templates", "web-certificates");
const cataloguePath = path.join(root, "templates", "templates.json");
const manifestPath = path.join(outputDir, "manifest.json");
const sources = [
  { id: "oc-certificate-guilloche-354207", name: "Guilloché Certificate Frame", creator: "Raf", itemId: "354207", slug: "certificate", tags: ["guilloche", "formal", "frame", "diploma"] },
  { id: "oc-certificate-award-267796", name: "Certificate of Award", creator: "Arvin61r58", itemId: "267796", slug: "certificate-of-award", tags: ["award", "gold", "achievement"] },
  { id: "oc-certificate-blue-27805", name: "Blue Certificate", creator: "DooFi", itemId: "27805", slug: "certificate", tags: ["blue", "classic", "certificate"] },
  { id: "oc-certificate-red-27807", name: "Red Certificate", creator: "DooFi", itemId: "27807", slug: "certificate", tags: ["red", "classic", "certificate"] },
  { id: "oc-certificate-icon-27806", name: "Certificate Emblem", creator: "DooFi", itemId: "27806", slug: "certificate", tags: ["icon", "emblem", "certificate"] },
  { id: "oc-certificate-01-107083", name: "Certificate 01", creator: "Anonymous (originally Joshua Warren for OCAL)", itemId: "107083", slug: "certificate-01", tags: ["classic", "border", "diploma"] },
  { id: "oc-certificate-frame-50113", name: "Certificate Border Frame", creator: "FUnTHINGS", itemId: "50113", slug: "certificate-border", tags: ["frame", "ornate", "border"] },
  { id: "oc-certificate-of-award-312035", name: "Certificate of Award 2 (A4)", creator: "Arvin61r58", itemId: "312035", slug: "certificate-of-award-2-a4", tags: ["award", "A4", "academic"] },
];

await fs.mkdir(outputDir, { recursive: true });
const manifest = [];
for (const item of sources) {
  const target = path.join(outputDir, item.id + ".svg");
  const sourceUrl = `https://openclipart.org/detail/${item.itemId}/${item.slug}`;
  // OpenClipart's Download SVG link resolves to /download/<numeric-id>.
  const response = await fetch(`https://openclipart.org/download/${item.itemId}`, {
    headers: { "User-Agent": "JoesStudio-LicensedTemplateImporter/1.0" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`Download failed for ${item.id}: HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  const svg = await response.text();
  if (!contentType.includes("image/svg+xml") && !/<svg[\s>]/i.test(svg.slice(0, 2000))) {
    throw new Error(`Refusing non-SVG response for ${item.id} (${contentType})`);
  }
  if (!/<svg[\s>]/i.test(svg.slice(0, 2000))) throw new Error(`Invalid SVG for ${item.id}`);
  await fs.writeFile(target, svg, "utf8");
  manifest.push({
    ...item,
    sourceName: "OpenClipart",
    sourceUrl,
    downloadUrl: `https://openclipart.org/download/${item.itemId}`,
    license: "CC0 1.0 / public domain dedication (verify source item and provenance before release)",
    localFile: `./templates/web-certificates/${item.id}.svg`,
    importedAt: new Date().toISOString(),
  });
  console.log(`Imported ${item.name}`);
}

await fs.writeFile(manifestPath, JSON.stringify({
  title: "Joes Studio bundled web certificate designs",
  licensingPolicy: "Only publish items whose source page and licence have been reviewed; do not treat free download alone as permission to redistribute.",
  items: manifest,
}, null, 2) + "\n");

const catalogue = JSON.parse(await fs.readFile(cataloguePath, "utf8"));
const existingIds = new Set(catalogue.map((item) => item.id));
const entries = manifest.filter((item) => !existingIds.has(item.id)).map((item) => ({
  id: item.id,
  name: item.name,
  desc: `Downloaded vector artwork by ${item.creator} from OpenClipart. CC0 source; editable SVG artwork with a source record.`,
  category: "Certificates",
  type: "svg-template",
  thumbnail: item.localFile,
  url: item.localFile,
  tags: [...item.tags, "web design", "openclipart", "cc0"],
  style: "Original web design",
  sourceName: "OpenClipart",
  sourceUrl: item.sourceUrl,
  creator: item.creator,
  license: item.license,
}));
const merged = [...catalogue, ...entries];
await fs.writeFile(cataloguePath, JSON.stringify(merged, null, 2) + "\n");
console.log(`Added ${entries.length} template entries. Total catalogue items: ${merged.length}.`);
