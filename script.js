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

/* ===========================================================
   2. TON NOUVEAU LIEN CSV (Colle-le ici !)
   Assure-toi d'avoir sélectionné L'ONGLET SPECIFIQUE et pas "Document entier"
   =========================================================== */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRkyHGb-HA5J6neWRkD5OEq7NWW71D3f1LqSs2-ulwYHYk9GY1ph6m2R0wDWKKOZvdAsSumqdlHQ_5v/pub?gid=2002987340&single=true&output=csv";

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

/* ===========================================================
   7. IMPORTATION DES DONNÉES
   =========================================================== */

window.toggleCompta = function(mode) {
  const frame = document.getElementById("sheetFrame");
  const table = document.getElementById("nativeTableContainer");
  
  if(mode === 'iframe') {
    frame.classList.remove("hidden");
    table.classList.add("hidden");
  } else {
    window.loadSheetData();
  }
};

window.loadSheetData = async function() {
  const tableContainer = document.getElementById("nativeTableContainer");
  const sheetFrame = document.getElementById("sheetFrame");
  const table = document.getElementById("sheetTable");

  sheetFrame.classList.add("hidden");
  tableContainer.classList.remove("hidden");
  table.innerHTML = "<tr><td style='padding:20px; text-align:center;'>📡 Chargement de la Compta...</td></tr>";

  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error("Erreur lien (404/403)");

    const data = await response.text();
    
    // Vérif format
    if(data.trim().startsWith("<!DOCTYPE html>")) {
        throw new Error("⚠️ Lien incorrect : Tu as publié en 'Page Web'. Choisis 'CSV' !");
    }

    const rows = data.split("\n").map(row => row.split(","));
    
    // --- RECHERCHE INTELLIGENTE ---
    let headerIndex = -1;
    for(let i=0; i < rows.length; i++) {
        const lineStr = JSON.stringify(rows[i]).toLowerCase();
        // On cherche tes colonnes spécifiques
        if(lineStr.includes("nom du") && lineStr.includes("grade")) {
            headerIndex = i;
            break;
        }
    }

    // Si on ne trouve pas, on prend la ligne 8 (index 7) par défaut
    if (headerIndex === -1) headerIndex = 7;

    const cleanRows = rows.slice(headerIndex); 

    // --- CONSTRUCTION DU HTML ---
    let html = "<thead><tr>";
    
    // En-têtes (avec gestion des vides)
    const headers = cleanRows[0];
    headers.forEach(cell => {
      const cleanCell = cell.replace(/^"|"$/g, '').trim(); 
      // Si l'en-tête est vide (à cause de la fusion), on met un tiret ou un espace pour garder la colonne
      html += `<th>${cleanCell || "-"}</th>`;
    });
    html += "</tr></thead><tbody>";

    // Données
    for (let i = 1; i < cleanRows.length; i++) {
      const row = cleanRows[i];
      // On affiche si la case "Nom" (index 0) n'est pas vide
      if (row[0] && row[0].replace(/^"|"$/g, '').trim().length > 0) {
        html += "<tr>";
        for(let j=0; j < headers.length; j++) {
            let cellData = row[j] ? row[j].replace(/^"|"$/g, '') : "";
            // Petit fix pour l'argent : si ça contient $, on le garde
            html += `<td>${cellData}</td>`;
        }
        html += "</tr>";
      }
    }
    html += "</tbody>";
    
    table.innerHTML = html;

  } catch (error) {
    console.error("Problème import:", error);
    table.innerHTML = `<tr><td style='color:#ff4f4f; text-align:center; padding:20px;'>
      ❌ <b>Erreur :</b> ${error.message}<br>
      <i>Vérifie que tu as bien choisi l'onglet 'Copie de Compta...' dans Publier sur le web.</i>
    </td></tr>`;
  }
};
