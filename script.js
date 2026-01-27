// ===== NAVIGATION (OBLIGATOIRE POUR onclick) =====
window.showSection = function (id) {
  document.querySelectorAll('.section')
    .forEach(s => s.classList.remove('active'));

  const target = document.getElementById(id);
  if (target) target.classList.add('active');
};

// ===== FIREBASE CDN UNIQUEMENT =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// ✅ TA CONFIG (CORRECTE)
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

// ===== LOGIN =====
window.login = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .catch(err => {
      document.getElementById("loginError").innerText = err.message;
    });
};

// ===== LOGOUT =====
window.logout = function () {
  signOut(auth);
};

// ===== AUTH STATE =====
onAuthStateChanged(auth, user => {
  document.getElementById("loginBox")
    .classList.toggle("hidden", !!user);

  document.getElementById("adminDashboard")
    .classList.toggle("hidden", !user);
});
