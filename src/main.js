import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { auth, authReady } from "./firebase.js";
import { APPS_SCRIPT_URL } from "./config.js";

const $ = (id) => document.getElementById(id);
let currentUser = null;
let customers = [];

function showMessage(id, text, success = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text || "";
  el.dataset.type = success ? "success" : "error";
}
function friendlyError(error) {
  const known = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/popup-blocked": "Your browser blocked the sign-in popup.",
    "auth/unauthorized-domain": "Add this website domain to Firebase Authorized domains.",
    "auth/network-request-failed": "Network error. Check your connection."
  };
  return known[error.code] || error.message || "Something went wrong.";
}
const bridgeFrame = $("crmBridge");
let bridgeReady = false;
let bridgeWaiters = [];
const bridgeRequests = new Map();
let requestCounter = 0;

const bridgeChannel = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(36).slice(2));
window.addEventListener("message", event => {
  // Apps Script may return messages from an opaque sandbox origin.
  // A per-page random channel authenticates this bridge session.
  const message = event.data || {};
  if (!message || message.channel !== bridgeChannel) return;
  if (message.type === "VEXORA_BRIDGE_READY") {
    bridgeReady = true;
    bridgeWaiters.splice(0).forEach(resolve => resolve());
    return;
  }
  if (message.type === "VEXORA_BRIDGE_RESULT" && bridgeRequests.has(message.requestId)) {
    const pending = bridgeRequests.get(message.requestId);
    bridgeRequests.delete(message.requestId);
    clearTimeout(pending.timer);
    if (message.ok) pending.resolve(message.data);
    else pending.reject(new Error(message.error || "Google Apps Script request failed."));
  }
});
bridgeFrame.addEventListener("load", () => {
  bridgeFrame.contentWindow.postMessage({ type: "VEXORA_BRIDGE_INIT", channel: bridgeChannel }, "*");
});
if (APPS_SCRIPT_URL) bridgeFrame.src = APPS_SCRIPT_URL;
function waitForBridge() {
  if (bridgeReady) return Promise.resolve();
  if (!APPS_SCRIPT_URL) return Promise.reject(new Error("Google Apps Script Web App URL is not configured in src/config.js."));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Cannot connect to Google Apps Script. Check the deployed /exec URL and Web App access settings.")), 20000);
    bridgeWaiters.push(() => { clearTimeout(timer); resolve(); });
  });
}
async function api(action, payload = {}) {
  if (!currentUser) throw new Error("Please sign in again.");
  await waitForBridge();
  const idToken = await currentUser.getIdToken();
  const requestId = "req-" + (++requestCounter);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      bridgeRequests.delete(requestId);
      reject(new Error("Google Apps Script did not respond. Check its deployment and execution permissions."));
    }, 30000);
    bridgeRequests.set(requestId, { resolve, reject, timer });
    bridgeFrame.contentWindow.postMessage({ type: "VEXORA_BRIDGE_REQUEST", channel: bridgeChannel, requestId, action, idToken, payload }, "*");
  });
}
function setBusy(busy) {
  $("emailSignIn").disabled = busy;
  $("emailSignIn").textContent = busy ? "Signing in…" : "Sign in";
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}
function renderCustomerRows() {
  const query = ($("customerSearch")?.value || "").trim().toLowerCase();
  const filtered = customers.filter(c => [c.name,c.phone,c.email,c.company,c.customer_code].some(v => String(v || "").toLowerCase().includes(query)));
  $("customerCount").textContent = `${filtered.length} of ${customers.length} customer records`;
  $("customers").replaceChildren(); $("overviewCustomerRows").replaceChildren();
  if (!filtered.length) {
    $("customers").innerHTML = `<tr><td colspan="5" class="empty-state">${customers.length ? "No customers match your search." : "No customers yet. Add your first customer."}</td></tr>`;
    $("overviewCustomerRows").innerHTML = '<tr><td colspan="4" class="empty-state">No customer records yet.</td></tr>';
    return;
  }
  filtered.forEach((c,index) => {
    const tr=document.createElement("tr");
    tr.innerHTML=`<td><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.customer_code)}</small></td><td>${escapeHtml(c.phone)}</td><td>${escapeHtml(c.email)}</td><td>${escapeHtml(c.company)}</td><td class="actions"><button class="secondary-button compact" data-edit="${escapeHtml(c.customer_id)}">Edit</button> <button class="danger-button compact" data-delete="${escapeHtml(c.customer_id)}">Delete</button></td>`;
    $("customers").append(tr);
    if(index<5){const preview=document.createElement("tr");preview.innerHTML=`<td><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.customer_code)}</small></td><td>${escapeHtml(c.phone)}</td><td>${escapeHtml(c.email)}</td><td>${escapeHtml(c.company)}</td>`;$("overviewCustomerRows").append(preview);}
  });
}
async function loadCustomers(){customers=await api("getCustomers");renderCustomerRows();}
async function loadWorkspace() {
  const data = await api("getAppData");
  $("authCard").hidden = true;
  $("dashboard").hidden = false;
  $("userBar").hidden = false;
  $("who").textContent = data.user.name;
  $("welcome").textContent = `Welcome back, ${data.user.name}`;
  $("userEmail").textContent = data.user.email;
  $("role").textContent = data.user.role.replaceAll("_"," ");
  $("teamNav").hidden = data.user.role !== "SUPER_ADMIN";
  const labels = {customers:["Customers","♙"],products:["Products","▣"],invoices:["Invoices","▤"],payments:["Payments","↗"],expenses:["Expenses","◈"],subscriptions:["Subscriptions","∞"]};
  $("stats").innerHTML = Object.entries(data.stats).map(([key,value])=>{const item=labels[key]||[key,"•"];return `<article class="stat-card"><div class="stat-top"><span>${item[0]}</span><span class="stat-icon">${item[1]}</span></div><strong>${Number(value)||0}</strong></article>`;}).join("");
  await loadCustomers();
}
function showView(viewId) {
  document.querySelectorAll(".view-panel").forEach(panel=>panel.hidden=panel.id!==viewId);
  document.querySelectorAll(".nav-item").forEach(item=>item.classList.toggle("active",item.dataset.view===viewId));
  const labels={overview:["Overview","Dashboard"],customersView:["Customers","Customers"],teamView:["Team access","Team access"]};
  const item=labels[viewId]||labels.overview;$("pageName").textContent=item[0];$("pageTitle").textContent=item[1];
}
document.querySelectorAll(".nav-item").forEach(item=>item.addEventListener("click",()=>showView(item.dataset.view)));
$("overviewCustomers").addEventListener("click",()=>showView("customersView"));
$("customerSearch").addEventListener("input",renderCustomerRows);
$("dashYear").textContent=new Date().getFullYear();

