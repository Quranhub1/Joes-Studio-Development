# Joes Studio Development Roadmap

**Status:** planning and baseline audit; no feature implementation is authorized by this document alone.
**Scope:** students, individuals, small businesses, and institutions.
**Repository:** `Quranhub1/Joes-Studio-Development`
**Principle:** define observable acceptance criteria before changing code or production data. Ship small, testable pull requests and verify the deployed result.

## 1. Baseline audit (2026-10-24)

### Application
- Browser-based vanilla JavaScript application centered on `index.html`, with local/offline-first editing, Fabric.js, jsPDF/SVG-to-PDF, XLSX import, JSZip, template gallery, student batch generation, photo enhancement, and printing.
- API routes include `api/_lib.js`, `api/auth.js`, and `api/billing.js`; the API requires a serverless host and server-side Supabase credentials.
- `package.json` currently contains only project metadata and a Node >=20 engine; no test scripts or test dependencies are declared there.
- Existing performance checklist covers photo processing, repeated-copy correctness, large batches, PDF/print output, offline behavior, and cache refresh.
- Monetization UI is dynamically mounted from `static/monetization.js`; cache-busting script version in `index.html` must be bumped when this file changes.

### Database
- Active Supabase project inspected: `tceenudefdmtqoybiloy` (Postgres 17). Confirm the deployment's `SUPABASE_URL` points to this project before applying any schema change.
- Migration history includes monetization schema, subscription reminder log, profile ban columns, monetization expansion, and business-tier hybrid usage.
- Observed tables include profiles, subscriptions, payment_requests, monthly_usage, credit_wallet, credit_ledger, credit_requests, commercial_requests, and subscription_reminder_log.
- **Schema drift:** live `subscriptions.plan` constraint observed as `free, pro, business, institution`; live `payment_requests.plan` constraint observed as `pro, business, institution`. The repository contains proposed test-pricing support for hourly and annual plans, but the matching pricing migration is not present in the live migration history. Do not enable those plans in the UI until migration state and code are reconciled.
- Database audit found RLS enabled with no policies on nine monetization tables. The repository migrations explicitly revoke direct access from anon/authenticated and use service-side API access, so this may be intentional; verify grants and access paths before adding policies.
- **Critical unrelated security finding:** `public.investment_packages` has RLS disabled and is visible through the public Data API/GraphQL surface. This table is outside the Joes Studio monetization tables and may belong to another app sharing the same project. Do not change its RLS/policies until ownership and intended public access are confirmed.
- Other Supabase advisor findings: leaked-password protection is disabled; `public.update_updated_at_column` has mutable search_path; some foreign keys lack indexes; duplicate indexes exist on `monthly_usage`. Treat performance cleanups as separate migrations after checking query usage and dependencies.
- A live read-only schema check returned no constraints for the four tables queried under the exact expected names, despite verbose table metadata showing inline checks. Reconcile the inspection output and migration history before preparing a production DDL migration.

## 2. Delivery rules

1. Do not work directly on `main`; use one focused branch and PR per issue.
2. Before coding: write acceptance criteria, identify affected files/schema/API routes, and add a regression test or a reproducible manual test.
3. Before a migration: confirm the correct Supabase project, current migration history, existing data, constraints, grants, RLS, rollback strategy, and backup/restore path.
4. Do not run destructive or data-transforming SQL without a reviewed migration and a verified recovery path.
5. Do not claim a feature is fixed based only on code changes. Verify tests, API behavior, browser behavior, and deployment health.
6. Keep service-role credentials server-side. All plan, watermark, template, and quota decisions must be enforced by trusted server code; UI restrictions alone do not count.
7. After editing a script referenced by `index.html`, update its cache-busting version.
8. Keep local-first workflows local unless a user explicitly chooses to upload/save to a remote service.

## 3. Prioritized roadmap and acceptance criteria

### P0 — Release blockers: restore and stabilize current behavior

#### P0.1 Account & Plans navigation and account panel
**Dependencies:** `static/monetization.js`, `static/monetization-config.js`, `api/auth.js`, `api/billing.js`, host environment variables, Supabase Auth and schema.

**Acceptance criteria**
- On desktop and mobile, Account & Plans is visible from the main application without obscuring core editor controls.
- Signed-out users can open the panel and reach sign-in/sign-up; signed-in users can see their account, active plan, expiry, usage, billing requests, and sign-out.
- A failed API request displays an actionable error and never leaves an indefinite spinner.
- Refreshing the page preserves a valid session; signing out removes the local session and prevents authenticated actions.
- Automated smoke checks cover signed-out, signed-in Free, active paid, expired paid, and API-unavailable states.

#### P0.2 Editor controls and destructive actions
**Dependencies:** existing editor handlers, Fabric canvas state, layers/panels, undo/history behavior.

**Acceptance criteria**
- Every visible editor action has a working handler or is not rendered.
- Delete affects only the selected object; it does not delete the background or unrelated elements.
- Undo/redo (where shown) restore the previous canvas state without changing unrelated objects.
- Reset asks for confirmation if unsaved work would be discarded; Cancel leaves the canvas unchanged.
- Save/export/print failures are visible and do not silently discard the current canvas.
- A regression checklist covers add, select, move, edit, duplicate, delete, undo, redo, reset, save, reopen, export, and print.

#### P0.3 Entitlements: Free watermark and custom templates
**Dependencies:** shared entitlement logic, editor/export paths, `api/_lib.js`, `api/billing.js`, subscription schema and tests.

