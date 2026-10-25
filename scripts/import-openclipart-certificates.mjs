#!/usr/bin/env node
/**
 * Build a bundled library of 1,000 original, editable vector certificate designs.
 *
 * This generator is intentionally offline and deterministic: it does not depend on
 * third-party search APIs, external image URLs, or downloads that can fail in CI.
 * Every generated SVG is self-contained and can be imported into the Fabric editor.
 */
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "templates", "web-certificates");
const cataloguePath = path.join(root, "templates", "templates.json");
const manifestPath = path.join(outputDir, "manifest.json");
const COUNT = Math.max(1, Math.min(1000, Number(process.env.MAX_CERTIFICATE_ASSETS || 1000)));

const palettes = [
  ["#17365D", "#C6A04A", "#F8F2E4"], ["#0F766E", "#D6A84F", "#F0F9F6"],
  ["#6B213E", "#D9A6A0", "#FFF5F3"], ["#243B53", "#829AB1", "#F0F4F8"],
  ["#3B2F63", "#B9A7E8", "#F7F4FF"], ["#7C4A03", "#D6B36A", "#FFFAEB"],
  ["#24543D", "#B7CDA8", "#F4F8F0"], ["#713F12", "#E7B9A3", "#FFF7ED"],
  ["#164E63", "#67B7C9", "#ECFEFF"], ["#374151", "#9CA3AF", "#F9FAFB"],
  ["#7F1D1D", "#FCA5A5", "#FFF1F2"], ["#4338CA", "#A5B4FC", "#EEF2FF"],
  ["#854D0E", "#FACC15", "#FEFCE8"], ["#115E59", "#5EEAD4", "#F0FDFA"],
  ["#4A044E", "#E9A8D4", "#FDF4FF"], ["#1E3A8A", "#93C5FD", "#EFF6FF"],
  ["#365314", "#BEF264", "#F7FEE7"], ["#9A3412", "#FDBA74", "#FFF7ED"],
  ["#334155", "#E2C08D", "#F8FAFC"], ["#581C87", "#D8B4FE", "#FAF5FF"]
];
const titles = [
  ["Certificate of Achievement", "IN RECOGNITION OF EXCELLENCE"],
  ["Certificate of Completion", "SUCCESSFULLY COMPLETED THE PROGRAMME"],
  ["Certificate of Appreciation", "WITH GRATITUDE AND RECOGNITION"],
  ["Certificate of Participation", "FOR ACTIVE PARTICIPATION"],
  ["Award of Excellence", "IN HONOUR OF OUTSTANDING PERFORMANCE"],
  ["Certificate of Recognition", "FOR DEDICATION AND DISTINGUISHED SERVICE"],
  ["Professional Development", "FOR CONTINUING LEARNING AND GROWTH"],
  ["Certificate of Merit", "FOR MERITORIOUS CONTRIBUTION"],
  ["Training Completion", "HAS COMPLETED THE REQUIRED TRAINING"],
  ["Certificate of Service", "IN APPRECIATION OF VALUABLE SERVICE"],
  ["Academic Distinction", "FOR SCHOLARLY ACHIEVEMENT"],
  ["Leadership Award", "FOR EXCEPTIONAL LEADERSHIP"],
  ["Certificate of Excellence", "FOR CONSISTENT HIGH STANDARDS"],
  ["Workshop Certificate", "FOR SUCCESSFUL WORKSHOP ATTENDANCE"],
  ["Community Contribution", "FOR POSITIVE COMMUNITY IMPACT"],
  ["Certificate of Accomplishment", "IN RECOGNITION OF THIS MILESTONE"],
  ["Creative Achievement", "FOR ORIGINALITY AND CREATIVE WORK"],
  ["Volunteer Recognition", "IN THANKS FOR GENEROUS VOLUNTEER SERVICE"],
  ["Skills Certification", "FOR DEMONSTRATED KNOWLEDGE AND SKILL"],
  ["Special Commendation", "FOR A NOTABLE CONTRIBUTION"]
];
const ornaments = ["medallion", "laurel", "rosette", "star", "diamond", "ribbon", "sunburst", "seal", "floral", "minimal"];
const frames = ["double", "rounded", "corner", "dashed", "arch", "geometric", "classic", "thin", "art-deco", "none"];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function designSvg(index, title, subtitle, palette, frame, ornament) {
  const [ink, accent, paper] = palette;
  const serif = index % 3 !== 1 ? "Georgia, 'Times New Roman', serif" : "Arial, Helvetica, sans-serif";
  const titleSize = title.length > 27 ? 29 : title.length > 21 ? 33 : 38;
  const corner = (x, y, sx, sy) => `<g transform="translate(${x} ${y}) scale(${sx} ${sy})" fill="none" stroke="${accent}" stroke-width="2"><path d="M0 44V0H44"/><path d="M7 31V7H31"/><circle cx="8" cy="8" r="3" fill="${accent}"/></g>`;
  let frameMarkup = "";
  if (frame === "double") frameMarkup = `<rect x="24" y="24" width="792" height="547" fill="none" stroke="${ink}" stroke-width="3"/><rect x="34" y="34" width="772" height="527" fill="none" stroke="${accent}" stroke-width="1.5"/>`;
  else if (frame === "rounded") frameMarkup = `<rect x="22" y="22" width="796" height="551" rx="28" fill="none" stroke="${ink}" stroke-width="3"/><rect x="34" y="34" width="772" height="527" rx="20" fill="none" stroke="${accent}" stroke-width="1.5"/>`;
  else if (frame === "corner") frameMarkup = corner(30,30,1,1)+corner(810,30,-1,1)+corner(30,565,1,-1)+corner(810,565,-1,-1);
  else if (frame === "dashed") frameMarkup = `<rect x="26" y="26" width="788" height="543" fill="none" stroke="${ink}" stroke-width="2" stroke-dasharray="7 5"/><rect x="38" y="38" width="764" height="519" fill="none" stroke="${accent}" stroke-width="1"/>`;
  else if (frame === "arch") frameMarkup = `<path d="M40 560V170Q420 -35 800 170V560" fill="none" stroke="${ink}" stroke-width="3"/><path d="M52 560V178Q420 0 788 178V560" fill="none" stroke="${accent}" stroke-width="1.5"/>`;
  else if (frame === "geometric") frameMarkup = `<path d="M24 80L24 24H80M760 24H816V80M24 516V572H80M760 572H816V516" fill="none" stroke="${ink}" stroke-width="4"/><path d="M40 90L90 40M750 40L800 90M40 506L90 556M750 556L800 506" stroke="${accent}" stroke-width="2"/>`;
  else if (frame === "classic") frameMarkup = `<rect x="24" y="24" width="792" height="547" fill="none" stroke="${ink}" stroke-width="5"/><rect x="40" y="40" width="760" height="515" fill="none" stroke="${accent}" stroke-width="1.5"/><path d="M55 82H765M55 515H765" stroke="${accent}" stroke-width="1"/>`;
  else if (frame === "thin") frameMarkup = `<rect x="30" y="30" width="780" height="535" fill="none" stroke="${accent}" stroke-width="1.4"/>`;
  else if (frame === "art-deco") frameMarkup = `<path d="M24 24H816V572H24Z M40 40H800V556H40Z M60 60H780V536H60Z" fill="none" stroke="${accent}" stroke-width="1.5"/><path d="M24 24L110 110M816 24L730 110M24 572L110 486M816 572L730 486" stroke="${ink}" stroke-width="3"/>`;
  let emblem = "";
  if (ornament === "medallion") emblem = `<circle cx="420" cy="125" r="36" fill="${paper}" stroke="${accent}" stroke-width="3"/><circle cx="420" cy="125" r="27" fill="none" stroke="${accent}" stroke-width="1.5"/><path d="M420 101L426 117L443 118L430 129L434 145L420 136L406 145L410 129L397 118L414 117Z" fill="${accent}"/>`;
  else if (ornament === "laurel") emblem = `<g fill="none" stroke="${accent}" stroke-width="2.5"><path d="M388 148Q350 120 375 89M452 148Q490 120 465 89"/><path d="M380 135l-17 -3 5 -16 16 8M375 117l-9 -15 14 -9 9 15M460 135l17 -3 -5 -16 -16 8M465 117l9 -15 -14 -9 -9 15"/><circle cx="420" cy="119" r="24"/></g><path d="M410 108l10 -10 10 10v17l-10 8-10-8z" fill="${accent}"/>`;
  else if (ornament === "rosette") emblem = `<g transform="translate(420 122)" fill="${accent}">${Array.from({length:12},(_,j)=>`<ellipse rx="7" ry="20" transform="rotate(${j*30}) translate(0 -17)"/>`).join("")}<circle r="17" fill="${paper}" stroke="${accent}" stroke-width="3"/><circle r="8"/></g>`;
  else if (ornament === "star") emblem = `<path d="M420 84L430 108L456 110L436 127L442 152L420 139L398 152L404 127L384 110L410 108Z" fill="${accent}"/><circle cx="420" cy="119" r="42" fill="none" stroke="${accent}" stroke-width="1.5"/>`;
  else if (ornament === "diamond") emblem = `<path d="M420 80L457 120L420 160L383 120Z" fill="none" stroke="${accent}" stroke-width="3"/><path d="M420 94L444 120L420 146L396 120Z" fill="${accent}"/>`;
  else if (ornament === "ribbon") emblem = `<path d="M388 87H452V125Q420 148 388 125Z" fill="${accent}"/><path d="M395 125L385 157L410 145L420 158L420 137M445 125L455 157L430 145L420 158" fill="${accent}"/><text x="420" y="115" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="${paper}">★</text>`;
  else if (ornament === "sunburst") emblem = `<g stroke="${accent}" stroke-width="2"><circle cx="420" cy="122" r="25" fill="none"/>${Array.from({length:16},(_,j)=>`<path d="M420 86V76" transform="rotate(${j*22.5} 420 122)"/>`).join("")}</g><circle cx="420" cy="122" r="9" fill="${accent}"/>`;
  else if (ornament === "seal") emblem = `<path d="M420 81L453 100V137L420 156L387 137V100Z" fill="none" stroke="${accent}" stroke-width="3"/><path d="M420 91L444 105V132L420 146L396 132V105Z" fill="${accent}"/><path d="M410 119l7 7 14 -16" fill="none" stroke="${paper}" stroke-width="3"/>`;
  else if (ornament === "floral") emblem = `<g fill="none" stroke="${accent}" stroke-width="2.5"><circle cx="420" cy="120" r="12"/><ellipse cx="420" cy="99" rx="9" ry="16"/><ellipse cx="420" cy="141" rx="9" ry="16"/><ellipse cx="399" cy="120" rx="16" ry="9"/><ellipse cx="441" cy="120" rx="16" ry="9"/><ellipse cx="405" cy="105" rx="8" ry="14" transform="rotate(-45 405 105)"/><ellipse cx="435" cy="135" rx="8" ry="14" transform="rotate(-45 435 135)"/></g>`;
  else emblem = `<circle cx="420" cy="120" r="4" fill="${accent}"/><path d="M390 120H405M435 120H450" stroke="${accent}" stroke-width="2"/>`;
  const signatureLines = index % 2
    ? '<path d="M170 466H330M510 466H670" stroke="#777" stroke-width="1.2"/><text x="250" y="486" text-anchor="middle" font-size="11" fill="#666">AUTHORISED SIGNATURE</text><text x="590" y="486" text-anchor="middle" font-size="11" fill="#666">DATE</text>'
    : '<path d="M180 466H350M490 466H660" stroke="#777" stroke-width="1.2"/><text x="265" y="486" text-anchor="middle" font-size="11" fill="#666">DIRECTOR / INSTRUCTOR</text><text x="575" y="486" text-anchor="middle" font-size="11" fill="#666">ISSUE DATE</text>';
  const topRule = index % 4 === 0
    ? `<path d="M270 177H570" stroke="${accent}" stroke-width="1.5"/><circle cx="420" cy="177" r="4" fill="${accent}"/>`
    : `<path d="M315 176H525" stroke="${accent}" stroke-width="1.5"/><path d="M410 176l10 -5 10 5 -10 5z" fill="${accent}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="595" viewBox="0 0 840 595" role="img" aria-label="${esc(title)} certificate design">
<rect width="840" height="595" fill="${paper}"/>
<rect x="0" y="0" width="840" height="595" fill="none" stroke="${accent}" stroke-width="1" opacity=".3"/>
${frameMarkup}
${emblem}
<text x="420" y="205" text-anchor="middle" font-family="${serif}" font-size="12" letter-spacing="4" fill="${ink}">JOES STUDIO • CERTIFICATE</text>
<text x="420" y="252" text-anchor="middle" font-family="${serif}" font-size="${titleSize}" font-weight="bold" fill="${ink}">${esc(title)}</text>
${topRule}
<text x="420" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="1" fill="${paper}">.</text>
<text x="420" y="287" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" letter-spacing="1.6" fill="${ink}">THIS CERTIFICATE IS PROUDLY PRESENTED TO</text>
<path d="M170 343H670" stroke="${accent}" stroke-width="1.6"/>
<text x="420" y="331" text-anchor="middle" font-family="${serif}" font-size="27" font-style="italic" fill="${ink}">Recipient Name</text>
<text x="420" y="374" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" letter-spacing="1.1" fill="${ink}">${esc(subtitle)}</text>
<text x="420" y="405" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="${ink}">In recognition of commitment, achievement, and dedication.</text>
${signatureLines}
<text x="420" y="531" text-anchor="middle" font-family="${serif}" font-size="11" letter-spacing="2" fill="${accent}">ISSUED WITH PRIDE AND APPRECIATION</text>
</svg>`;
}

