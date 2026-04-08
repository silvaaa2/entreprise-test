import { auth, googleProvider } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

async function login() {
  const emailInput = document.getElementById("email")?.value;
  const passwordInput = document.getElementById("password")?.value;
  const errorMsg = document.getElementById("error");

  try {
    await signInWithEmailAndPassword(auth, emailInput, passwordInput);
  } catch (e) {
    if (errorMsg) {
      errorMsg.innerText = "❌ Erreur de connexion";
      errorMsg.style.color = "var(--error)";
    }
  }
}

async function loginWithGoogle() {
  const errorMsg = document.getElementById("error");

  try {
    await signInWithPopup(auth, googleProvider);
  } catch (e) {
    if (errorMsg) {
      errorMsg.innerText = "❌ Erreur Google";
      errorMsg.style.color = "var(--error)";
    }
  }
}

async function resetPassword() {
  const emailInput = document.getElementById("email")?.value;
  const errorMsg = document.getElementById("error");

  if (!emailInput) {
    if (errorMsg) {
      errorMsg.innerText = "⚠️ Tape ton email d'abord, puis clique ici !";
      errorMsg.style.color = "var(--warning)";
    }
    return;
  }

  try {
    await sendPasswordResetEmail(auth, emailInput);
    if (errorMsg) {
      errorMsg.innerText = "✅ Lien envoyé ! Vérifie tes spams.";
      errorMsg.style.color = "var(--success)";
    }
  } catch (e) {
    if (errorMsg) {
      errorMsg.innerText = "❌ Email introuvable ou erreur.";
      errorMsg.style.color = "var(--error)";
    }
  }
}

async function logout() {
  await signOut(auth);
  window.location.reload();
}

function initAuthListener() {
  onAuthStateChanged(auth, (user) => {
    const loginBox = document.getElementById("loginBox");
    const adminDashboard = document.getElementById("adminDashboard");

    if (user) {
      if (loginBox) loginBox.classList.add("hidden");
      if (adminDashboard) adminDashboard.classList.remove("hidden");
    } else {
      if (loginBox) loginBox.classList.remove("hidden");
      if (adminDashboard) adminDashboard.classList.add("hidden");
    }
  });
}

export { login, loginWithGoogle, resetPassword, logout, initAuthListener };
