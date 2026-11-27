# VEXORA Pro OS

Google Apps Script hosted business management system with Google Sheets as its central database.

## Files to add to the Apps Script project

Create a new project at https://script.google.com and add these files using the exact names:
- `Code.gs`
- `Index.html`
- `Stylesheet.html`
- `JavaScript.html`

Copy each matching file from this repository. The `backend/Code.gs` file is a legacy schema-only reference; the root `Code.gs` is the active backend.

## First-time deployment

1. Open **Project Settings → Script Properties** in Apps Script.
2. Add `VEXORA_SETUP_KEY` with a long, random, one-time setup secret. Do not share it.
3. In **Project Settings → Time zone**, select the business time zone.
4. Deploy → **New deployment** → **Web app**.
5. Execute as: **Me** (the spreadsheet owner).
6. Set access to the audience who will use the CRM. The app has its own username/password authentication; the deployment owner must keep the spreadsheet private.
7. Open the web app URL. The first-time setup screen requires the setup key and lets you create the first CEO account.
8. Sign in, then use Settings → Account management to create the second CEO and the single Admin account.

The first CEO setup key is checked on the server and is not stored in the Users sheet. Once the first CEO is created, bootstrap is permanently disabled.

## Database structure

The script automatically creates a private Google Spreadsheet and stores its ID in Script Properties. It creates these tabs:
- `Users`: user ID, username, salted password hash, salt, role, status, timestamps. **Plaintext passwords are never stored.**
- `Customers`
- `Subscriptions`
- `Products`
- `Sales`
- `Expenses`
- `Activity_Logs`
- `Workspace`: settings and synchronization revision

CRM records are stored in their respective tabs as JSON rows, so the original record fields remain intact while the app schema can evolve.

## Live synchronization

- Every CRM save writes the current records to Google Sheets.
- Each signed-in browser checks for a newer cloud revision every 5 seconds.
- Manual sync is available from the top bar.
- A stale save is rejected and the client reloads the latest cloud version rather than silently overwriting newer data.
- All server-side read/write functions validate the session token.

## Authentication and roles

- First account: CEO.
- Maximum two active CEO accounts.
- Maximum one active Admin account.
- Only a CEO can create accounts.
- Passwords require at least 12 characters and are salted + iteratively SHA-256 hashed.
- Sessions expire after six hours.
- Sign out invalidates the current session.

## Important security notes

- Keep the spreadsheet shared only with trusted owners. Do not publish the database spreadsheet.
- Deploy the web app as **Execute as Me** so users do not need direct spreadsheet access.
- Protect the Apps Script project and its Script Properties.
- Use a unique setup key and strong, unique passwords.
- Google Apps Script is suitable for this CRM's initial deployment, but it has quotas and execution limits. For high-volume multi-user use, move to a dedicated database and stronger identity provider.
- Live sync uses polling (5 seconds), not instantaneous push notifications.
- Make a spreadsheet backup before major changes.

## Local development files

The original static files under `assets/` are retained for reference. The Apps Script deployment uses the root HTML templates above.
