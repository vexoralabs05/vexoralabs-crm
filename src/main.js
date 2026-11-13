import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { auth, authReady } from "./firebase.js";
import { APPS_SCRIPT_URL } from "./config.js";

const $ = (id) => document.getElementById(id);
let currentUser = null;
let customers = [];
let services = [];
let saleCustomers = [];
let cart = [];
let recentInvoices = [];

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
const money = value => "Rs. " + Number(value || 0).toLocaleString("en-LK",{minimumFractionDigits:2,maximumFractionDigits:2});
async function loadPOSData(){
  const data=await api("getPOSData");
  services=data.services||[]; saleCustomers=data.customers||[]; recentInvoices=data.invoices||[];
  renderServices(); renderPOSProducts(); renderCart(); renderSales();
  $("saleCustomer").innerHTML='<option value="">Walk-in / no customer</option>'+saleCustomers.map(c=>'<option value="'+escapeHtml(c.customer_id)+'">'+escapeHtml(c.name)+' · '+escapeHtml(c.phone||"")+'</option>').join("");
}
function renderServices(){
  $("serviceList").innerHTML=services.length?services.map(s=>'<article class="service-row"><div><strong>'+escapeHtml(s.name)+'</strong><small>'+escapeHtml(s.category)+' · '+escapeHtml(s.product_code)+'</small><p>'+escapeHtml(s.description||"")+'</p></div><div class="service-price">'+money(s.selling_price)+'<small>'+escapeHtml(s.status)+'</small></div><button class="secondary-button compact" data-service-edit="'+escapeHtml(s.product_id)+'">Edit</button></article>').join(""):'<p class="empty-state">No services added yet. Add your first service plan.</p>';
}
function renderPOSProducts(){
  const q=($("posSearch").value||"").toLowerCase().trim();
  const found=services.filter(s=>String(s.status).toUpperCase()==="ACTIVE"&&[s.name,s.category,s.product_code,s.description].some(v=>String(v||"").toLowerCase().includes(q)));
  $("posProducts").innerHTML=found.length?found.map(s=>'<button class="pos-product" data-add-service="'+escapeHtml(s.product_id)+'"><span class="pos-product-icon">◇</span><strong>'+escapeHtml(s.name)+'</strong><small>'+escapeHtml(s.category)+'</small><b>'+money(s.selling_price)+'</b></button>').join(""):'<p class="empty-state">No active services found. Add a service first.</p>';
}
function renderCart(){
  $("cartItems").innerHTML=cart.length?cart.map((item,index)=>'<div class="cart-line"><div><strong>'+escapeHtml(item.name)+'</strong><small>'+money(item.price)+' each</small></div><div class="cart-qty"><button data-qty="'+index+'" data-step="-1">−</button><span>'+item.quantity+'</span><button data-qty="'+index+'" data-step="1">+</button><button class="remove-line" data-remove="'+index+'">×</button></div></div>').join(""):'<p class="empty-state">Select a service to start a sale.</p>';
  const subtotal=cart.reduce((sum,item)=>sum+item.price*item.quantity,0), discount=Math.max(0,Number($("saleDiscount").value)||0), total=Math.max(0,subtotal-discount);
  $("saleSubtotal").textContent=money(subtotal); $("saleTotal").textContent=money(total); $("salePayment").max=total;
}
function renderSales(){
  $("salesRows").innerHTML=recentInvoices.length?recentInvoices.map(x=>'<tr><td><strong>'+escapeHtml(x.invoice_number)+'</strong></td><td>'+escapeHtml(String(x.invoice_date||"").slice(0,10))+'</td><td>'+money(x.total)+'</td><td>'+money(x.paid_amount)+'</td><td>'+money(x.balance)+'</td><td><span class="role-badge">'+escapeHtml(x.status)+'</span></td></tr>').join(""):'<tr><td colspan="6" class="empty-state">No invoices recorded yet.</td></tr>';
}

