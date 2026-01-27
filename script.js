import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

/* 1. CONFIG FIREBASE (Touche pas à ça) */
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
   2. LE LIEN (Celui que tu m'as donné, il est bon !)
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
   7. IMPORTATION DES DONNÉES (VERSION DEBUG)
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
    console.log("Fetching URL:", SHEET_CSV_URL); // Pour le debug
    const response = await fetch(SHEET_CSV_URL);
    
    // VERIF 1 : Est-ce que le lien répond ?
    if (!response.ok) {
        throw new Error(`Erreur réseau (Code ${response.status})`);
    }

    // VERIF 2 : Est-ce qu'on reçoit bien du TEXTE (CSV) et pas une page HTML (Erreur 404) ?
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        throw new Error("⚠️ ERREUR CRITIQUE : Le site reçoit une page web au lieu des données. <br>Si tu vois ça sur Vercel, c'est que la mise à jour du code n'est pas passée. Pense à faire 'git push' !");
    }

    const data = await response.text();
    
    // Découpage
    const rows = data.split("\n").map(row => row.split(","));
    
    // RECHERCHE INTELLIGENTE DU DEBUT DU TABLEAU
    // On cherche la ligne qui contient exactement "Nom du salarié" (ton tableau commence là)
    let headerIndex = -1;
    for(let i=0; i < rows.length; i++) {
        const lineStr = JSON.stringify(rows[i]).toLowerCase();
        // On cherche tes colonnes spécifiques
        if(lineStr.includes("nom du") && (lineStr.includes("grade") || lineStr.includes("run"))) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) {
       // Si on ne trouve pas, on affiche les 5 premières lignes dans la console pour comprendre
       console.log("Premières lignes reçues:", rows.slice(0, 5));
       throw new Error("Impossible de trouver la ligne 'Nom du salarié'. Le format du Sheet a peut-être changé ?");
    }

    const cleanRows = rows.slice(headerIndex); 

    // CONSTRUCTION DU HTML
    let html = "<thead><tr>";
    
    // Headers
    cleanRows[0].forEach(cell => {
      const cleanCell = cell.replace(/^"|"$/g, '').trim(); 
      if(cleanCell) html += `<th>${cleanCell}</th>`;
    });
    html += "</tr></thead><tbody>";

    // Données
    for (let i = 1; i < cleanRows.length; i++) {
      const row = cleanRows[i];
      // On vérifie que la ligne a des données
      if (row[0] && row[0].replace(/^"|"$/g, '').trim().length > 0) {
        html += "<tr>";
        for(let j=0; j < cleanRows[0].length; j++) {
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
      ❌ <b>Oups !</b><br>${error.message}
    </td></tr>`;
  }
};
