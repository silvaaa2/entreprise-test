import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

/* 1. CONFIGURATION FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyA5Ec_JPneE1Pwx53MmCwUDrgw0vfeFfDo",
  authDomain: "entreprise-test-admin.firebaseapp.com",
  projectId: "entreprise-test-admin",
  storageBucket: "entreprise-test-admin.appspot.com",
  messagingSenderId: "785617328418",
  appId: "1:785617328418:web:2edc96ea5062bede2e2d7b"
};

// Initialisation
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* 2. ÉLÉMENTS DU DOM */
const loginBox = document.getElementById("loginBox");
const adminDashboard = document.getElementById("adminDashboard");
const errorMsg = document.getElementById("error");

/* 3. FONCTION LOGIN (Attachée à window pour le HTML) */
window.login = async function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  errorMsg.innerText = "Chargement...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Le onAuthStateChanged fera la redirection
  } catch (error) {
    console.error(error);
    errorMsg.innerText = "Erreur : Email ou mot de passe incorrect.";
  }
};

/* 4. FONCTION LOGOUT */
window.logout = function() {
  signOut(auth).then(() => {
    console.log("Déconnecté !");
  }).catch((error) => {
    console.error("Erreur déconnexion", error);
  });
};

/* 5. NAVIGATION DASHBOARD */
window.showSection = function(id) {
  // Enlève la classe active de toutes les sections
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  // Ajoute la classe active à la section cible
  const target = document.getElementById(id);
  if (target) {
    target.classList.add("active");
  }
};

/* 6. SURVEILLANCE DE L'ÉTAT (Connecté ou Pas ?) */
onAuthStateChanged(auth, (user) => {
  if (user) {
    // === L'UTILISATEUR EST CONNECTÉ ===
    console.log("Utilisateur connecté :", user.email);
    loginBox.classList.add("hidden");        // Cache le login
    adminDashboard.classList.remove("hidden"); // Montre le dashboard
    window.showSection('home');              // Va sur l'accueil
  } else {
    // === PERSONNE N'EST CONNECTÉ ===
    console.log("Pas d'utilisateur");
    loginBox.classList.remove("hidden");     // Montre le login
    adminDashboard.classList.add("hidden");    // Cache le dashboard
    errorMsg.innerText = "";                 // Reset les erreurs
  }
});
