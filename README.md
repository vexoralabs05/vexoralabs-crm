# Vexora Labs CRM

Separate CRM application for Vexora Labs. It does not modify or integrate into the existing public Vexora website.

## Current architecture

- Firebase Authentication: Google and Email/Password providers.
- Google Sheets: private CRM database.
- Google Apps Script: server-side access layer and role checks.
- Apps Script HTML Service: hosts the authenticated CRM UI and uses `google.script.run` for server calls.
- GitHub Pages: serves the public CRM entry page and embeds the Apps Script CRM workspace. The Apps Script app remains the trusted UI/backend host; the GitHub page is a launcher shell, not a replacement backend.
- GitHub repository: source and version history. Do not put credentials, service-account keys, customer exports, or passwords here.

## Initial CEO accounts

- Shenol: shenolperera5@gmail.com — SUPER_ADMIN
- Thenul: thenulvidusitha10@gmail.com — SUPER_ADMIN

CEO accounts are created by each CEO using the first-time setup in the CRM app. Only these two allowlisted email addresses are seeded as SUPER_ADMIN. Email verification is required before access.

## Deploying the Apps Script app

1. Open the private Google Sheet named **Vexora Labs CRM**.
2. Extensions → Apps Script.
3. Create an HTML file named `App`.
4. Copy `backend/Code.gs` into `Code.gs` and `backend/App.html` into the HTML file.
5. In Apps Script Project Settings → Script Properties, add:
   - Property: `FIREBASE_WEB_API_KEY`
   - Value: the Firebase Web API key from the Firebase web app config.
6. Save. Run `bootstrapVexoraAdmins` once from the Apps Script editor and authorize it. It creates/updates the two CEO registry rows and ensures the CRM tabs exist without clearing data.
7. In `doGet()`, retain `.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)` so the CRM can be displayed inside the GitHub Pages shell. Deploy → Manage deployments → Edit → New version → Deploy. Execute as **Me**. Copy the current deployment URL and keep it in the repository `index.html` iframe and fallback link.
8. Enable GitHub Pages in repository Settings → Pages → Deploy from a branch → `main` → `/ (root)`. The public entry page is `https://vexoralabs05.github.io/vexoralabs-crm/` once Pages finishes publishing.
9. In Firebase Authentication → Settings → Authorized domains, authorize the actual host shown in the browser during Firebase sign-in (for example, `script.google.com` or `script.googleusercontent.com` if the embedded app uses those origins). Do not add guessed domains; use the exact origin in the error.
10. Each CEO opens the GitHub Pages URL or the fallback Apps Script link, enters their own approved email and chooses a unique password under **First-time CEO account setup**. Each verifies the email before signing in.

## Security notes

- Never publish the Google Sheet or share it as "Anyone with the link".
- Do not store passwords in Sheets.
- Firebase Web config is a client config, not an Admin SDK credential. Restrict the API key by allowed APIs and HTTP referrers where applicable.
- The Apps Script backend checks Firebase identity with the Identity Toolkit account lookup endpoint, then checks the private Users sheet for role and status.
- The first release implements login, CEO role bootstrap, dashboard counts, customer CRUD and staff account creation. Invoices, payments, subscriptions, expenses, product CRUD, audit UI, and advanced permissions still need their next implementation pass.
- Apps Script quotas and Sheets concurrency make this a small-business starter architecture, not an unlimited-scale database.
