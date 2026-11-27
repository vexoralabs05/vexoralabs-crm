# VEXORA Pro OS

A clean rebuild of the VEXORA CRM as a premium, responsive business control center.

## Current build

- Dashboard with revenue, collections, expenses, net cash, monthly charts, division mix and upcoming VPN expiry alerts.
- Customer CRM with customer type, phone, email, company, internet provider/package, Telegram, address and notes.
- VPN subscription register with Order ID, customer, plan, quota, ISP package, start/expiry, price, status and usage URL.
- VPN paste importer for the format `Order: U7EDAD — Niroshan`, `Package: HUTCH ZOOM 224/494/794`, `Data: 100 GB`, `Expires: 18 Dec 2026`, `Usage link: https://...`.
- Product/service catalogue seeded with the VEXORA VPN plans, LK IP add-on and Canva Access.
- POS sales with multiple line items, discount, invoice number, payment collection, outstanding balance and printable invoice.
- Expense records by date, category, division, vendor and payment method.
- Finance overview, cashflow, receivables, division breakdown and analytics.
- Activity log, CSV exports, JSON backup/restore and business settings.
- Responsive desktop and mobile layout.

## Login

There is deliberately **no login screen or login credentials** in this build. Authentication can be added as a final phase as requested.

## Data storage status

The current browser build is fully usable in the browser and saves records in that browser's local storage. This is useful for testing the CRM workflows, but it is not yet a shared multi-user cloud database. Export a JSON backup regularly.

The `backend/Code.gs` file contains the Google Sheets schema bootstrap. It creates the canonical Sheets tabs but deliberately does not expose a public write API. Do not deploy a publicly accessible Apps Script endpoint that can read/write customer data before authentication and authorization are added.

## Google Sheets setup (schema only)

1. Create a private Google Spreadsheet.
2. Copy its ID into `VEXORA_OS.SPREADSHEET_ID` in `backend/Code.gs`.
3. Open Extensions → Apps Script and paste the file.
4. Run `setupVexoraProOS()` once and authorize it.
5. Keep the spreadsheet private. Cloud synchronization will be enabled in a later authenticated phase.

## Run / publish

The frontend is static HTML/CSS/JS and can be served locally or published with GitHub Pages from the repository root. No build step or package manager is required.

## Important

- No files from the old CRM UI are reused.
- No authentication credentials or passwords are embedded.
- Customer and subscription data is currently local to the browser.
- Google Sheets sync and multi-user permissions are intentionally deferred until the final login/security phase.
