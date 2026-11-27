const CRM = {
  spreadsheetId: "1nI6y0nrws_ZOonbHvlr4JJfHFE-r4UoIyPlE1kHJuuI",
  projectId: "vexora-labs-crm-798fe",
  admins: {
    "shenolperera5@gmail.com": "Shenol",
    "thenulvidusitha10@gmail.com": "Thenul"
  },
  headers: {
    Users: ["user_id","auth_uid","name","email","role","status","created_at","updated_at"],
    Customers: ["customer_id","customer_code","name","phone","email","address","company","customer_type","internet_provider","internet_package","whatsapp","telegram","notes","status","created_at","updated_at"],
    Products: ["product_id","product_code","name","category","description","cost_price","selling_price","status","created_at","updated_at"],
    Invoices: ["invoice_id","invoice_number","customer_id","invoice_date","due_date","subtotal","discount","tax","total","paid_amount","balance","status","created_at","updated_at"],
    Invoice_Items: ["item_id","invoice_id","product_id","description","quantity","unit_price","discount","line_total"],
    Payments: ["payment_id","invoice_id","customer_id","amount","payment_method","reference","payment_date","status","created_at"],
    Expenses: ["expense_id","category","description","amount","payment_method","expense_date","reference","vendor","receipt_url","created_at"],
    Subscriptions: ["subscription_id","customer_id","product_id","plan","internet_package","data_limit","data_unit","usage_link","order_id","start_date","expiry_date","price","status","notes","created_at","updated_at"],
    Activity_Logs: ["log_id","user_id","action","entity","entity_id","details","timestamp"],
    Settings: ["setting_id","setting_name","setting_value","description","updated_at"],
    Sync_Logs: ["sync_id","operation","entity","record_id","sync_status","error_message","timestamp"]
  }
};

