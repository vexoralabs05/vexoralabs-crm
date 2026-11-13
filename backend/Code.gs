const CRM = {
  spreadsheetId: "1nI6y0nrws_ZOonbHvlr4JJfHFE-r4UoIyPlE1kHJuuI",
  projectId: "vexora-labs-crm-798fe",
  admins: {
    "shenolperera5@gmail.com": "Shenol",
    "thenulvidusitha10@gmail.com": "Thenul"
  },
  headers: {
    Users: ["user_id","auth_uid","name","email","role","status","created_at","updated_at"],
    Customers: ["customer_id","customer_code","name","phone","email","address","company","notes","status","created_at","updated_at"],
    Products: ["product_id","product_code","name","category","description","cost_price","selling_price","status","created_at","updated_at"],
    Invoices: ["invoice_id","invoice_number","customer_id","invoice_date","due_date","subtotal","discount","tax","total","paid_amount","balance","status","created_at","updated_at"],
    Invoice_Items: ["item_id","invoice_id","product_id","description","quantity","unit_price","discount","line_total"],
    Payments: ["payment_id","invoice_id","customer_id","amount","payment_method","reference","payment_date","status","created_at"],
    Expenses: ["expense_id","category","description","amount","payment_method","expense_date","reference","created_at"],
    Subscriptions: ["subscription_id","customer_id","product_id","plan","start_date","expiry_date","price","status","notes","created_at","updated_at"],
    Activity_Logs: ["log_id","user_id","action","entity","entity_id","details","timestamp"],
    Settings: ["setting_id","setting_name","setting_value","description","updated_at"],
    Sync_Logs: ["sync_id","operation","entity","record_id","sync_status","error_message","timestamp"]
  }
};

// GitHub Pages hosts the UI. Apps Script is JSON API only.
function doGet() {
  return jsonOutput_({ok:true,service:"Vexora Labs CRM API",message:"POST requests only."});
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
      case "saveCustomer": data = saveCustomer(token, payload.customer || payload); break;
      case "deleteCustomer": data = deleteCustomer(token, payload.customerId); break;
      case "createStaffAccount": data = createStaffAccount(token, payload); break;
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
    company:String(customer.company||"").trim(), notes:String(customer.notes||"").trim(),
    status:customer.status||"ACTIVE",
    created_at:existingIndex>0?values[existingIndex][col.created_at]:now, updated_at:now
  };
  const row = headers.map(h=>record[h] ?? "");
  if (existingIndex>0) sheet.getRange(existingIndex+1,1,1,headers.length).setValues([row]);
  else sheet.appendRow(row);
  logActivity_(actor.user_id,"SAVE","Customer",id,record.name);
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
  const apiKey = getFirebaseApiKey_();
  const response = UrlFetchApp.fetch("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key="+encodeURIComponent(apiKey), {
    method:"post",contentType:"application/json",muteHttpExceptions:true,
    payload:JSON.stringify({email,password,returnSecureToken:true,displayName:name})
  });
  const result = JSON.parse(response.getContentText()||"{}");
  if (result.error) throw new Error(result.error.message||"Could not create Firebase account.");
  const now = new Date().toISOString();
  SpreadsheetApp.openById(CRM.spreadsheetId).getSheetByName("Users")
    .appendRow([Utilities.getUuid(),result.localId,name,email,role,"PENDING_VERIFICATION",now,now]);
  const verify = UrlFetchApp.fetch("https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key="+encodeURIComponent(apiKey), {
    method:"post",contentType:"application/json",muteHttpExceptions:true,
    payload:JSON.stringify({requestType:"VERIFY_EMAIL",idToken:result.idToken})
  });
  const verifyResult = JSON.parse(verify.getContentText()||"{}");
  if (verify.getResponseCode()!==200 || verifyResult.error) throw new Error("Staff account created, but verification email could not be sent. Ask the staff member to use password reset or contact an administrator.");
  logActivity_(actor.user_id,"CREATE","User",result.localId,email+" ("+role+")");
  return {uid:result.localId,email,role,status:"PENDING_VERIFICATION"};
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
  if(sheet.getLastRow()===0){sheet.getRange(1,1,1,headers.length).setValues([headers]);sheet.setFrozenRows(1);}
  else{const current=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];if(headers.some((h,i)=>current[i]!==h))throw new Error("Header mismatch in "+name+". No data changed.");}
}
function countRows_(ss,name){const sheet=ss.getSheetByName(name);return sheet?Math.max(0,sheet.getLastRow()-1):0;}
function logActivity_(userId,action,entity,entityId,details) {
  SpreadsheetApp.openById(CRM.spreadsheetId).getSheetByName("Activity_Logs")
    .appendRow([Utilities.getUuid(),userId,action,entity,entityId,details,new Date().toISOString()]);
}