function resetCustomerForm() {
  $("customerForm").reset();
  $("customerId").value = "";
  $("customerForm").hidden = true;
}

$("year").textContent = new Date().getFullYear();

window.addEventListener("error", event => showMessage("message", "Application error: " + (event.message || "Unable to load CRM script.")));
window.addEventListener("unhandledrejection", event => showMessage("message", "Initialization error: " + (event.reason?.message || String(event.reason || "Unknown error"))));

$("emailForm").addEventListener("submit", async event => {
  event.preventDefault(); setBusy(true); showMessage("message", "");
  try { await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value); }
  catch (error) { showMessage("message", friendlyError(error)); }
  finally { setBusy(false); }
});
$("resetPassword").addEventListener("click", async () => {
  const email = $("email").value.trim();
  if (!email) return showMessage("message", "Enter your email address first.");
  try { await sendPasswordResetEmail(auth, email); showMessage("message", "Password reset email sent.", true); }
  catch (error) { showMessage("message", friendlyError(error)); }
});

$("logout").addEventListener("click", () => signOut(auth));
$("refresh").addEventListener("click", () => loadWorkspace().catch(e => showMessage("customerMsg", e.message)));
$("newCustomer").addEventListener("click", () => {
  $("customerForm").reset(); $("customerId").value = ""; $("customerForm").hidden = false;
});
$("cancelCustomer").addEventListener("click", resetCustomerForm);
$("customerForm").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await api("saveCustomer", {
      customer_id: $("customerId").value,
      name: $("customerName").value.trim(),
      phone: $("customerPhone").value.trim(),
      email: $("customerEmail").value.trim(),
      company: $("customerCompany").value.trim(),
      address: $("customerAddress").value.trim(),
      notes: $("customerNotes").value.trim()
    });
    resetCustomerForm(); showMessage("customerMsg", "Customer saved successfully.", true); await loadCustomers();
  } catch (error) { showMessage("customerMsg", error.message); }
});
$("customers").addEventListener("click", async event => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  if (editId) {
    const c = customers.find(item => item.customer_id === editId);
    if (!c) return;
    $("customerId").value = c.customer_id;
    $("customerName").value = c.name || "";
    $("customerPhone").value = c.phone || "";
    $("customerEmail").value = c.email || "";
    $("customerCompany").value = c.company || "";
    $("customerAddress").value = c.address || "";
    $("customerNotes").value = c.notes || "";
    $("customerForm").hidden = false;
  }
  if (deleteId && confirm("Delete this customer record?")) {
    try { await api("deleteCustomer", { customerId: deleteId }); await loadCustomers(); showMessage("customerMsg", "Customer deleted.", true); }
    catch (error) { showMessage("customerMsg", error.message); }
  }
});
$("staffForm").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const result = await api("createStaffAccount", {
      name: $("staffName").value.trim(), email: $("staffEmail").value.trim(),
      password: $("staffPassword").value, role: $("staffRole").value
    });
    showMessage("staffMsg", `Account created for ${result.email}. Verification email sent.`, true);
    $("staffForm").reset();
  } catch (error) { showMessage("staffMsg", error.message); }
});

function startAuthListener() {
  onAuthStateChanged(auth, async user => {
    currentUser = user;
    if (!user) {
      $("authCard").hidden = false; $("dashboard").hidden = true; $("userBar").hidden = true;
      $("password").value = "";
      return;
    }
    try { await loadWorkspace(); showView('overview'); }
    catch (error) {
      $("authCard").hidden = false; $("dashboard").hidden = true;
      showMessage("message", "Signed in, but CRM data could not load: " + error.message);
    }
  }, error => showMessage("message", friendlyError(error)));
}

authReady.then(startAuthListener).catch(error => {
  showMessage("message", "Firebase initialization failed: " + friendlyError(error));
  startAuthListener();
});
