import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
const db = getFirestore(app);

/* ==================================================================
   2. TON NOUVEAU LIEN (C'est celui que tu viens de donner)
   ================================================================== */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRkyHGb-HA5J6neWRkD5OEq7NWW71D3f1LqSs2-ulwYHYk9GY1ph6m2R0wDWKKOZvdAsSumqdlHQ_5v/pub?gid=2002987340&single=true&output=csv";

/* 3. ELEMENTS DOM */
const loginBox = document.getElementById("loginBox");
const adminDashboard = document.getElementById("adminDashboard");
const errorMsg = document.getElementById("error");

/* 4. LOGIN & NAVIGATION */
window.login = async function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if(errorMsg) errorMsg.innerText = "Connexion...";
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if(errorMsg) errorMsg.innerText = "❌ Login incorrect.";
  }
};

window.logout = function() {
  signOut(auth).then(() => window.location.reload());
};

window.showSection = function(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
  
  if(id === 'users') window.fetchUsers();
  if(id === 'compta') window.toggleCompta('data'); // Charge directement le tableau
};

/* 5. GESTION DE L'ÉTAT (Auth) */
onAuthStateChanged(auth, (user) => {
  if (user) {
    if(loginBox) loginBox.classList.add("hidden");
    if(adminDashboard) adminDashboard.classList.remove("hidden");
    window.showSection('home');
    window.fetchUsers();
  } else {
    if(loginBox) loginBox.classList.remove("hidden");
    if(adminDashboard) adminDashboard.classList.add("hidden");
  }
});

/* 6. GESTION UTILISATEURS */
window.createNewUser = async function() {
  const email = document.getElementById("newEmail").value;
  const password = document.getElementById("newPassword").value;
  const role = document.getElementById("newRole").value;
  const msg = document.getElementById("userMsg");

  if(!email || !password) { msg.innerText = "⚠️ Remplis tout !"; return; }
  msg.innerText = "Création...";
  
  try {
    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    
    await setDoc(doc(db, "users", cred.user.uid), {
      email: email, role: role, createdAt: new Date().toISOString().split('T')[0]
    });
    await signOut(secondaryAuth);
    msg.innerText = `✅ Ajouté : ${email}`;
    msg.style.color = "#00ff88";
    window.fetchUsers();
  } catch (error) {
    msg.innerText = "❌ Erreur : " + error.message;
    msg.style.color = "red";
  }
};

window.fetchUsers = async function() {
  const tbody = document.getElementById("userListBody");
  if(!tbody) return;
  tbody.innerHTML = "<tr><td colspan='3' style='text-align:center'>Chargement...</td></tr>";
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    let html = "";
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let color = data.role === 'admin' ? '#ff4f4f' : (data.role === 'rh' ? '#facc15' : '#3b82f6');
      html += `<tr><td>${data.email}</td><td><span style="color:${color};font-weight:bold">${data.role}</span></td><td>${data.createdAt || "-"}</td></tr>`;
    });
    tbody.innerHTML = html || "<tr><td colspan='3' style='text-align:center'>Aucun utilisateur.</td></tr>";
  } catch (error) {
    tbody.innerHTML = "<tr><td colspan='3' style='text-align:center; color:red'>Erreur DB</td></tr>";
  }
};

/* 7. IMPORT TABLEAU (COMPTA) */
window.toggleCompta = function(mode) {
  const frame = document.getElementById("sheetFrame");
  const table = document.getElementById("nativeTableContainer");
  const btns = document.querySelectorAll(".compta-controls button");

  if(mode === 'iframe') {
    frame.classList.remove("hidden");
    table.classList.add("hidden");
    if(btns[0]) btns[0].classList.add("action-btn");
    if(btns[1]) btns[1].classList.remove("action-btn");
  } else {
    frame.classList.add("hidden");
    table.classList.remove("hidden");
    if(btns[0]) btns[0].classList.remove("action-btn");
    if(btns[1]) btns[1].classList.add("action-btn");
    window.loadSheetData();
  }
};

window.loadSheetData = async function() {
  const table = document.getElementById("sheetTable");
  table.innerHTML = "<tr><td style='padding:20px; text-align:center;'>📡 Chargement des données...</td></tr>";

  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error("Erreur lien (Vérifie que le sheet est bien Publié)");
    
    let data = await response.text();
    
    // Si Google renvoie une page web au lieu du CSV
    if(data.trim().startsWith("<!DOCTYPE html>")) {
        throw new Error("Lien incorrect. Assure-toi d'avoir choisi 'CSV' dans 'Publier sur le web'.");
    }

    // Utilisation du parseur robuste (Gère les virgules ET les points-virgules)
    const rows = parseCSVRefined(data);

    // Recherche de la ligne de titre "Nom du salarié"
    let headerIndex = -1;
    for(let i=0; i < rows.length; i++) {
        const line = JSON.stringify(rows[i]).toLowerCase();
        
        // On cherche les mots clés de ton tableau Compta
        if(line.includes("nom du") && line.includes("grade")) {
            headerIndex = i; break;
        }
    }
    
    // Si on ne trouve pas, on prend le début (car avec ton lien 'gid', ça devrait être bon direct)
    if (headerIndex === -1) headerIndex = 0;

    const cleanRows = rows.slice(headerIndex);
    
    // CONSTRUCTION HTML
    let html = "<thead><tr>";
    // En-têtes
    cleanRows[0].forEach(cell => { 
        let text = cell.replace(/^"|"$/g, '').trim();
        html += `<th>${text || "."}</th>`; 
    });
    html += "</tr></thead><tbody>";

    // Données
    for (let i = 1; i < cleanRows.length; i++) {
        const row = cleanRows[i];
        // On affiche seulement si la colonne NOM (index 0) n'est pas vide
        if (row.length > 1 && row[0].replace(/^"|"$/g, '').trim() !== "") {
            html += "<tr>";
            for(let j=0; j < cleanRows[0].length; j++) {
                let cellData = row[j] ? row[j].replace(/^"|"$/g, '') : "";
                html += `<td>${cellData}</td>`;
            }
            html += "</tr>";
        }
    }
    html += "</tbody>";
    table.innerHTML = html;

  } catch (error) {
    console.error(error);
    table.innerHTML = `<tr><td style='color:#ff4f4f; text-align:center; padding:20px;'>
      ❌ <b>Erreur :</b> ${error.message}
    </td></tr>`;
  }
};

// --- FONCTION PARSEUR (INDISPENSABLE) ---
function parseCSVRefined(str) {
    const arr = [];
    let quote = false;
    let col = 0, c = 0;
    
    // Détection auto : Est-ce qu'il y a plus de ; ou de , ?
    const sample = str.substring(0, 500);
    const delimiter = (sample.match(/;/g) || []).length > (sample.match(/,/g) || []).length ? ';' : ','; 

    for (; c < str.length; c++) {
        let cc = str[c], nc = str[c + 1];
        arr[col] = arr[col] || [];
        arr[col][arr[col].length] = arr[col][arr[col].length] || "";
        
        if (cc == '"' && quote && nc == '"') { arr[col][arr[col].length - 1] += cc; ++c; continue; }
        if (cc == '"') { quote = !quote; continue; }
        if (cc == delimiter && !quote) { ++arr[col].length; continue; }
        if (cc == '\r' && nc == '\n' && !quote) { ++col; ++c; continue; }
        if (cc == '\n' && !quote) { ++col; continue; }
        if (cc == '\r' && !quote) { ++col; continue; }
        arr[col][arr[col].length - 1] += cc;
    }
    return arr;
}
