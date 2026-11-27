/**
 * VEXORA Pro OS - Google Sheets schema bootstrap.
 * Cloud writes are intentionally not exposed as a public API yet.
 * Add Firebase/Auth or another verified identity layer before deployment.
 */
const VEXORA_OS = {
  SPREADSHEET_ID: "ADD_GOOGLE_SHEET_ID",
  HEADERS: {
    Customers: ["customer_id","customer_code","name","type","phone","email","company","internet_provider","internet_package","telegram","address","notes","created_at","updated_at"],
    Products: ["product_id","name","sku","division","category","description","price","cost","stock","track_stock","active"],
    Subscriptions: ["subscription_id","customer_id","order_id","plan","data_limit","internet_package","start_date","expiry_date","price","status","usage_url","notes","created_at","updated_at"],
    Sales: ["sale_id","invoice_no","customer_id","sale_date","subtotal","discount","total","paid","balance","payment_status","payment_method","due_date","items_json","created_at"],
    Payments: ["payment_id","sale_id","amount","payment_date","payment_method","reference","notes"],
    Expenses: ["expense_id","expense_date","category","division","description","vendor","payment_method","amount","reference","created_at"],
    Activity_Logs: ["activity_id","timestamp","action","module","details"]
  }
};

/** Run manually once to create the VEXORA Pro OS spreadsheet schema. */
function setupVexoraProOS() {
  if (VEXORA_OS.SPREADSHEET_ID === "ADD_GOOGLE_SHEET_ID") {
    throw new Error("Set VEXORA_OS.SPREADSHEET_ID before running setup.");
  }
  const ss = SpreadsheetApp.openById(VEXORA_OS.SPREADSHEET_ID);
  Object.entries(VEXORA_OS.HEADERS).forEach(([name, headers]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    } else {
      const current = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      const missing = headers.filter(h => !current.includes(h));
      if (missing.length) sh.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
    }
  });
  return "VEXORA Pro OS Sheets schema created. No public API has been deployed.";
}

/** Monthly ledgers can be generated later by the authenticated sync layer. */
function createMonthlyLedger_(prefix, date, headers) {
  const ss = SpreadsheetApp.openById(VEXORA_OS.SPREADSHEET_ID);
  const month = Utilities.formatDate(date || new Date(), Session.getScriptTimeZone(), "yyyy_MM");
  const name = prefix + "_" + month;
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}
