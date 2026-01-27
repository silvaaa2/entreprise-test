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
   2. LIEN API GOOGLE VIZ (L'ARME ULTIME)
   On utilise 'gviz/tq' qui est fait pour les développeurs.
   tqx=out:csv -> Force la sortie en CSV propre.
   gid=1852400448 -> C'est ton onglet Compta.
   ================================================================== */
const SHEET_API_URL = "https://docs.google.com/spreadsheets/d/1zCczeHhR5rVWDMbmIgiE5LA4StH2TBYWczMIGPfWDZU/gviz/tq?tqx=out:csv&gid=1852400448";


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
  if(id === 'compta') window.toggleCompta('data'); // Charge auto la compta
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
   5. IMPORTATION TABLEAU (CORRECTION DU BUG DE LETTRES)
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
  table.innerHTML = "<tr><td style='padding:20px; text-align:center;'>📡 Connexion à la Compta...</td></tr>";

  try {
    const response = await fetch(SHEET_API_URL);
    if (!response.ok) throw new Error("Erreur accès (Code " + response.status + ")");
    
    let data = await response.text();
    
    // Si on reçoit du HTML au lieu du CSV, c'est que c'est privé ou mauvais lien
    if(data.trim().startsWith("<!DOCTYPE html>") || data.includes("<html")) {
        throw new Error("⚠️ Accès Bloqué par Google.<br>Va dans ton Sheet > Partager > 'Tous les utilisateurs disposant du lien'.");
    }

    // --- CORRECTION BUG "LETTRE PAR LETTRE" ---
    // Google renvoie parfois des guillemets autour de tout. On nettoie.
    // On détecte le séparateur : Virgule ou Point-Virgule ?
    // En France, Google Sheets exporte souvent avec ";"
    
    // Petit nettoyage des guillemets inutiles de l'API Viz
    // L'API Viz met parfois des " autour des chiffres, on va gérer ça dans le parseur.

    const rows = parseCSVRefined(data);

    // --- RECHERCHE INTELLIGENTE ---
    let headerIndex = -1;
    for(let i=0; i < rows.length; i++) {
        const line = JSON.stringify(rows[i]).toLowerCase();
        
        // Sécurité : Si on voit "Farm", on arrête tout
        if(line.includes("achats") && line.includes("farm")) {
           throw new Error("⚠️ Erreur : Google envoie encore l'onglet 'Farm'.<br>Solution : Utilise le lien 'Partager' (Share) et mets-le en Public.");
        }

        if(line.includes("nom du") && line.includes("grade")) {
            headerIndex = i; break;
        }
    }
    
    if (headerIndex === -1) headerIndex = 0; // Par défaut on prend le début si on trouve pas

    const cleanRows = rows.slice(headerIndex);
    
    // Construction du tableau
    let html = "<thead><tr>";
    
    // En-têtes
    cleanRows[0].forEach(cell => { 
        // On enlève les guillemets qui traînent
        let text = cell.replace(/^"|"$/g, '').trim();
        html += `<th>${text || "."}</th>`; 
    });
    html += "</tr></thead><tbody>";

    // Données
    for (let i = 1; i < cleanRows.length; i
