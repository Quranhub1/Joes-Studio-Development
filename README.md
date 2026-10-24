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


## Accounts, plans and manual payment approval

The development app now includes a Supabase-backed account and billing foundation with email/password signup, a required phone number, a user plan panel, and an admin approval dashboard. The admin email is checked server-side: `kaigwaakram123@gmail.com`.

- **Free:** 2 batch actions per calendar month. The Joes Studio watermark is mandatory and cannot be removed or renamed.
- **Pro:** 29,000 UGX per 30 days; premium custom templates and watermark controls.
- **Business:** 79,000 UGX per 30 days; the same current premium editor entitlements, positioned for higher-volume professional use.
- **Institution:** 750,000 UGX per year for a manually approved account plan. Multi-seat/team administration is handled as a separate institution licence request and is not yet self-service.
- **Batch credit packs:** 10,000 UGX for 100 additional batch actions. Credits are added only after manual payment verification and are used after the free monthly allowance.
- **Institution licences, template marketplace and design/setup services:** users can submit requests from Account & Plans; the admin can track their follow-up status. These are request/intake workflows, not a fully automated marketplace or multi-seat licence manager.
- **Manual payment:** send the exact displayed amount to **0749846848 — KABALI MADINA**, then submit the mobile-money transaction reference. Subscriptions and credits activate only after the admin verifies the payment.
- **Legacy plans:** when applying the expansion SQL, existing daily/weekly/monthly subscriptions and payment requests are migrated to Pro while retaining their expiry timestamps.
- **Backend API:** all billing actions remain on the serverless API; no payment gateway or automatic mobile-money verification is used.

### Required backend setup (development only)

The API handlers under `api/` require a serverless host such as Vercel; GitHub Pages cannot execute them. If the frontend stays on GitHub Pages, set `window.JOES_STUDIO_API_BASE` in `static/monetization-config.js` to the development API origin and configure the API host's `ALLOWED_ORIGINS` to include `https://quranhub1.github.io`. For a same-origin Vercel deployment, leave the API base empty. A Vercel project must be linked to this Development repository, not the production repository.

1. Create a Supabase project and run [the base monetisation SQL](supabase/monetization.sql), then run [the monetisation expansion SQL](supabase/monetization-expansion.sql) in the Supabase SQL Editor.
2. Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as **server-side environment variables** for the development deployment. Never put the service-role key in browser code.
3. Enable email/password signup and email verification in Supabase Auth. The phone number is stored as signup metadata; SMS OTP verification requires an SMS provider and is not enabled merely by collecting a phone number.
4. `CREDIT_PACK_PRICE_UGX` defaults to 10,000 UGX for a pack of 100 credits. `.env.example` documents the required variables.
5. Test signup, email verification, free monthly quotas, credit consumption, pending subscription/credit payments, approval/rejection, expiry, renewals, institution/marketplace/service requests and Pro watermark/template controls before production.

The API is deliberately fail-closed for batch actions when authentication/billing is not configured. This code has been added to the development repository only; it has not been deployed to production.
