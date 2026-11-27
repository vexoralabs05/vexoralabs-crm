# VEXORA Labs CRM · Cloud Control Center

VEXORA Labs CRM is a separate application from the public VEXORA website. It uses GitHub Pages for the frontend, Firebase Authentication for sign-in, Google Apps Script for authenticated business operations, and a private Google Sheet as its database.

## Modules

- Secure email/password sign-in with Firebase email verification.
- Two pre-registered CEO / SUPER_ADMIN accounts.
- CEO-only team administration; one active ADMIN account maximum.
- Customer CRM with contact, business, internet-provider, telecom-package, WhatsApp, Telegram and notes fields.
- Service catalogue and POS sales with invoices, payments and balances.
- VPN subscription register with order ID, data quota, internet package, expiry, status and usage URL.
- VPN paste importer. Supports the following format:

```text
Order: U7EDAD — Niroshan
Package: HUTCH ZOOM 224/494/794
Data: 100 GB
Expires: 18 Dec 2026
Usage link: https://example.com/subscription/...
```

  The importer matches an existing customer by phone, email or name; otherwise it creates a customer using the name after the dash. Duplicate Order IDs are blocked.
- Expense records, monthly finance summary, revenue, collected payments, expenses, net result and receivables.
- Monthly Google Sheets ledgers: `Sales_YYYY_MM`, `Expenses_YYYY_MM`, and `Customer_Activity_YYYY_MM`.
- System activity logs and role-checked backend methods.\n- CEO-only Google Sheets workbook snapshot backup, stored as backup tabs inside the same private spreadsheet.

## Architecture

- **Frontend:** GitHub Pages, HTML/CSS/JavaScript.
- **Authentication:** Firebase Email/Password.
- **Backend:** Google Apps Script Web App + hidden iframe bridge.
- **Database:** private Google Sheet.
- **Repository:** this CRM only. The public VEXORA website is not modified.

## Required one-time configuration

### 1. Google Sheet and Apps Script

1. Open the private Google Sheet used by VEXORA CRM. Its ID is configured in `backend/Code.gs`.
2. Open its bound Apps Script project.
3. Replace `Code.gs` with the complete `backend/Code.gs` from this repository.
4. Keep the Apps Script HTML bridge file if it is already present. The current backend returns the bridge from `doGet()`.
5. In **Project Settings → Script Properties**, set:
   - `FIREBASE_WEB_API_KEY` = Firebase project's Web API key.
6. Run `bootstrapVexoraAdmins()` once and authorize the requested Google permissions. It creates missing CRM tabs and safely appends newly required columns to existing tabs without deleting existing data.
7. Deploy → **New deployment** → **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Copy the deployed Web App URL ending in `/exec` into `src/config.js` as `APPS_SCRIPT_URL`.

The Google Sheet must remain private. Do not publish it or share it with customers.

### 2. Firebase

1. Open Firebase Console → Project settings → General → Your apps.
2. Copy the Web App Firebase configuration.
3. In `src/firebase.js`, replace the placeholder `apiKey: "U"` with the actual Firebase Web API key for project `vexora-labs-crm-798fe`. Keep the other project identifiers aligned with the same Firebase project.
4. In Firebase Authentication, enable **Email/Password**.
5. Add `vexoralabs05.github.io` to Authorized domains.
6. Create the two CEO Firebase Authentication users and verify both email addresses. The CEO registry in the private Users sheet is:
   - `shenolperera5@gmail.com`
   - `thenulvidusitha10@gmail.com`
7. Apply HTTP-referrer restrictions to the Firebase Web API key for the GitHub Pages domain and any approved local development origin.

The Firebase Web API key is a public client identifier, not a password. Do not put service-account private keys or admin credentials in frontend files.

### 3. GitHub Pages

1. Commit the configured frontend files to the repository.
2. GitHub → Settings → Pages → Deploy from branch → `main` → `/(root)`.
3. Open the Pages URL and test CEO sign-in.

## Roles and account rules

- `SUPER_ADMIN`: the two CEO identities only. Full access, team creation and account status control.
- `ADMIN`: only one active Admin account is permitted. A CEO can create the Admin account. A disabled Admin frees the slot for a replacement.
- `MANAGER`: operational access to customers, subscriptions, services, POS and finance.
- `SALES`: customer, subscription and POS workflows.
- `ACCOUNTANT`: finance and expense workflows.
- `STAFF`: no access unless a specific permitted workflow is added.

Passwords are handled by Firebase Authentication. The CRM does not store plaintext passwords in Google Sheets. Backend methods verify the Firebase ID token and check the private Users sheet for role and status on every operation.

## Monthly data layout

The master tabs remain the canonical records: `Customers`, `Products`, `Invoices`, `Invoice_Items`, `Payments`, `Subscriptions`, `Expenses`, `Users`, and `Activity_Logs`.

Monthly tabs are created automatically as records are written:
- `Sales_YYYY_MM`
- `Expenses_YYYY_MM`
- `Customer_Activity_YYYY_MM`\n- `Customer_Records_YYYY_MM`

Run `bootstrapVexoraAdmins()` again after replacing Apps Script code to migrate the existing sheet headers. Existing records are retained. CEO can create an additional snapshot backup from Team access; backup tabs remain inside the same Google Spreadsheet.

## Important operational notes

- A Google Apps Script deployment and Firebase project configuration are external prerequisites. They cannot be completed by a Git commit alone.
- The usage link is stored as a subscription field and shown to signed-in CRM users with subscription permission. Keep the Google Sheet private and restrict CRM accounts.
- Before production use, test with a non-production customer and verify that CEO, Admin, Sales and Accountant permissions behave as expected.
- Keep regular Google Sheet version history / backups enabled. Do not paste Firebase passwords, service-account keys or other credentials into VPN import text.
