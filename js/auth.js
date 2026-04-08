import { auth, googleProvider } from "./firebase.js";
import { loadUserProfile } from "./user.js";

import {
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

async function login() {
  const emailInput = document.getElementById("email")?.value?.trim();
  const passwordInput = document.getElementById("password")?.value ?? "";
  const errorMsg = document.getElementById("error");

  try {
    clearErrorMessage(errorMsg);

    if (!emailInput || !passwordInput) {
      showMessage(errorMsg, "⚠️ Remplis l'email et le mot de passe.", "warning");
      return;
    }

    await signInWithEmailAndPassword(auth, emailInput, passwordInput);
  } catch (e) {
    console.error("Erreur login :", e);
    showMessage(errorMsg, getFriendlyAuthError(e), "error");
  }
}

async function loginWithGoogle() {
  const errorMsg = document.getElementById("error");

  try {
    clearErrorMessage(errorMsg);
    await signInWithPopup(auth, googleProvider);
  } catch (e) {
    console.error("Erreur login Google :", e);
    showMessage(errorMsg, getFriendlyAuthError(e), "error");
  }
}

async function resetPassword() {
  const emailInput = document.getElementById("email")?.value?.trim();
  const errorMsg = document.getElementById("error");

  try {
    clearErrorMessage(errorMsg);

    if (!emailInput) {
      showMessage(errorMsg, "⚠️ Tape ton email d'abord, puis clique ici.", "warning");
      return;
    }

    await sendPasswordResetEmail(auth, emailInput);
    showMessage(errorMsg, "✅ Lien envoyé ! Vérifie aussi tes spams.", "success");
  } catch (e) {
    console.error("Erreur reset password :", e);
    showMessage(errorMsg, getFriendlyAuthError(e), "error");
  }
}

async function logout() {
  try {
    await signOut(auth);
    window.location.reload();
  } catch (e) {
    console.error("Erreur logout :", e);
  }
}

function initAuthListener() {
  onAuthStateChanged(auth, async (user) => {
    const loginBox = document.getElementById("loginBox");
    const adminDashboard = document.getElementById("adminDashboard");
    const errorMsg = document.getElementById("error");

    try {
      if (user) {
        if (loginBox) loginBox.classList.add("hidden");
        if (adminDashboard) adminDashboard.classList.remove("hidden");

        await loadUserProfile(user);
      } else {
        if (loginBox) loginBox.classList.remove("hidden");
        if (adminDashboard) adminDashboard.classList.add("hidden");

        clearErrorMessage(errorMsg);
      }
    } catch (e) {
      console.error("Erreur onAuthStateChanged :", e);
      showMessage(errorMsg, "❌ Erreur lors du chargement du profil.", "error");
    }
  });
}

function showMessage(element, message, type = "error") {
  if (!element) return;

  element.innerText = message;

  if (type === "success") {
    element.style.color = "var(--success)";
    return;
  }

  if (type === "warning") {
    element.style.color = "var(--warning)";
    return;
  }

  element.style.color = "var(--error)";
}

function clearErrorMessage(element) {
  if (!element) return;
  element.innerText = "";
}

function getFriendlyAuthError(error) {
  const code = error?.code || "";

  switch (code) {
    case "auth/invalid-email":
      return "❌ Adresse email invalide.";
    case "auth/missing-password":
      return "❌ Mot de passe manquant.";
    case "auth/user-not-found":
      return "❌ Aucun compte trouvé avec cet email.";
    case "auth/wrong-password":
      return "❌ Mot de passe incorrect.";
    case "auth/invalid-credential":
      return "❌ Email ou mot de passe incorrect.";
    case "auth/email-already-in-use":
      return "❌ Cet email est déjà utilisé.";
    case "auth/popup-closed-by-user":
      return "⚠️ La fenêtre Google a été fermée.";
    case "auth/cancelled-popup-request":
      return "⚠️ Connexion Google annulée.";
    case "auth/network-request-failed":
      return "❌ Problème réseau. Vérifie ta connexion.";
    case "auth/too-many-requests":
      return "❌ Trop de tentatives. Réessaie plus tard.";
    default:
      return "❌ Une erreur est survenue.";
  }
}

export {
  login,
  loginWithGoogle,
  resetPassword,
  logout,
  initAuthListener
};