// Hidden Apps Script iframe bridge. The CRM interface remains on GitHub Pages.
function doGet() {
  const bridgeHtml = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<script>
const PARENT_ORIGIN = "https://vexoralabs05.github.io";
let BRIDGE_CHANNEL = "";
window.addEventListener("message", function(event) {
  if (event.origin !== PARENT_ORIGIN) return;
  const m = event.data || {};
  if (m.type === "VEXORA_BRIDGE_INIT" && m.channel) {
    BRIDGE_CHANNEL = String(m.channel);
    window.top.postMessage({type:"VEXORA_BRIDGE_READY",channel:BRIDGE_CHANNEL}, PARENT_ORIGIN);
    return;
  }
  if (m.type !== "VEXORA_BRIDGE_REQUEST" || !m.requestId || !BRIDGE_CHANNEL || m.channel !== BRIDGE_CHANNEL) return;
  const channel = BRIDGE_CHANNEL;
  google.script.run
    .withSuccessHandler(function(result) {
      window.top.postMessage({type:"VEXORA_BRIDGE_RESULT",channel:channel,requestId:m.requestId,ok:true,data:result}, PARENT_ORIGIN);
    })
    .withFailureHandler(function(error) {
      window.top.postMessage({type:"VEXORA_BRIDGE_RESULT",channel:channel,requestId:m.requestId,ok:false,error:error && error.message ? error.message : "Apps Script error"}, PARENT_ORIGIN);
    })
    .crmBridge(m.action, m.idToken, m.payload || {});
});
</script></body></html>`;
  return HtmlService.createHtmlOutput(bridgeHtml).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Called only through the hidden bridge. Every action verifies the Firebase ID token and CRM role.
function crmBridge(action, idToken, payload) {
  payload = payload || {};
  switch (action) {
    case "getAppData": return getAppData(String(idToken || ""));
    case "getCustomers": return getCustomers(String(idToken || ""));
    case "getPOSData": return getPOSData(String(idToken || ""));
    case "saveService": return saveService(String(idToken || ""), payload.service || payload);
    case "createSale": return createSale(String(idToken || ""), payload);
    case "saveCustomer": return saveCustomer(String(idToken || ""), payload.customer || payload);
    case "deleteCustomer": return deleteCustomer(String(idToken || ""), payload.customerId);
    case "createStaffAccount": return createStaffAccount(String(idToken || ""), payload);
    case "getSubscriptions": return getSubscriptions(String(idToken || ""));
    case "saveSubscription": return saveSubscription(String(idToken || ""), payload.subscription || payload);
    case "importVpnSubscription": return importVpnSubscription(String(idToken || ""), payload);
    case "getExpenses": return getExpenses(String(idToken || ""));
    case "saveExpense": return saveExpense(String(idToken || ""), payload.expense || payload);
    case "getFinanceData": return getFinanceData(String(idToken || ""), payload);
    case "getTeam": return getTeam(String(idToken || ""));
    case "setUserStatus": return setUserStatus(String(idToken || ""), payload);
    case "createWorkbookBackup": return createWorkbookBackup(String(idToken || ""));
    default: throw new Error("Unknown CRM action.");
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const expected = PropertiesService.getScriptProperties().getProperty("CRM_BRIDGE_SECRET");
    if (!expected || !body.secret || !constantTimeEqual_(String(body.secret), String(expected))) {
      return jsonOutput_({ok:false,error:"Unauthorized API request."});
    }
    const token = String(body.idToken || "");
    const payload = body.payload || {};
    let data;
    switch (body.action) {
      case "getAppData": data = getAppData(token); break;
      case "getCustomers": data = getCustomers(token); break;
      case "getPOSData": data = getPOSData(token); break;
      case "saveService": data = saveService(token, payload.service || payload); break;
      case "createSale": data = createSale(token, payload); break;
      case "saveCustomer": data = saveCustomer(token, payload.customer || payload); break;
      case "deleteCustomer": data = deleteCustomer(token, payload.customerId); break;
      case "createStaffAccount": data = createStaffAccount(token, payload); break;
      case "getSubscriptions": data = getSubscriptions(token); break;
      case "saveSubscription": data = saveSubscription(token, payload.subscription || payload); break;
      case "importVpnSubscription": data = importVpnSubscription(token, payload); break;
      case "getExpenses": data = getExpenses(token); break;
      case "saveExpense": data = saveExpense(token, payload.expense || payload); break;
      case "getFinanceData": data = getFinanceData(token, payload); break;
      case "getTeam": data = getTeam(token); break;
      case "setUserStatus": data = setUserStatus(token, payload); break;
      case "createWorkbookBackup": data = createWorkbookBackup(token); break;
      default: throw new Error("Unknown CRM action.");
    }
    return jsonOutput_({ok:true,data:data === undefined ? null : data});
  } catch (error) {
    return jsonOutput_({ok:false,error:error && error.message ? error.message : "CRM API error."});
  }
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function constantTimeEqual_(a,b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i=0;i<a.length;i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function bootstrapVexoraAdmins() {
  const ss = SpreadsheetApp.openById(CRM.spreadsheetId);
  Object.keys(CRM.headers).forEach(name => ensureSheet_(ss, name, CRM.headers[name]));
  const sheet = ss.getSheetByName("Users");
  const data = sheet.getDataRange().getValues();
  const header = data[0];
  const col = Object.fromEntries(header.map((h,i)=>[h,i]));
  const now = new Date().toISOString();
  Object.entries(CRM.admins).forEach(([email,name]) => {
    const index = data.findIndex((row,i)=>i>0 && String(row[col.email]).toLowerCase()===email);
    if (index > 0) {
      const rowNum = index + 1;
      sheet.getRange(rowNum,col.name+1).setValue(name);
      sheet.getRange(rowNum,col.role+1).setValue("SUPER_ADMIN");
      if (!sheet.getRange(rowNum,col.status+1).getValue()) sheet.getRange(rowNum,col.status+1).setValue("PENDING_VERIFICATION");
      sheet.getRange(rowNum,col.updated_at+1).setValue(now);
    } else {
      sheet.appendRow([Utilities.getUuid(),"",name,email,"SUPER_ADMIN","PENDING_VERIFICATION",now,now]);
    }
  });
  return "CEO account registry is ready.";
}

function getAppData(idToken) {
  const identity = verifyFirebaseToken_(idToken);
  if (!identity.emailVerified) throw new Error("Verify your email address before accessing Vexora CRM.");
  const user = findUser_(identity.email);
  if (!user || user.status === "DISABLED") throw new Error("This account is not authorized for Vexora CRM.");
  if (user.auth_uid && user.auth_uid !== identity.localId) throw new Error("Account identity mismatch. Contact a Super Admin.");
  if (user.status === "PENDING_VERIFICATION") throw new Error("Verify your email address before accessing Vexora CRM.");
  if (!["SUPER_ADMIN","ADMIN","MANAGER","SALES","ACCOUNTANT","STAFF"].includes(user.role)) throw new Error("This account has no valid CRM role.");
  updateUserIdentity_(user.row, identity.localId);
  const ss = SpreadsheetApp.openById(CRM.spreadsheetId);
  return {
    user: { uid: identity.localId, email: identity.email, name: user.name, role: user.role },
    stats: {
      customers: countRows_(ss,"Customers"), products: countRows_(ss,"Products"),
      invoices: countRows_(ss,"Invoices"), payments: countRows_(ss,"Payments"),
      expenses: countRows_(ss,"Expenses"), subscriptions: countRows_(ss,"Subscriptions")
    }
  };
}

function getCustomers(idToken) {
  requireRole_(idToken, ["SUPER_ADMIN","ADMIN","MANAGER","SALES"]);
  const sheet = SpreadsheetApp.openById(CRM.spreadsheetId).getSheetByName("Customers");
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.filter(r=>r[0]).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
}

function saveCustomer(idToken, customer) {
  const actor = requireRole_(idToken, ["SUPER_ADMIN","ADMIN","MANAGER","SALES"]);
  if (!customer || !String(customer.name || "").trim()) throw new Error("Customer name is required.");
  const sheet = SpreadsheetApp.openById(CRM.spreadsheetId).getSheetByName("Customers");
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const col = Object.fromEntries(headers.map((h,i)=>[h,i]));
  const now = new Date().toISOString();
  const id = customer.customer_id || Utilities.getUuid();
  const existingIndex = values.findIndex((r,i)=>i>0 && r[col.customer_id]===id);
  const record = {
    customer_id:id, customer_code:customer.customer_code || "CUS-"+Utilities.getUuid().slice(0,8).toUpperCase(),
    name:String(customer.name).trim(), phone:String(customer.phone||"").trim(),
    email:String(customer.email||"").trim(), address:String(customer.address||"").trim(),
    company:String(customer.company||"").trim(), customer_type:String(customer.customer_type||"INDIVIDUAL").trim(),
    internet_provider:String(customer.internet_provider||"").trim(), internet_package:String(customer.internet_package||"").trim(),
    whatsapp:String(customer.whatsapp||"").trim(), telegram:String(customer.telegram||"").trim(), notes:String(customer.notes||"").trim(),
    status:customer.status||"ACTIVE",
    created_at:existingIndex>0?values[existingIndex][col.created_at]:now, updated_at:now
  };
  const row = headers.map(h=>record[h] ?? "");
  if (existingIndex>0) sheet.getRange(existingIndex+1,1,1,headers.length).setValues([row]);
  else sheet.appendRow(row);
  appendMonthlyRecord_("Customer_Records",new Date(),CRM.headers.Customers.concat(["snapshot_at"]),headers.map(h=>record[h]??"").concat([now]));
  appendMonthlyRecord_("Customer_Activity",new Date(),["activity_id","customer_id","activity_type","reference_id","details","created_by","created_at"],[Utilities.getUuid(),id,existingIndex>0?"CUSTOMER_UPDATED":"CUSTOMER_CREATED",id,record.name,actor.user_id,now]);
  logActivity_(actor.user_id,existingIndex>0?"UPDATE":"CREATE","Customer",id,record.name);
  return record;
}

function deleteCustomer(idToken, customerId) {
  requireRole_(idToken, ["SUPER_ADMIN","ADMIN"]);
  const sheet = SpreadsheetApp.openById(CRM.spreadsheetId).getSheetByName("Customers");
  const values = sheet.getDataRange().getValues();
  const index = values.findIndex((r,i)=>i>0 && r[0]===customerId);
  if (index<1) throw new Error("Customer not found.");
  sheet.deleteRow(index+1);
  logActivity_(findUser_(verifyFirebaseToken_(idToken).email).user_id,"DELETE","Customer",customerId,"Customer deleted");
  return true;
}


function getPOSData(idToken) {
  requireRole_(idToken, ["SUPER_ADMIN","ADMIN","MANAGER","SALES","ACCOUNTANT"]);
  const ss = SpreadsheetApp.openById(CRM.spreadsheetId);
  const read = name => {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return [];
    const values = sh.getDataRange().getValues(), headers = values.shift();
    return values.filter(r => r[0]).map(r => Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
  };
  return { services: read("Products").filter(p => String(p.status).toUpperCase() !== "ARCHIVED"),
    customers: read("Customers").filter(c => String(c.status).toUpperCase() !== "INACTIVE"),
    invoices: read("Invoices").slice(-12).reverse(),
    payments: read("Payments").slice(-12).reverse() };
}

function saveService(idToken, service) {
  const actor = requireRole_(idToken, ["SUPER_ADMIN","ADMIN","MANAGER"]);
  if (!service || !String(service.name || "").trim()) throw new Error("Service name is required.");
  const price = Number(service.selling_price);
  const cost = Number(service.cost_price || 0);
  if (!Number.isFinite(price) || price < 0 || !Number.isFinite(cost) || cost < 0) throw new Error("Enter valid LKR prices.");
  const sheet = SpreadsheetApp.openById(CRM.spreadsheetId).getSheetByName("Products");
  const values = sheet.getDataRange().getValues(), headers = values[0], col = Object.fromEntries(headers.map((h,i)=>[h,i]));
  const id = String(service.product_id || Utilities.getUuid());
  const existing = values.findIndex((r,i)=>i>0 && String(r[col.product_id])===id);
  const now = new Date().toISOString();
  const record = {product_id:id,product_code:String(service.product_code || "SRV-"+Utilities.getUuid().slice(0,8).toUpperCase()),
    name:String(service.name).trim(),category:String(service.category || "Digital Service").trim(),
    description:String(service.description || "").trim(),cost_price:cost,selling_price:price,
    status:String(service.status || "ACTIVE").toUpperCase(),created_at:existing>0?values[existing][col.created_at]:now,updated_at:now};
  const row = headers.map(h=>record[h] ?? "");
  if(existing>0) sheet.getRange(existing+1,1,1,headers.length).setValues([row]); else sheet.appendRow(row);
  logActivity_(actor.user_id, existing>0?"UPDATE":"CREATE","Service",id,record.name);
  return record;
}

function createSale(idToken, payload) {
  const actor = requireRole_(idToken, ["SUPER_ADMIN","ADMIN","MANAGER","SALES"]);
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) throw new Error("Add at least one service to the sale.");
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.openById(CRM.spreadsheetId);
    const products = ss.getSheetByName("Products"), invoices = ss.getSheetByName("Invoices");
    const invoiceItems = ss.getSheetByName("Invoice_Items"), payments = ss.getSheetByName("Payments");
    const pv = products.getDataRange().getValues(), ph = pv[0], pc = Object.fromEntries(ph.map((h,i)=>[h,i]));
    let subtotal = 0;
    const lines = items.map(item => {
      const row = pv.find((r,i)=>i>0 && String(r[pc.product_id])===String(item.product_id));
      if (!row || String(row[pc.status]).toUpperCase()!=="ACTIVE") throw new Error("A selected service is unavailable.");
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000) throw new Error("Invalid service quantity.");
      const unit = Number(row[pc.selling_price]);
      const lineTotal = Math.round(unit * quantity * 100) / 100;
      subtotal += lineTotal;
      return {product_id:row[pc.product_id],description:row[pc.name],quantity,unit_price:unit,discount:0,line_total:lineTotal};
    });
    const discount = Number(payload.discount || 0), tax = Number(payload.tax || 0);
    if (!Number.isFinite(discount) || discount<0 || discount>subtotal || !Number.isFinite(tax) || tax<0) throw new Error("Invalid discount or tax.");
    const total = Math.round((subtotal-discount+tax)*100)/100;
    const paid = Number(payload.paid_amount || 0);
    if (!Number.isFinite(paid) || paid<0 || paid>total) throw new Error("Payment must be between Rs. 0 and the invoice total.");
    const customerId = String(payload.customer_id || "");
    if (customerId) {
      const cv=ss.getSheetByName("Customers").getDataRange().getValues();
      if (!cv.slice(1).some(r=>String(r[0])===customerId)) throw new Error("Selected customer was not found.");
    }
    const now = new Date().toISOString(), invoiceId=Utilities.getUuid();
    const invoiceNumber="VX-"+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyyMMdd")+"-"+Utilities.getUuid().slice(0,5).toUpperCase();
    const balance=Math.round((total-paid)*100)/100;
    const status=balance<=0?"PAID":paid>0?"PARTIAL":"UNPAID";
    invoices.appendRow([invoiceId,invoiceNumber,customerId,now.slice(0,10),now.slice(0,10),subtotal,discount,tax,total,paid,balance,status,now,now]);
    appendMonthlyRecord_("Sales", new Date(), ["invoice_id","invoice_number","customer_id","invoice_date","subtotal","discount","tax","total","paid_amount","balance","status","created_by"], [invoiceId,invoiceNumber,customerId,now.slice(0,10),subtotal,discount,tax,total,paid,balance,status,actor.user_id]);
    lines.forEach(line=>invoiceItems.appendRow([Utilities.getUuid(),invoiceId,line.product_id,line.description,line.quantity,line.unit_price,line.discount,line.line_total]));
    if(paid>0) payments.appendRow([Utilities.getUuid(),invoiceId,customerId,paid,String(payload.payment_method||"CASH").toUpperCase(),String(payload.reference||""),now.slice(0,10),"COMPLETED",now]);
    logActivity_(actor.user_id,"CREATE","Invoice",invoiceId,invoiceNumber+" / LKR "+total);
    return {invoice_id:invoiceId,invoice_number:invoiceNumber,subtotal,discount,tax,total,paid_amount:paid,balance,status,items:lines};
  } finally { lock.releaseLock(); }
}

function createStaffAccount(idToken, payload) {
  const actor = requireRole_(idToken, ["SUPER_ADMIN"]);
  const email = String(payload.email||"").trim().toLowerCase();
  const name = String(payload.name||"").trim();
  const password = String(payload.password||"");
  const role = String(payload.role||"STAFF").toUpperCase();
  const allowed = ["ADMIN","MANAGER","SALES","ACCOUNTANT","STAFF"];
  if (!email || !email.includes("@") || !name) throw new Error("Valid email and staff name are required.");
  if (password.length<12) throw new Error("Use a temporary password of at least 12 characters.");
  if (!allowed.includes(role)) throw new Error("Invalid staff role.");
  const lock=LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const usersSheet = SpreadsheetApp.openById(CRM.spreadsheetId).getSheetByName("Users");
    const users = usersSheet.getDataRange().getValues();
    const userHeaders = users[0], userCols = Object.fromEntries(userHeaders.map((h,i)=>[h,i]));
    if (users.slice(1).some(r => String(r[userCols.email]).toLowerCase() === email)) throw new Error("An account with this email already exists.");
    if (role === "ADMIN" && users.slice(1).some(r => String(r[userCols.role]).toUpperCase() === "ADMIN" && String(r[userCols.status]).toUpperCase() !== "DISABLED")) throw new Error("Only one active Admin account is allowed. Disable the current Admin before creating another.");
    const apiKey = getFirebaseApiKey_();
    const response = UrlFetchApp.fetch("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key="+encodeURIComponent(apiKey), {
      method:"post",contentType:"application/json",muteHttpExceptions:true,
      payload:JSON.stringify({email,password,returnSecureToken:true,displayName:name})
    });
    const result = JSON.parse(response.getContentText()||"{}");
    if (response.getResponseCode()!==200 || result.error || !result.localId) throw new Error((result.error&&result.error.message)||"Could not create Firebase account.");
    const now = new Date().toISOString();
    usersSheet.appendRow([Utilities.getUuid(),result.localId,name,email,role,"PENDING_VERIFICATION",now,now]);
    const verify = UrlFetchApp.fetch("https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key="+encodeURIComponent(apiKey), {
      method:"post",contentType:"application/json",muteHttpExceptions:true,
      payload:JSON.stringify({requestType:"VERIFY_EMAIL",idToken:result.idToken})
    });
    const verifyResult = JSON.parse(verify.getContentText()||"{}");
    if (verify.getResponseCode()!==200 || verifyResult.error) throw new Error("Account created, but verification email could not be sent. Use Firebase Console to send a verification email.");
    logActivity_(actor.user_id,"CREATE","User",result.localId,email+" ("+role+")");
    return {uid:result.localId,email,role,status:"PENDING_VERIFICATION"};
  } finally {
    lock.releaseLock();
  }
}

function requireRole_(idToken, roles) {
  const identity = verifyFirebaseToken_(idToken);
  if (!identity.emailVerified) throw new Error("Email verification is required.");
  const user = findUser_(identity.email);
  if (!user || user.status==="DISABLED" || (user.auth_uid && user.auth_uid!==identity.localId)) throw new Error("Account is not authorized.");
  updateUserIdentity_(user.row,identity.localId);
  if (!roles.includes(user.role)) throw new Error("You do not have permission to perform this action.");
  return user;
}

function verifyFirebaseToken_(idToken) {
  if (!idToken) throw new Error("Missing Firebase sign-in token.");
  const apiKey = getFirebaseApiKey_();
  const response = UrlFetchApp.fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key="+encodeURIComponent(apiKey), {
    method:"post",contentType:"application/json",muteHttpExceptions:true,payload:JSON.stringify({idToken})
  });
  const result = JSON.parse(response.getContentText()||"{}");
  if (response.getResponseCode()!==200 || !result.users || !result.users.length) throw new Error("Your login session is invalid. Sign in again.");
  const u = result.users[0];
  if (!u.localId || !u.email) throw new Error("Firebase identity is incomplete.");
  return {localId:u.localId,email:String(u.email).toLowerCase(),emailVerified:!!u.emailVerified};
}
function getFirebaseApiKey_() {
  const key = PropertiesService.getScriptProperties().getProperty("FIREBASE_WEB_API_KEY");
  if (!key) throw new Error("Set FIREBASE_WEB_API_KEY in Apps Script Project Settings > Script Properties.");
  return key;
}
function findUser_(email) {
  const sheet = SpreadsheetApp.openById(CRM.spreadsheetId).getSheetByName("Users");
  const values = sheet.getDataRange().getValues(), headers=values[0], col=Object.fromEntries(headers.map((h,i)=>[h,i]));
  const index=values.findIndex((r,i)=>i>0&&String(r[col.email]).toLowerCase()===String(email).toLowerCase());
  if(index<1)return null;
  const row=values[index];
  return {row:index+1,user_id:row[col.user_id],auth_uid:row[col.auth_uid],name:row[col.name],email:row[col.email],role:row[col.role],status:row[col.status]};
}
function updateUserIdentity_(row,uid) {
  const sheet=SpreadsheetApp.openById(CRM.spreadsheetId).getSheetByName("Users");
  const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0],col=Object.fromEntries(headers.map((h,i)=>[h,i]));
  const current=sheet.getRange(row,col.auth_uid+1).getValue();
  if(current&&current!==uid)throw new Error("This email is linked to a different Firebase account.");
  sheet.getRange(row,col.auth_uid+1).setValue(uid);
  sheet.getRange(row,col.status+1).setValue("ACTIVE");
  sheet.getRange(row,col.updated_at+1).setValue(new Date().toISOString());
}
function ensureSheet_(ss,name,headers) {
  let sheet=ss.getSheetByName(name);if(!sheet)sheet=ss.insertSheet(name);
  if(sheet.getLastRow()===0){sheet.getRange(1,1,1,headers.length).setValues([headers]);sheet.setFrozenRows(1);return sheet;}
  const current=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const missing=headers.filter(h=>!current.includes(h));
  if(missing.length){sheet.getRange(1,current.length+1,1,missing.length).setValues([missing]);sheet.setFrozenRows(1);}
  return sheet;
}
function countRows_(ss,name){const sheet=ss.getSheetByName(name);return sheet?Math.max(0,sheet.getLastRow()-1):0;}
function logActivity_(userId,action,entity,entityId,details) {
  SpreadsheetApp.openById(CRM.spreadsheetId).getSheetByName("Activity_Logs")
    .appendRow([Utilities.getUuid(),userId,action,entity,entityId,details,new Date().toISOString()]);
}


// ================= VEXORA CLOUD CONTROL CENTER MODULES =================
function ensureAllCrmSheets_() {
  const ss=SpreadsheetApp.openById(CRM.spreadsheetId);
  Object.keys(CRM.headers).forEach(name=>ensureSheet_(ss,name,CRM.headers[name]));
  return ss;
}
function appendMonthlyRecord_(prefix,date,headers,row) {
  const ss=SpreadsheetApp.openById(CRM.spreadsheetId);
  const month=Utilities.formatDate(date,Session.getScriptTimeZone(),"yyyy_MM");
  const sh=ensureSheet_(ss,prefix+"_"+month,headers);
  sh.appendRow(row);
  return sh.getName();
}
function getSubscriptions(idToken) {
  requireRole_(idToken,["SUPER_ADMIN","ADMIN","MANAGER","SALES"]);
  const ss=ensureAllCrmSheets_(), sh=ss.getSheetByName("Subscriptions");
  const vals=sh.getDataRange().getValues(), headers=vals.shift();
  return vals.filter(r=>r[0]).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
}
function saveSubscription(idToken,sub) {
  const actor=requireRole_(idToken,["SUPER_ADMIN","ADMIN","MANAGER","SALES"]);
  if(!sub||!sub.customer_id) throw new Error("Select a customer for this subscription.");
  const ss=ensureAllCrmSheets_(), sh=ss.getSheetByName("Subscriptions");
  const customers=ss.getSheetByName("Customers").getDataRange().getValues();
  if(!customers.slice(1).some(r=>String(r[0])===String(sub.customer_id))) throw new Error("Customer not found.");
  const values=sh.getDataRange().getValues(), headers=values[0], col=Object.fromEntries(headers.map((h,i)=>[h,i]));
  const id=String(sub.subscription_id||Utilities.getUuid()), index=values.findIndex((r,i)=>i>0&&String(r[col.subscription_id])===id);
  const now=new Date().toISOString(), expiry=String(sub.expiry_date||"");
  const record={subscription_id:id,customer_id:String(sub.customer_id),product_id:String(sub.product_id||""),plan:String(sub.plan||"VPN").trim(),
    internet_package:String(sub.internet_package||"").trim(),data_limit:String(sub.data_limit||"").trim(),data_unit:String(sub.data_unit||"GB").trim(),
    usage_link:String(sub.usage_link||"").trim(),order_id:String(sub.order_id||"").trim(),
    start_date:String(sub.start_date||now.slice(0,10)),expiry_date:expiry,price:Number(sub.price||0),
    status:String(sub.status||"ACTIVE").toUpperCase(),notes:String(sub.notes||"").trim(),
    created_at:index>0?values[index][col.created_at]:now,updated_at:now};
  if(!Number.isFinite(record.price)||record.price<0) throw new Error("Enter a valid subscription price.");
  if(record.usage_link && !/^https:\/\//i.test(record.usage_link)) throw new Error("Usage link must start with https://.");
  const row=headers.map(h=>record[h]??"");
  if(index>0) sh.getRange(index+1,1,1,headers.length).setValues([row]); else sh.appendRow(row);
  appendMonthlyRecord_("Customer_Activity",new Date(),["activity_id","customer_id","activity_type","reference_id","details","created_by","created_at"],
    [Utilities.getUuid(),record.customer_id,index>0?"SUBSCRIPTION_UPDATED":"SUBSCRIPTION_CREATED",id,record.plan+" / "+record.data_limit+" "+record.data_unit,actor.user_id,now]);
  logActivity_(actor.user_id,index>0?"UPDATE":"CREATE","Subscription",id,record.plan+" "+record.order_id);
  return record;
}
function importVpnSubscription(idToken,payload) {
  const actor=requireRole_(idToken,["SUPER_ADMIN","ADMIN","MANAGER","SALES"]);
  const raw=String(payload.text||payload.raw||"").trim();
  if(!raw) throw new Error("Paste the VPN subscription details first.");
  const get=(label)=>{const re=new RegExp("^\\s*(?:"+label+")\\s*:\\s*(.*?)\\s*$","im");const m=raw.match(re);return m?m[1].trim():"";};
  const orderRaw=get("Order"), orderMatch=orderRaw.match(/^([^—-]+)\s*[—-]\s*(.+)$/);
  const order=orderMatch?orderMatch[1].trim():orderRaw, customer=get("Customer|Name")||(orderMatch?orderMatch[2].trim():"");
  const internetPackage=get("Internet package|Package"), plan=get("VPN Plan")||"VPN "+(get("Data")||"subscription"), data=get("Data"), expires=get("Expires"), link=get("Usage link");
  if(!order||!plan||!expires||!link) throw new Error("Required fields: Order, Package, Expires and Usage link.");
  const email=get("Email"), phone=get("Phone");
  const dataMatch=data.match(/([0-9]+(?:\\.[0-9]+)?)\\s*(GB|MB|TB)?/i);
  const limit=dataMatch?dataMatch[1]:data, unit=dataMatch?(dataMatch[2]||"GB").toUpperCase():"GB";
  const ss=ensureAllCrmSheets_(), sh=ss.getSheetByName("Subscriptions"), rows=sh.getDataRange().getValues();
  const h=rows[0], c=Object.fromEntries(h.map((x,i)=>[x,i]));
  if(rows.slice(1).some(r=>String(r[c.order_id]).toLowerCase()===order.toLowerCase())) throw new Error("This Order ID already exists. Duplicate import blocked.");
  let customerRow=null, customerId="";
  if(phone) customerRow=ss.getSheetByName("Customers").getDataRange().getValues().slice(1).find(r=>String(r[3]).replace(/\\D/g,"")===phone.replace(/\\D/g,""));
  if(!customerRow&&email) customerRow=ss.getSheetByName("Customers").getDataRange().getValues().slice(1).find(r=>String(r[4]).toLowerCase()===email.toLowerCase());
  if(!customerRow&&customer) customerRow=ss.getSheetByName("Customers").getDataRange().getValues().slice(1).find(r=>String(r[2]).toLowerCase()===customer.toLowerCase());
  if(customerRow) customerId=String(customerRow[0]);
  else {
    if(!customer) throw new Error("Customer not found. Add a Customer/Name field or create the customer first.");
    const now=new Date().toISOString(); customerId=Utilities.getUuid();
    ss.getSheetByName("Customers").appendRow(CRM.headers.Customers.map((h)=>({customer_id:customerId,customer_code:"CUS-"+Utilities.getUuid().slice(0,8).toUpperCase(),name:customer,phone,email,notes:"Imported from VPN order",status:"ACTIVE",created_at:now,updated_at:now}[h]||"")));
  }
  const record=saveSubscriptionInternal_(ss,{subscription_id:Utilities.getUuid(),customer_id:customerId,plan,data_limit:limit,data_unit:unit,
    internet_package:internetPackage,usage_link:link,order_id:order,expiry_date:expires,start_date:new Date().toISOString().slice(0,10),status:"ACTIVE",notes:"Imported from VPN creation details."},actor.user_id);
  return {subscription:record,customer_id:customerId,customer_name:customer||"Existing customer"};
}
function saveSubscriptionInternal_(ss,sub,userId) {
  const sh=ss.getSheetByName("Subscriptions"), values=sh.getDataRange().getValues(), headers=values[0], col=Object.fromEntries(headers.map((h,i)=>[h,i]));
  const now=new Date().toISOString(), id=sub.subscription_id||Utilities.getUuid();
  const record={subscription_id:id,customer_id:sub.customer_id,product_id:sub.product_id||"",plan:sub.plan||"VPN",internet_package:sub.internet_package||"",
    data_limit:sub.data_limit||"",data_unit:sub.data_unit||"GB",usage_link:sub.usage_link||"",order_id:sub.order_id||"",
    start_date:sub.start_date||now.slice(0,10),expiry_date:sub.expiry_date||"",price:Number(sub.price||0),status:sub.status||"ACTIVE",
    notes:sub.notes||"",created_at:now,updated_at:now};
  sh.appendRow(headers.map(h=>record[h]??""));
  appendMonthlyRecord_("Customer_Activity",new Date(),["activity_id","customer_id","activity_type","reference_id","details","created_by","created_at"],
    [Utilities.getUuid(),record.customer_id,"VPN_IMPORTED",id,record.order_id+" / "+record.data_limit+" "+record.data_unit,userId,now]);
  logActivity_(userId,"IMPORT","VPN Subscription",id,record.order_id);
  return record;
}
function getExpenses(idToken) {
  requireRole_(idToken,["SUPER_ADMIN","ADMIN","MANAGER","ACCOUNTANT"]);
  const ss=ensureAllCrmSheets_(), sh=ss.getSheetByName("Expenses"), vals=sh.getDataRange().getValues(), headers=vals.shift();
  return vals.filter(r=>r[0]).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]]))).reverse();
}
function saveExpense(idToken,expense) {
  const actor=requireRole_(idToken,["SUPER_ADMIN","ADMIN","MANAGER","ACCOUNTANT"]);
  const amount=Number(expense.amount), date=String(expense.expense_date||new Date().toISOString().slice(0,10));
  if(!String(expense.category||"").trim()||!Number.isFinite(amount)||amount<=0) throw new Error("Enter an expense category and a positive amount.");
  const ss=ensureAllCrmSheets_(), sh=ss.getSheetByName("Expenses"), id=Utilities.getUuid(), now=new Date().toISOString();
  const record={expense_id:id,category:String(expense.category).trim(),description:String(expense.description||"").trim(),amount,
    payment_method:String(expense.payment_method||"CASH").toUpperCase(),expense_date:date,reference:String(expense.reference||"").trim(),
    vendor:String(expense.vendor||"").trim(),receipt_url:String(expense.receipt_url||"").trim(),created_at:now};
  sh.appendRow(CRM.headers.Expenses.map(h=>record[h]??""));
  appendMonthlyRecord_("Expenses",new Date(date+"T12:00:00"),["expense_id","category","description","amount","payment_method","expense_date","reference","vendor","receipt_url","created_by","created_at"],
    [id,record.category,record.description,amount,record.payment_method,date,record.reference,record.vendor,record.receipt_url,actor.user_id,now]);
  logActivity_(actor.user_id,"CREATE","Expense",id,record.category+" / LKR "+amount);
  return record;
}
function getFinanceData(idToken,payload) {
  requireRole_(idToken,["SUPER_ADMIN","ADMIN","MANAGER","ACCOUNTANT"]);
  const ss=ensureAllCrmSheets_(), month=String(payload.month||Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM"));
  const [year,mm]=month.split("-"), prefix=year+"_"+mm;
  const read=(name)=>{const sh=ss.getSheetByName(name);if(!sh||sh.getLastRow()<2)return [];const v=sh.getDataRange().getValues(),h=v.shift();return v.filter(r=>r[0]).map(r=>Object.fromEntries(h.map((x,i)=>[x,r[i]])));};
  const invoices=read("Invoices").filter(x=>String(x.invoice_date||"").slice(0,7)===month);
  const expenses=read("Expenses").filter(x=>String(x.expense_date||"").slice(0,7)===month);
  const revenue=invoices.reduce((n,x)=>n+Number(x.total||0),0), paid=invoices.reduce((n,x)=>n+Number(x.paid_amount||0),0);
  const expenseTotal=expenses.reduce((n,x)=>n+Number(x.amount||0),0);
  return {month,revenue,paid,expenses:expenseTotal,net:revenue-expenseTotal,receivables:invoices.reduce((n,x)=>n+Number(x.balance||0),0),invoiceCount:invoices.length,expenseCount:expenses.length,invoices,expenseItems:expenses};
}
function getTeam(idToken) {
  requireRole_(idToken,["SUPER_ADMIN"]);
  const sh=ensureAllCrmSheets_().getSheetByName("Users"), v=sh.getDataRange().getValues(), h=v.shift();
  return v.filter(r=>r[0]).map(r=>{const o=Object.fromEntries(h.map((x,i)=>[x,r[i]]));delete o.auth_uid;return o;});
}
function setUserStatus(idToken,payload) {
  const actor=requireRole_(idToken,["SUPER_ADMIN"]);
  const email=String(payload.email||"").toLowerCase(), status=String(payload.status||"").toUpperCase();
  if(!email||!["ACTIVE","DISABLED"].includes(status)) throw new Error("Invalid team account update.");
  if(Object.keys(CRM.admins).some(x=>x===email)) throw new Error("CEO accounts cannot be disabled from this screen.");
  const sh=ensureAllCrmSheets_().getSheetByName("Users"),v=sh.getDataRange().getValues(),h=v[0],c=Object.fromEntries(h.map((x,i)=>[x,i]));
  const idx=v.findIndex((r,i)=>i>0&&String(r[c.email]).toLowerCase()===email);
  if(idx<1) throw new Error("Team member not found.");
  if(String(v[idx][c.role]).toUpperCase()==="ADMIN"&&status==="DISABLED") { /* one Admin slot becomes available */ }
  sh.getRange(idx+1,c.status+1).setValue(status);sh.getRange(idx+1,c.updated_at+1).setValue(new Date().toISOString());
  logActivity_(actor.user_id,"UPDATE","User",v[idx][c.user_id],email+" -> "+status);
  return {email,status};
}

function createWorkbookBackup(idToken) {
  const actor=requireRole_(idToken,["SUPER_ADMIN"]);
  const ss=ensureAllCrmSheets_();
  const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyyMMdd_HHmmss")+"_"+Utilities.getUuid().slice(0,4);
  const sourceSheets=ss.getSheets().filter(sh=>!/^BKP_/.test(sh.getName()));
  const created=[];
  sourceSheets.forEach(source=>{
    const copy=source.copyTo(ss);
    const safe=source.getName().replace(/[^A-Za-z0-9_]/g,"_").slice(0,35);
    copy.setName(("BKP_"+stamp+"_"+safe).slice(0,99));
    created.push(copy.getName());
  });
  logActivity_(actor.user_id,"BACKUP","Workbook",stamp,"Created "+created.length+" sheet snapshots.");
  return {backup_id:stamp,sheets:created.length,names:created};
}