async function loadWorkspace() {
  const data = await api("getAppData");
  document.querySelector(".app-shell").classList.add("dashboard-mode");
  $("authCard").hidden = true;
  $("dashboard").hidden = false;
  $("userBar").hidden = false;
  $("who").textContent = data.user.name;
  $("welcome").textContent = `Welcome back, ${data.user.name}`;
  $("userEmail").textContent = data.user.email;
  $("role").textContent = data.user.role.replaceAll("_"," ");
  $("teamNav").hidden = data.user.role !== "SUPER_ADMIN";
  const canSell=["SUPER_ADMIN","ADMIN","MANAGER","SALES"].includes(data.user.role);
  $("posNav").hidden=!canSell; $("servicesNav").hidden=!["SUPER_ADMIN","ADMIN","MANAGER"].includes(data.user.role);
  $("salesNav").hidden=!canSell;
  const canViewCustomers = ["SUPER_ADMIN","ADMIN","MANAGER","SALES"].includes(data.user.role);
  $("customersNav").hidden = !canViewCustomers;
  const labels = {customers:["Customers","♙"],products:["Products","▣"],invoices:["Invoices","▤"],payments:["Payments","↗"],expenses:["Expenses","◈"],subscriptions:["Subscriptions","∞"]};
  $("stats").innerHTML = Object.entries(data.stats).map(([key,value])=>{const item=labels[key]||[key,"•"];return `<article class="stat-card"><div class="stat-top"><span>${item[0]}</span><span class="stat-icon">${item[1]}</span></div><strong>${Number(value)||0}</strong></article>`;}).join("");
  if (canSell) await loadPOSData();
  if (canViewCustomers) {
    await loadCustomers();
  } else {
    $("customerCount").textContent = "Customer access is restricted for your role.";
    $("overviewCustomerRows").innerHTML = '<tr><td colspan="4" class="empty-state">Customer data is restricted for your role.</td></tr>';
  }
}
function showView(viewId) {
  document.querySelectorAll(".view-panel").forEach(panel=>panel.hidden=panel.id!==viewId);
  document.querySelectorAll(".nav-item").forEach(item=>item.classList.toggle("active",item.dataset.view===viewId));
  const labels={overview:["Overview","Dashboard"],posView:["New sale","Point of Sale"],servicesView:["Services","Service catalogue"],salesView:["Sales & invoices","Sales & invoices"],customersView:["Customers","Customers"],teamView:["Team access","Team access"]};
  const item=labels[viewId]||labels.overview;$("pageName").textContent=item[0];$("pageTitle").textContent=item[1];
}
document.querySelectorAll(".nav-item").forEach(item=>item.addEventListener("click",()=>showView(item.dataset.view)));
$("overviewCustomers").addEventListener("click",()=>showView("customersView"));
$("customerSearch").addEventListener("input",renderCustomerRows);
$("posSearch").addEventListener("input",renderPOSProducts);
$("saleDiscount").addEventListener("input",renderCart);
$("posProducts").addEventListener("click",event=>{const id=event.target.closest("[data-add-service]")?.dataset.addService;if(!id)return;const s=services.find(x=>x.product_id===id);if(!s)return;const existing=cart.find(x=>x.product_id===id);if(existing)existing.quantity++;else cart.push({product_id:id,name:s.name,price:Number(s.selling_price),quantity:1});renderCart();});
$("cartItems").addEventListener("click",event=>{const q=event.target.closest("[data-qty]");const r=event.target.closest("[data-remove]");if(q){const item=cart[Number(q.dataset.qty)];item.quantity+=Number(q.dataset.step);if(item.quantity<=0)cart=cart.filter(x=>x!==item);renderCart();}if(r){cart.splice(Number(r.dataset.remove),1);renderCart();}});
$("completeSale").addEventListener("click",async()=>{if(!cart.length)return showMessage("saleMessage","Add a service before completing the sale.");const subtotal=cart.reduce((s,x)=>s+x.price*x.quantity,0),discount=Number($("saleDiscount").value)||0,total=Math.max(0,subtotal-discount),paid=Number($("salePayment").value)||0;if(discount>subtotal||paid>total||paid<0)return showMessage("saleMessage","Check discount and payment amounts.");$("completeSale").disabled=true;try{const result=await api("createSale",{customer_id:$("saleCustomer").value,items:cart.map(x=>({product_id:x.product_id,quantity:x.quantity})),discount,paid_amount:paid,payment_method:$("saleMethod").value,reference:$("saleReference").value.trim()});showMessage("saleMessage","Invoice "+result.invoice_number+" created. Total "+money(result.total)+". Balance "+money(result.balance)+".",true);cart=[];$("saleDiscount").value="0";$("salePayment").value="0";$("saleReference").value="";await loadPOSData();showView("salesView");}catch(e){showMessage("saleMessage",e.message);}finally{$("completeSale").disabled=false;}});
$("addService").addEventListener("click",()=>{$("serviceForm").reset();$("serviceId").value="";$("serviceForm").hidden=false;});
$("cancelService").addEventListener("click",()=>{$("serviceForm").reset();$("serviceForm").hidden=true;});
$("serviceList").addEventListener("click",event=>{const id=event.target.closest("[data-service-edit]")?.dataset.serviceEdit;if(!id)return;const s=services.find(x=>x.product_id===id);if(!s)return;$("serviceId").value=s.product_id;$("serviceName").value=s.name;$("serviceCategory").value=s.category;$("servicePrice").value=s.selling_price;$("serviceCost").value=s.cost_price||0;$("serviceDescription").value=s.description||"";$("serviceForm").hidden=false;});
$("serviceForm").addEventListener("submit",async event=>{event.preventDefault();try{await api("saveService",{product_id:$("serviceId").value,name:$("serviceName").value.trim(),category:$("serviceCategory").value,selling_price:Number($("servicePrice").value),cost_price:Number($("serviceCost").value||0),description:$("serviceDescription").value.trim()});$("serviceForm").hidden=true;showMessage("serviceMessage","Service saved successfully.",true);await loadPOSData();}catch(e){showMessage("serviceMessage",e.message);}});
$("refreshSales").addEventListener("click",()=>loadPOSData().catch(e=>showMessage("saleMessage",e.message)));
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
      document.querySelector(".app-shell").classList.remove("dashboard-mode");
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
