import {
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { auth, googleProvider, authReady } from "./firebase.js";

const $ = (id) => document.getElementById(id);
const message = $("message");
const googleButton = $("googleSignIn");
const emailButton = $("emailSignIn");
const emailForm = $("emailForm");
const sessionPanel = $("sessionPanel");

function showMessage(text, type = "error") {
  message.textContent = text;
  message.dataset.type = type;
}

function friendlyError(error) {
  const known = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-disabled": "This account has been disabled. Contact an administrator.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/popup-closed-by-user": "The Google sign-in window was closed before completion.",
    "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups and try again.",
    "auth/unauthorized-domain": "This website domain is not authorized in Firebase Authentication settings.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase."
  };
  return known[error.code] || "Sign-in failed. Check your details and try again.";
}

function setBusy(busy) {
  googleButton.disabled = busy;
  emailButton.disabled = busy;
  googleButton.textContent = busy ? "Connecting…" : "Continue with Google";
  emailButton.textContent = busy ? "Signing in…" : "Sign in";
}

await authReady;

googleButton.addEventListener("click", async () => {
  setBusy(true);
  showMessage("");
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    showMessage(friendlyError(error));
  } finally {
    setBusy(false);
  }
});

emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setBusy(true);
  showMessage("");
  try {
    await signInWithEmailAndPassword(
      auth,
      $("email").value.trim(),
      $("password").value
    );
  } catch (error) {
    showMessage(friendlyError(error));
  } finally {
    setBusy(false);
  }
});

$("resetPassword").addEventListener("click", async () => {
  const email = $("email").value.trim();
  if (!email) {
    showMessage("Enter your email address first.");
    $("email").focus();
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showMessage("Password reset email sent. Check your inbox.", "success");
  } catch (error) {
    showMessage(friendlyError(error));
  }
});

$("signOut").addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    $("sessionEmail").textContent = user.email || "Signed-in account";
    sessionPanel.hidden = false;
    googleButton.hidden = true;
    emailForm.hidden = true;
    $("resetPassword").hidden = true;
    document.querySelector(".separator").hidden = true;
    showMessage("Signed in successfully. Role authorization is still pending.", "success");
  } else {
    sessionPanel.hidden = true;
    googleButton.hidden = false;
    emailForm.hidden = false;
    $("resetPassword").hidden = false;
    document.querySelector(".separator").hidden = false;
    $("password").value = "";
  }
});

$("year").textContent = new Date().getFullYear();