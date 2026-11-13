# Vexora Labs CRM

Standalone CRM for Vexora Labs. The existing public Vexora website is not modified.

## Architecture

- GitHub Pages: hosts the complete CRM frontend (HTML, CSS, JavaScript and `index1.png` logo).
- Firebase Authentication: Google and Email/Password sign-in.
- Vercel Serverless Function: small API relay with CORS. It is not a Cloudflare Worker and contains no CRM UI.
- Google Apps Script: validates the relay secret, verifies Firebase identity, enforces CRM roles and reads/writes Sheets.
- Google Sheets: the private CRM database.

The GitHub Pages URL is `https://vexoralabs05.github.io/vexoralabs-crm/`.

## Deployment checklist

### 1. Google Apps Script

1. Open the Apps Script project attached to **Vexora Labs CRM**.
2. Replace `Code.gs` with `backend/Code.gs` from this repository.
3. In Project Settings → Script Properties, keep `FIREBASE_WEB_API_KEY` and add `CRM_BRIDGE_SECRET` with a long random value (at least 32 random characters).
4. Run `bootstrapVexoraAdmins` once if the CRM sheet tabs/admin rows have not already been initialized.
5. Deploy → Manage deployments → Edit → New version → Deploy as a Web app, execute as the deploying account, access: Anyone. Copy the `/exec` URL.
6. The Apps Script endpoint accepts requests only when the matching bridge secret is supplied by the Vercel function. Do not put that secret in GitHub.

### 2. Vercel API relay

1. Import this same GitHub repository at https://vercel.com/new.
2. Deploy it. Vercel detects `api/crm.js` as a serverless function.
3. In Vercel Project → Settings → Environment Variables, add:
   - `APPS_SCRIPT_URL` = the Apps Script `/exec` URL
   - `CRM_BRIDGE_SECRET` = the exact same secret saved in Apps Script Script Properties
   - `ALLOWED_ORIGIN` = `https://vexoralabs05.github.io`
4. Redeploy after adding environment variables.
5. Copy the deployed function URL, normally `https://YOUR-PROJECT.vercel.app/api/crm`.

### 3. Connect the GitHub Pages frontend

1. Open `src/config.js` and replace `https://YOUR-VERCEL-PROJECT.vercel.app/api/crm` with the actual Vercel function URL.
2. Commit the change to `main`.
3. In GitHub → Settings → Pages, select Deploy from a branch → `main` → `/(root)`.
4. In Firebase Authentication → Settings → Authorized domains, add `vexoralabs05.github.io`.
5. Open the GitHub Pages URL and sign in with an approved, email-verified CRM account.

## CEO accounts

- Shenol: `shenolperera5@gmail.com` — `SUPER_ADMIN`
- Thenul: `thenulvidusitha10@gmail.com` — `SUPER_ADMIN`

Each CEO must create their Firebase account with their own email and verify it before CRM access.

## Security

- Never make the Google Sheet public.
- Never commit `CRM_BRIDGE_SECRET`, Firebase Admin credentials, service-account keys, customer exports or passwords.
- Firebase Web config is a public client config; restrict its API key by authorized domains/referrers and APIs where applicable.
- Apps Script validates Firebase identity and checks the private Users sheet for role permissions.
- This initial frontend release includes login, dashboard counts, customer CRUD and Super Admin staff-account creation. Other modules (products, invoices, payments, expenses, subscriptions) are next development stages.
- Google Apps Script and Sheets quotas/concurrency make this a small-business starter CRM, not an unlimited-scale database.
