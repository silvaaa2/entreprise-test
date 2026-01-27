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
   2. LIEN MAGIQUE (FORCE L'ONGLET 1852400448)
   On utilise le lien "export" au lieu de "pub" pour viser juste.
   ================================================================== */
const SHEET_ID = "1zCczeHhR5rVWDMbmIgiE5LA4StH2TBYWczMIGPfWDZU";
const GID = "1852400448"; // C'est l'ID de ton onglet Compta
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;


/* 3. LOGIN & NAVIGATION */
const loginBox = document.getElementById("loginBox");
const adminDashboard = document.getElementById("adminDashboard");
const errorMsg = document.getElementById("error");

window.login = async function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  errorMsg.innerText = "Connexion...";
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    errorMsg.innerText = "❌ Login incorrect.";
  }
};

window.logout = function() { signOut(auth); };

window.showSection = function(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
  if(id === 'users') window.fetchUsers();
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginBox.classList.add("hidden");
    adminDashboard.classList.remove("hidden");
    window.showSection('home');
    window.fetchUsers();
  } else {
    loginBox.classList.remove("hidden");
    adminDashboard.classList.add("hidden");
  }
});

/* 4. GESTION UTILISATEURS */
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

/* ==================================================================
   5. TABLEAU SIMPLIFIÉ (Logique Améliorée)
   ================================================================== */
window.toggleCompta = function(mode) {
  const frame = document.getElementById("sheetFrame");
  const table = document.getElementById("nativeTableContainer");
  const btns = document.querySelectorAll(".compta-controls button");

  if(mode === 'iframe') {
    frame.classList.remove("hidden");
    table.classList.add("hidden");
    btns[0].classList.add("action-btn");
    btns[1].classList.remove("action-btn");
  } else {
    frame.classList.add("hidden");
    table.classList.remove("hidden");
    btns[0].classList.remove("action-btn");
    btns[1].classList.add("action-btn");
    window.loadSheetData();
  }
};

window.loadSheetData = async function() {
  const table = document.getElementById("sheetTable");
  table.innerHTML = "<tr><td style='padding:20px; text-align:center;'>📡 Récupération des données...</td></tr>";

  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error("Erreur lien (Vérifie que le sheet est 'Public avec le lien')");
    
    const data = await response.text();
    
    // Parser CSV robuste (gère les guillemets Google)
    const rows = parseCSV(data);

    // --- DETECTION INTELLIGENTE ---
    // On cherche la ligne qui contient "Nom du salarié"
    let headerIndex = -1;
    for(let i=0; i < rows.length; i++) {
        const line = JSON.stringify(rows[i]).toLowerCase();
        if(line.includes("nom du") && line.includes("grade")) {
            headerIndex = i; break;
        }
    }
    
    // Si on ne trouve pas, on prend la ligne 7 (souvent le cas dans ton fichier)
    if (headerIndex === -1) headerIndex = 7;

    const cleanRows = rows.slice(headerIndex);
    
    // Construction HTML
    let html = "<thead><tr>";
    
    // En-têtes
    cleanRows[0].forEach(cell => { 
        html += `<th>${cell.trim() || "."}</th>`; 
    });
    html += "</tr></thead><tbody>";

    // Données
    for (let i = 1; i < cleanRows.length; i++) {
        const row = cleanRows[i];
        // On affiche seulement si la colonne NOM (index 0) est remplie
        if (row[0] && row[0].trim().length > 0) {
            html += "<tr>";
            // On s'assure d'avoir autant de cellules que d'en-têtes
            for(let j=0; j < cleanRows[0].length; j++) {
                html += `<td>${row[j] || ""}</td>`;
            }
            html += "</tr>";
        }
    }
    html += "</tbody>";
    table.innerHTML = html;

  } catch (error) {
    console.error(error);
    table.innerHTML = `<tr><td style='color:#ff4f4f; text-align:center;'>❌ Erreur : ${error.message}</td></tr>`;
  }
};

// Fonction utilitaire pour bien lire le CSV de Google
function parseCSV(str) {
    const arr = [];
    let quote = false;
    let col = 0, c = 0;
    for (; c < str.length; c++) {
        let cc = str[c], nc = str[c + 1];
        arr[col] = arr[col] || [];
        arr[col][arr[col].length] = arr[col][arr[col].length] || "";
        if (cc == '"' && quote && nc == '"') { arr[col][arr[col].length - 1] += cc; ++c; continue; }
        if (cc == '"') { quote = !quote; continue; }
        if (cc == ',' && !quote) { ++arr[col].length; continue; }
        if (cc == '\r' && nc == '\n' && !quote) { ++col; ++c; continue; }
        if (cc == '\n' && !quote) { ++col; continue; }
        if (cc == '\r' && !quote) { ++col; continue; }
        arr[col][arr[col].length - 1] += cc;
    }
    return arr;
}
