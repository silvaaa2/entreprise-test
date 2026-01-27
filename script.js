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
   2. LE LIEN UNIQUE (A REMPLACER)
   Colle ici le lien que tu viens de copier dans "Publier sur le web".
   Il doit finir par "output=csv"
   ================================================================== */
const SHEET_CSV_URL = "TON_LIEN_ICI_ENTRE_LES_GUILLEMETS"; 


/* 3. VARIABLES DOM */
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
  // On ne charge pas la compta auto pour laisser le choix
};

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

/* 5. GESTION UTILISATEURS */
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

/* 6. IMPORT TABLEAU (BOUTONS) */
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
  table.innerHTML = "<tr><td style='padding:20px; text-align:center;'>📡 Importation des données...</td></tr>";

  // Petite sécurité si tu as oublié de changer le lien
  if(SHEET_CSV_URL.includes("TON_LIEN_ICI")) {
     table.innerHTML = `<tr><td style='color:orange; text-align:center;'>⚠️ Tu as oublié de coller ton lien CSV dans le fichier script.js !</td></tr>`;
     return;
  }

  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error("Erreur lien (Vérifie 'Publier sur le web')");
    
    let data = await response.text();
    
    // Si c'est du HTML, c'est pas bon
    if(data.trim().startsWith("<!DOCTYPE html>")) {
        throw new Error("⚠️ Lien incorrect. Tu dois choisir 'CSV' dans les options de publication.");
    }

    // Parseur CSV
    const rows = parseCSV(data);

    // Recherche de l'en-tête "Nom du salarié"
    let headerIndex = -1;
    for(let i=0; i < rows.length; i++) {
        const line = JSON.stringify(rows[i]).toLowerCase();
        
        // Si on trouve "Dépenses déductibles", c'est le mauvais onglet !
        if(line.includes("dépenses") && line.includes("déductibles")) {
           throw new Error("⚠️ Tu importes l'onglet 'Dépenses'.<br>Refais la manip 'Publier sur le web' en sélectionnant l'onglet 'Compta'.");
        }

        if(line.includes("nom du") && line.includes("grade")) {
            headerIndex = i; break;
        }
    }
    
    if (headerIndex === -1) headerIndex = 7; // Fallback

    const cleanRows = rows.slice(headerIndex);
    
    // HTML
    let html = "<thead><tr>";
    cleanRows[0].forEach(cell => { 
        html += `<th>${cell.replace(/^"|"$/g, '').trim() || "."}</th>`; 
    });
    html += "</tr></thead><tbody>";

    for (let i = 1; i < cleanRows.length; i++) {
        const row = cleanRows[i];
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
    table.innerHTML = `<tr><td style='color:#ff4f4f; text-align:center; padding:20px;'>❌ ${error.message}</td></tr>`;
  }
};

// Fonction Parseur CSV
function parseCSV(str) {
    const arr = [];
    let quote = false;
    let col = 0, c = 0;
    // Détection auto séparateur
    const delimiter = (str.indexOf(";") > -1 && str.indexOf(";") < str.indexOf(",")) ? ";" : ",";

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
