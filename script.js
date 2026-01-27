import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

/* 1. CONFIG FIREBASE */
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

/* 2. CONFIG GOOGLE SHEET (IMPORTANT) */
// Remplace ce lien par ton lien "Publier sur le web" au format CSV !
const SHEET_CSV_URL = "TON_LIEN_CSV_ICI"; 

/* 3. ELEMENTS DOM */
const loginBox = document.getElementById("loginBox");
const adminDashboard = document.getElementById("adminDashboard");
const errorMsg = document.getElementById("error");

/* 4. LOGIN / LOGOUT */
window.login = async function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  errorMsg.innerText = "Connexion...";
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);
    errorMsg.innerText = "❌ Erreur login.";
  }
};

window.logout = function() {
  signOut(auth);
};

/* 5. NAVIGATION */
window.showSection = function(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("active");
};

/* 6. AUTH LISTENER */
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBox.classList.add("hidden");
    adminDashboard.classList.remove("hidden");
    window.showSection('home');
  } else {
    loginBox.classList.remove("hidden");
    adminDashboard.classList.add("hidden");
  }
});

/* 7. FONCTION MAGIQUE : IMPORT CSV SHEET */
window.toggleCompta = function(mode) {
  const frame = document.getElementById("sheetFrame");
  const table = document.getElementById("nativeTableContainer");
  
  if(mode === 'iframe') {
    frame.classList.remove("hidden");
    table.classList.add("hidden");
  }
};

window.loadSheetData = async function() {
  const tableContainer = document.getElementById("nativeTableContainer");
  const sheetFrame = document.getElementById("sheetFrame");
  const table = document.getElementById("sheetTable");

  // Switch vue
  sheetFrame.classList.add("hidden");
  tableContainer.classList.remove("hidden");
  table.innerHTML = "<tr><td>Chargement des données...</td></tr>";

  try {
    const response = await fetch(SHEET_CSV_URL);
    const data = await response.text();

    // Parsing CSV manuel (simple)
    const rows = data.split("\n").map(row => row.split(","));
    
    // NETTOYAGE : Selon ton image, les vrais headers sont vers la ligne 8
    // On va chercher la ligne qui contient "Nom du salarié"
    let startIndex = rows.findIndex(r => r[0] && r[0].includes("Nom du salarié"));
    if (startIndex === -1) startIndex = 0; // Sécurité

    const cleanRows = rows.slice(startIndex); // On garde à partir des headers
    
    // Génération HTML
    let html = "<thead><tr>";
    
    // En-têtes (Ligne 1 du tableau nettoyé)
    cleanRows[0].forEach(cell => {
      // Enlève les guillemets bizarres du CSV
      const cleanCell = cell.replace(/["\r]/g, ""); 
      if(cleanCell) html += `<th>${cleanCell}</th>`;
    });
    html += "</tr></thead><tbody>";

    // Données (Lignes suivantes)
    for (let i = 1; i < cleanRows.length; i++) {
      const row = cleanRows[i];
      // On affiche la ligne seulement si la colonne A (Nom) n'est pas vide
      if (row[0] && row[0].trim() !== "") {
        html += "<tr>";
        row.forEach(cell => {
          const cleanCell = cell.replace(/["\r]/g, "");
          if(cleanCell !== undefined) html += `<td>${cleanCell}</td>`;
        });
        html += "</tr>";
      }
    }
    html += "</tbody>";
    
    table.innerHTML = html;

  } catch (error) {
    console.error(error);
    table.innerHTML = "<tr><td style='color:red'>Erreur : Vérifie que le lien CSV est bon et publié sur le web.</td></tr>";
  }
};
