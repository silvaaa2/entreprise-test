import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* 1. CONFIG FIREBASE */
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
const db = getFirestore(app);

// CONFIG SHEET
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRkyHGb-HA5J6neWRkD5OEq7NWW71D3f1LqSs2-ulwYHYk9GY1ph6m2R0wDWKKOZvdAsSumqdlHQ_5v/pub?output=csv";

/* 2. DOM ELEMENTS */
const loginBox = document.getElementById("loginBox");
const adminDashboard = document.getElementById("adminDashboard");
const errorMsg = document.getElementById("error");

/* 3. FONCTIONS LOGIN / LOGOUT */
window.login = async function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  errorMsg.innerText = "Connexion en cours...";
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // On ne fait rien ici, onAuthStateChanged va gérer la suite
  } catch (error) {
    console.error(error);
    errorMsg.innerText = "❌ Erreur : Mot de passe incorrect ou compte inconnu.";
  }
};

window.logout = function() {
  signOut(auth);
};

window.showSection = function(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
};

/* 4. LE CERVEAU (Avec sécurité anti-freeze) 🧠 */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Utilisateur détecté :", user.email);
    
    // --- SECURITE : On tente de lire le rôle, mais on ne bloque pas si ça rate ---
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        console.log("Rôle chargé :", userData.role);
        // Ici tu pourras filtrer l'affichage selon le rôle plus tard
      } else {
        console.log("Aucun rôle défini pour cet utilisateur (c'est sûrement toi, l'admin principal).");
      }
    } catch (error) {
      console.warn("⚠️ Attention : Impossible de lire la base de données (Firestore non activé ?). Accès autorisé quand même.");
      console.error(error);
    }

    // ON OUVRE LE DASHBOARD QUOI QU'IL ARRIVE
    loginBox.classList.add("hidden");
    adminDashboard.classList.remove("hidden");
    window.showSection('home');

  } else {
    // Si déconnecté
    loginBox.classList.remove("hidden");
    adminDashboard.classList.add("hidden");
    if(errorMsg) errorMsg.innerText = "";
  }
});

/* 5. CRÉATION UTILISATEUR (Fonction Admin) */
window.createNewUser = async function() {
  const email = document.getElementById("newEmail").value;
  const password = document.getElementById("newPassword").value;
  const role = document.getElementById("newRole").value;
  const msg = document.getElementById("userMsg");

  if(!email || !password) {
    msg.innerText = "⚠️ Remplis tous les champs !";
    msg.style.color = "orange";
    return;
  }

  msg.innerText = "Création en cours...";
  msg.style.color = "white";

  try {
    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = getAuth(secondaryApp);

    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const newUser = userCredential.user;

    // Écriture dans la DB
    await setDoc(doc(db, "users", newUser.uid), {
      email: email,
      role: role,
      createdAt: new Date()
    });

    await signOut(secondaryAuth); // On déconnecte l'instance temporaire

    msg.innerText = `✅ Compte créé : ${email} (${role})`;
    msg.style.color = "#00ff88";
    
    // Reset inputs
    document.getElementById("newEmail").value = "";
    document.getElementById("newPassword").value = "";

  } catch (error) {
    console.error(error);
    msg.innerText = "❌ Erreur : " + error.message;
    msg.style.color = "#ff4f4f";
  }
};

/* 6. IMPORT DONNÉES GOOGLE SHEETS */
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
  table.innerHTML = "<tr><td style='padding:20px; text-align:center;'>📡 Chargement des données...</td></tr>";

  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error("Erreur réseau");
    const data = await response.text();
    
    if(data.trim().startsWith("<!DOCTYPE html>")) throw new Error("Erreur format HTML");

    const rows = data.split("\n").map(row => row.split(","));
    
    let headerIndex = -1;
    for(let i=0; i < rows.length; i++) {
        const lineStr = JSON.stringify(rows[i]).toLowerCase();
        if(lineStr.includes("nom du") && (lineStr.includes("grade") || lineStr.includes("run"))) {
            headerIndex = i; break;
        }
    }
    if (headerIndex === -1) headerIndex = 7;

    const cleanRows = rows.slice(headerIndex);
    let html = "<thead><tr>";
    cleanRows[0].forEach(cell => { html += `<th>${cell.replace(/^"|"$/g, '').trim() || "-"}</th>`; });
    html += "</tr></thead><tbody>";

    for (let i = 1; i < cleanRows.length; i++) {
      if (cleanRows[i][0] && cleanRows[i][0].replace(/^"|"$/g, '').trim().length > 0) {
        html += "<tr>";
        for(let j=0; j < cleanRows[0].length; j++) {
            html += `<td>${cleanRows[i][j] ? cleanRows[i][j].replace(/^"|"$/g, '') : ""}</td>`;
        }
        html += "</tr>";
      }
    }
    html += "</tbody>";
    table.innerHTML = html;

  } catch (error) {
    table.innerHTML = `<tr><td style='color:#ff4f4f; text-align:center;'>❌ ${error.message}</td></tr>`;
  }
};
