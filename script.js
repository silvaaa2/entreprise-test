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
   2. TON LIEN CSV OFFICIEL
   C'est le lien que tu viens de m'envoyer. Il est parfait.
   =========================================================== */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRkyHGb-HA5J6neWRkD5OEq7NWW71D3f1LqSs2-ulwYHYk9GY1ph6m2R0wDWKKOZvdAsSumqdlHQ_5v/pub?output=csv";

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
  table.innerHTML = "<tr><td style='padding:20px; text-align:center;'>📡 Récupération des données...</td></tr>";

  try {
    const response = await fetch(SHEET_CSV_URL);
    
    if (!response.ok) {
        throw new Error("Erreur réseau (Code " + response.status + ")");
    }

    const data = await response.text();
    
    // Vérification de sécurité (au cas où)
    if(data.trim().startsWith("<!DOCTYPE html>")) {
        throw new Error("⚠️ Lien incorrect (Format HTML détecté).");
    }

    const rows = data.split("\n").map(row => row.split(","));
    
    // --- RECHERCHE INTELLIGENTE DU DEBUT DU TABLEAU ---
    // On scanne les lignes pour trouver où commence ton tableau (Ligne 8 environ)
    let headerIndex = -1;
    for(let i=0; i < rows.length; i++) {
        const lineStr = JSON.stringify(rows[i]).toLowerCase();
        // On cherche des mots clés présents dans tes colonnes
        if(lineStr.includes("nom du") || lineStr.includes("grade") || lineStr.includes("facture")) {
            headerIndex = i;
            break;
        }
    }

    // Si on ne trouve pas automatiquement, on prend la ligne 7 par sécurité
    if (headerIndex === -1) headerIndex = 7;

    // On garde uniquement les lignes à partir de l'en-tête
    const cleanRows = rows.slice(headerIndex); 

    // --- CONSTRUCTION DU TABLEAU HTML ---
    let html = "<thead><tr>";
    
    // 1. En-têtes (Header)
    cleanRows[0].forEach(cell => {
      const cleanCell = cell.replace(/^"|"$/g, '').trim(); 
      if(cleanCell) html += `<th>${cleanCell}</th>`;
    });
    html += "</tr></thead><tbody>";

    // 2. Données (Body)
    for (let i = 1; i < cleanRows.length; i++) {
      const row = cleanRows[i];
      // On affiche la ligne seulement si la colonne A (Nom) contient quelque chose
      if (row[0] && row[0].replace(/^"|"$/g, '').trim().length > 0) {
        html += "<tr>";
        // On remplit les cellules
        for(let j=0; j < cleanRows[0].length; j++) {
            // Si la colonne a un titre, on affiche la cellule correspondante
            if(cleanRows[0][j].replace(/^"|"$/g, '').trim()) {
                let cellData = row[j] ? row[j].replace(/^"|"$/g, '') : "";
                html += `<td>${cellData}</td>`;
            }
        }
        html += "</tr>";
      }
    }
    html += "</tbody>";
    
    table.innerHTML = html;

  } catch (error) {
    console.error("Problème import:", error);
    table.innerHTML = `<tr><td style='color:#ff4f4f; text-align:center; padding:20px;'>
      ❌ <b>Erreur :</b> ${error.message}
    </td></tr>`;
  }
};
