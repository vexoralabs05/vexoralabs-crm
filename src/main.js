import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { auth, authReady } from "./firebase.js";
import { API_BASE_URL } from "./config.js";

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
async function api(action, payload = {}) {
  if (!currentUser) throw new Error("Please sign in again.");
  const idToken = await currentUser.getIdToken();
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, idToken, payload })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "CRM API request failed.");
  return result.data;
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
async function loadCustomers() {
  customers = await api("getCustomers");
  $("customers").replaceChildren();
  if (!customers.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="5" class="empty-state">No customers yet. Add your first customer.</td>';
    $("customers").append(tr);
    return;
  }
  for (const c of customers) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><strong>${escapeHtml(c.name)}</strong><small>${escapeHtml(c.customer_code)}</small></td>
      <td>${escapeHtml(c.phone)}</td><td>${escapeHtml(c.email)}</td><td>${escapeHtml(c.company)}</td>
      <td class="actions"><button class="secondary-button compact" data-edit="${escapeHtml(c.customer_id)}">Edit</button>
      <button class="danger-button compact" data-delete="${escapeHtml(c.customer_id)}">Delete</button></td>`;
    $("customers").append(tr);
  }
}
async function loadWorkspace() {
  const data = await api("getAppData");
  $("authCard").hidden = true;
  $("dashboard").hidden = false;
  $("userBar").hidden = false;
  $("who").textContent = data.user.name;
  $("welcome").textContent = `Welcome, ${data.user.name}`;
  $("userEmail").textContent = data.user.email;
  $("role").textContent = data.user.role;
  const labels = { customers: "Customers", products: "Products", invoices: "Invoices", payments: "Payments", expenses: "Expenses", subscriptions: "Subscriptions" };
  $("stats").innerHTML = Object.entries(data.stats).map(([key, value]) =>
    `<article class="stat-card"><span>${labels[key] || key}</span><strong>${Number(value) || 0}</strong></article>`
  ).join("");
  $("staffCard").hidden = data.user.role !== "SUPER_ADMIN";
  await loadCustomers();
}
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
$("registerCeo").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || password.length < 12 || password !== $("confirmPassword").value) {
    return showMessage("message", "Enter your approved email and matching passwords (12+ characters).");
  }
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(credential.user);
    await signOut(auth);
    showMessage("message", "Verification email sent. Verify your email, then sign in.", true);
  } catch (error) { showMessage("message", friendlyError(error)); }
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
    try { await loadWorkspace(); }
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