**Acceptance criteria**
- Free exports always include the standard Joes Studio watermark on every supported export/print path; no UI or client-side request can disable or rename it.
- Active eligible paid plans can customize or disable the watermark as specified by the approved plan matrix.
- Free users cannot activate custom templates by manipulating client state, local storage, API payloads, or direct API calls.
- Expired/cancelled paid plans immediately fall back to Free entitlements on the next server-authorized action.
- Automated tests cover plan x action x expiry combinations; browser tests verify exported PDF/print output, not just the visible canvas.

#### P0.4 Billing and schema consistency
**Dependencies:** current database migration history, `supabase/monetization*.sql`, `api/_lib.js`, `api/billing.js`, `static/monetization.js`, deployment environment variables.

**Acceptance criteria**
- A single plan catalog defines price, duration, quota, and features; UI and API return matching values.
- Only plans permitted by the live schema can be requested. Hourly/annual plans remain unavailable until the reviewed migration is applied and verified.
- Duplicate pending requests are rejected; duplicate transaction references cannot activate multiple plans/credit packs.
- Only the server-verified administrator can approve/reject requests; approvals are idempotent.
- Subscription expiry is calculated correctly for each plan; expired entitlements are not granted.
- Test Free quota, each paid quota, credit exhaustion, payment pending/approve/reject, repeated approval, expiry, and migration compatibility using test accounts.
- No real-money launch until payment and quota flows pass end-to-end tests.

#### P0.5 Photo enhancement and batch PDF regression
**Dependencies:** `static/student-photo-enhancer.js`, `static/student-batch.js`, model/CDN availability, export/print pipeline.

**Acceptance criteria**
- Small JPEG, large JPEG, transparent PNG, and remote/CORS-restricted image paths fail safely or complete as expected.
- White-background output is white and opaque when enabled; transparency is preserved when the feature is disabled and transparency is requested.
- Batch output contains every requested row in the correct order, with exact requested copy counts and no blank/missing cards.
- Preview processing remains responsive and final export uses the intended high-resolution path.
- Run and record the existing `tests/performance-regression-checklist.md` before release.

### P1 — Reliability and test infrastructure

#### P1.1 Automated test harness and CI
**Dependencies:** agree on test runner and supported browsers; repository currently declares no test scripts.

**Acceptance criteria**
- CI runs JavaScript syntax checks and unit tests on every PR.
- A browser smoke suite opens the app and checks core editor, account panel, and export flows.
- Failures block merging; instructions to reproduce locally are documented.
- A release checklist records test results and deployed commit SHA.

#### P1.2 Security hardening
**Dependencies:** Supabase ownership confirmation, migration review, API authorization tests.

**Acceptance criteria**
- Service-role key is absent from browser bundles and public environment variables.
- Unauthorized users cannot read or mutate another user's profile, subscription, requests, or credits.
- All security advisor findings relevant to this app have a documented disposition; RLS is not blindly enabled without matching access policies.
- Leaked-password protection is enabled after product/auth configuration review.
- The shared-project `investment_packages` RLS finding is triaged with the owning application before any change is made.

#### P1.3 Error handling, accessibility, and mobile layout
**Acceptance criteria**
- No blocking overlay traps keyboard focus; dialogs can be closed with keyboard and have accessible labels.
- Main workflows are usable at 360px viewport width and desktop widths.
- Network failures, invalid file types, oversized files, and export errors give actionable messages.
- No critical browser console errors occur in the smoke suite.

### P2 — Retention improvements

#### P2.1 Local project library and recovery
**Dependencies:** define .paper format compatibility, browser storage quota behavior, project versioning.

**Acceptance criteria**
- Users can save, rename, duplicate, reopen, export, and delete projects.
- Unsaved changes are detected; reload recovery is offered without overwriting newer work.
- Storage limits and local-only privacy are explained; deleting a project removes its stored copy.

#### P2.2 Dashboard and usage clarity
**Dependencies:** P0 account/billing stability.

**Acceptance criteria**
- Dashboard links to all current tools, recent local projects, Account & Plans, and support/help.
- Usage count, remaining allowance, plan status, and expiry agree with the server response.
- No future feature is shown as available unless its backend and permission checks exist.

### P3 — Growth features after reliability gates pass

- OCR/searchable scans and document conversion.
- More PDF operations (merge, split, reorder, compress) after selecting a maintained library and validating browser memory use.
- Brand kits, reusable templates, bulk certificate generation, and organization workspaces.
- AI writing/document assistance only after privacy, retention, cost, and quota policies are approved.

Each P3 feature must have a small PR, usage/cost limits, privacy review, test coverage, and an explicit plan-entitlement rule.

## 4. Suggested release gates

- **Gate A — Internal QA:** all P0 acceptance criteria pass on a test environment.
- **Gate B — Limited beta:** P1.1 and P1.2 critical checks pass; no unresolved critical security finding affecting Joes Studio data.
- **Gate C — Wider release:** photo/batch regression results recorded, payment flow verified with test transactions, rollback path documented.
- **Gate D — Feature expansion:** retention and growth work begins only after at least one stable release and a basic usage/error baseline.

## 5. First implementation slice

Start with P0.1 Account & Plans and P0.2 editor controls, but first capture reproducible failures and current screenshots/logs. In parallel, treat the live pricing migration mismatch as a release blocker for new plan options. Do not bundle unrelated UI, photo, billing, and schema changes into one PR.
