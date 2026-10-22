# Joes Studio

Joes Studio is a browser-based visual paper and document design tool. It supports editable templates, text and image elements, tables, barcodes, variable data from Excel files, PDF export, and direct printing.

## Features

- Visual drag-and-drop editor
- Editable `.paper` project files and templates
- Text, images, tables, shapes, barcodes and QR codes
- Excel `.xlsx` / `.xls` data import and variable fields
- Batch generation and printing
- PDF export
- Local browser storage and offline-first operation
- Standard paper sizes and custom layouts

## Usage

Open `index.html` in a modern browser, or deploy the repository with GitHub Pages.

**Brand:** Joes Studio

## Student Card Batch Workflow

Joes Studio includes a dedicated **Student Batch** workflow for generating many cards from one master template.

1. Create or obtain a card template as a `.paper` file (for example, a card design produced from a reference image).
2. Open **Student Batch** and select the `.paper` template from the local PC.
3. Select the student `.xlsx`, `.xls`, or `.csv` file.
4. Joes Studio reads the student rows and automatically maps matching variable fields to spreadsheet headers.
5. Choose the print sheet size, margins, gaps, and copies per student.
6. The layout calculator determines how many cards fit on each sheet.
7. Generate one print-ready PDF containing the complete student batch.

The workflow keeps the template and student data in the browser session and only reads files explicitly selected by the user. Browser file access is permission-based rather than unrestricted filesystem access.


## Performance and offline operation

The student batch workflow uses a lower-resolution portrait pass for live previews and print-resolution processing for generated output. Manual photo adjustments are applied to embedded local images, and the enhanced-photo cache uses both an entry cap and an estimated-memory budget. Batch PDF generation renders each student card once even when multiple copies are requested; the HTML print path reuses the prepared card for adjacent copies.

JSZip is bundled locally under `static/jszip.min.js` so ZIP-based workbook/template features do not require the JSZip CDN. The application can still contact external image-proxy services when a template contains remote images; local photos and bundled assets are preferred for offline use.

## Performance regression checks

Before a production release, follow [the performance regression checklist](tests/performance-regression-checklist.md). In particular, compare live-preview responsiveness with export quality, then generate and print batches with repeated copies. JavaScript syntax checks alone are not a substitute for a browser test or a visual portrait comparison.


## Curated template library

The Start from Template gallery is organised into **Start Here**, **Certificates**, **Student IDs & Badges**, **Official Documents**, and **Logos & Branding**. The local certificate, letterhead, memo and ID layouts are editable Joes Studio templates. The logo category includes source-attributed NDA, UHPAB, KSHS and UVTAB image assets, plus an option to upload an approved local logo. Logo insertion downloads and embeds the image, so remote logo insertion requires internet access; all assets can instead be supplied locally using **Add Your Own Logo**.

The gallery also links to Canva, Microsoft Create, Adobe Express and SketchValley for more template inspiration. These links open third-party sites; their own usage and licensing terms apply. See [template-library sources and usage](docs/template-library-sources.md) for source attribution, verification notes and contribution guidance.
