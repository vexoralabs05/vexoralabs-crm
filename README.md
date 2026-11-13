# Vexora Labs CRM

CRM interface hosted on GitHub Pages, Firebase Email/Password authentication, Google Apps Script backend bridge, and private Google Sheets database.

## Architecture
- GitHub Pages: complete CRM UI, HTML/CSS/JavaScript and logo.
- Firebase Authentication: Email + Password only.
- Google Apps Script: hidden iframe bridge and secure backend methods.
- Google Sheets: private CRM database.

No Vercel, Cloudflare Worker, or public spreadsheet is required.

## Setup

### 1. Apps Script
1. Open the Apps Script project connected to the **Vexora Labs CRM** spreadsheet.
2. Replace all contents of `Code.gs` with `backend/Code.gs` from this repository.
3. In Project Settings → Script Properties, keep/add `FIREBASE_WEB_API_KEY` with the Firebase Web API key.
4. Run `bootstrapVexoraAdmins` once. Check execution log and confirm the Users sheet has both CEO rows with role `SUPER_ADMIN`.
5. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone.
6. Copy the deployed Web App URL ending in `/exec`.

### 2. Configure GitHub frontend
1. Open `src/config.js`.
2. Set `APPS_SCRIPT_URL` to the deployed Apps Script `/exec` URL. Do not add a secret here.
3. Commit to `main`.
4. GitHub → Settings → Pages → Deploy from branch → `main` → `/(root)`.

### 3. Firebase
1. Authentication → Sign-in method: enable Email/Password.
2. Authentication → Settings → Authorized domains: add `vexoralabs05.github.io`.
3. Create the CEO Firebase Authentication users separately and verify both email addresses. Google Sheet rows alone do not create Firebase accounts.

## CEO registry
- shenolperera5@gmail.com — SUPER_ADMIN
- thenulvidusitha10@gmail.com — SUPER_ADMIN

## Security
- Never make the Sheet public.
- Do not store passwords in Sheets or GitHub.
- Backend verifies Firebase ID tokens and checks role/status from the private Users sheet.
- Apps Script web app is public to allow the iframe bridge, but CRM data methods require a valid Firebase identity and role.
