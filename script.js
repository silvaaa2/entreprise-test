import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

/* ===== FIREBASE CONFIG ===== */
const firebaseConfig = {
  apiKey: "AIzaSyA5Ec_JPneE1Pwx53MmCwUDrgw0vfeFfDo",
  authDomain: "entreprise-test-admin.firebaseapp.com",
  projectId: "entreprise-test-admin",
  storageBucket: "entreprise-test-admin.appspot.com",
  messagingSenderId: "785617328418",
  appId: "1:785617328418:web:2edc96ea5062bede2e2d7b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* ===== NAVIGATION ===== */
window.showSection = function (id) {
  document.querySelectorAll(".section")
    .forEach(s => s.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
};

/* ===== LOGOUT ===== */
window.logout = function () {
  signOut(auth);
};

/* ===== AUTH STATE ===== */
onAuthStateChanged(auth, user => {
  if (!user) {
    loginBox.classList.remove("hidden");
    adminDashboard.classList.add("hidden");
    return;
  }

  if (![...ADMINS, ...MANAGERS].includes(user.email)) {
    alert("Accès refusé");
    signOut(auth);
    return;
  }

  loginBox.classList.add("hidden");
  adminDashboard.classList.remove("hidden");
});