await fs.mkdir(outputDir, { recursive: true });
const catalogue = JSON.parse(await fs.readFile(cataloguePath, "utf8"));
const existingIds = new Set(catalogue.map((item) => item.id));
const generated = [];
for (let i = 0; i < COUNT; i++) {
  const serial = i + 1;
  const id = `joes-original-certificate-${String(serial).padStart(4, "0")}`;
  // Interleave the design dimensions instead of repeating a short block of layouts.
  // This yields distinct title/palette/frame/emblem combinations across the 1,000 set.
  const [title, subtitle] = titles[(i * 7 + Math.floor(i / 10)) % titles.length];
  const palette = palettes[(i * 13 + Math.floor(i / 20)) % palettes.length];
  const frame = frames[(i * 3 + Math.floor(i / 7)) % frames.length];
  const ornament = ornaments[(i * 7 + Math.floor(i / 11)) % ornaments.length];
  const variant = Math.floor(i / (titles.length * palettes.length)) + 1;
  const name = `${title} — Design ${String(serial).padStart(4, "0")}`;
  const localFile = `./templates/web-certificates/${id}.svg`;
  const filePath = path.join(outputDir, `${id}.svg`);
  await fs.writeFile(filePath, designSvg(i, title, subtitle, palette, frame, ornament), "utf8");
  if (!existingIds.has(id)) {
    catalogue.push({
      id, name,
      desc: `Original editable vector certificate design. Variant ${variant}; includes recipient, recognition text, issue date and signature areas. All artwork is bundled locally and can be customised in Joes Studio.`,
      category: "Certificates", type: "svg-template", thumbnail: localFile, url: localFile,
      tags: ["certificate", "original design", title.toLowerCase(), frame, ornament, `palette-${(i * 13 + Math.floor(i / 20)) % palettes.length + 1}`, "editable", "vector"],
      style: `${frame} frame · ${ornament} emblem · palette ${(i * 13 + Math.floor(i / 20)) % palettes.length + 1}`,
      sourceName: "Joes Studio Original Vector Library", sourceUrl: "https://joesstudio.vercel.app/",
      creator: "Joes Studio", license: "Original Joes Studio design", licenseUrl: "",
    });
    existingIds.add(id);
  }
  generated.push({ id, name, localFile, title, frame, ornament, palette: palette[0] });
}
await fs.writeFile(cataloguePath, JSON.stringify(catalogue, null, 2) + "\n");
await fs.writeFile(manifestPath, JSON.stringify({
  title: "Joes Studio Original Certificate Design Library",
  source: "Generated locally by Joes Studio; no external downloads required",
  license: "Original Joes Studio vector artwork, customisable within the editor",
  generated: generated.length,
  totalCertificateTemplates: catalogue.filter((item) => item.category === "Certificates").length,
  items: generated
}, null, 2) + "\n");
console.log(`Generated ${generated.length} original SVG certificate designs. Certificate catalogue total: ${catalogue.filter((item) => item.category === "Certificates").length}.`);
