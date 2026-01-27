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

// Initialisation App Principale
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Base de données

// CONFIG SHEET
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRkyHGb-HA5J6neWRkD5OEq7NWW71D3f1LqSs2-ulwYHYk9GY1ph6m2R0wDWKKOZvdAsSumqdlHQ_5v/pub?output=csv";

/* 2. NAVIGATION & LOGIN */
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
    console.error(error);
    errorMsg.innerText = "❌ Erreur login.";
  }
};

window.logout = function() {
  signOut(auth);
};

window.showSection = function(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
};

/* 3. VERIFICATION DES RÔLES (Important) */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // On vérifie le rôle dans la base de données
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      console.log("Rôle connecté :", userData.role);
      // Ici tu pourrais cacher des boutons selon le rôle
    }

    loginBox.classList.add("hidden");
    adminDashboard.classList.remove("hidden");
    window.showSection('home');
  } else {
    loginBox.classList.remove("hidden");
    adminDashboard.classList.add("hidden");
  }
});

/* ===========================================================
   4. CRÉATION D'UTILISATEUR (LA FONCTION MAGIQUE) 🧙‍♂️
   =========================================================== */
window.createNewUser = async function() {
  const email = document.getElementById("newEmail").value;
  const password = document.getElementById("newPassword").value;
  const role = document.getElementById("newRole").value;
  const msg = document.getElementById("userMsg");

  if(!email || !password) {
    msg.innerText = "⚠️ Remplis tout !";
    msg.style.color = "orange";
    return;
  }

  msg.innerText = "Création en cours...";
  msg.style.color = "white";

  try {
    // ASTUCE DE PRO : On crée une "2ème application" temporaire.
    // Pourquoi ? Si on utilise "auth" normal, Firebase va te déconnecter TOI
    // pour connecter le nouvel utilisateur. Avec ça, tu restes connecté.
    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = getAuth(secondaryApp);

    // 1. Créer le compte
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const newUser = userCredential.user;

    // 2. Sauvegarder son Rôle dans Firestore (Base de données)
    await setDoc(doc(db, "users", newUser.uid), {
      email: email,
      role: role,
      createdAt: new Date()
    });

    // 3. Déconnecter l'instance secondaire (ménage)
    await signOut(secondaryAuth);

    msg.innerText = `✅ Utilisateur créé : ${email} (Rôle: ${role})`;
    msg.style.color = "#00ff88"; // Vert fluo
    
    // Reset form
    document.getElementById("newEmail").value = "";
    document.getElementById("newPassword").value = "";

  } catch (error) {
    console.error(error);
    msg.innerText = "❌ Erreur : " + error.message;
    msg.style.color = "#ff4f4f";
  }
};

/* ===========================================================
   5. IMPORT COMPTA (CODE PRÉCÉDENT)
   =========================================================== */
window.toggleCompta = function(mode) { /* Code existant */ }; // Simplifié pour la lisibilité
window.loadSheetData = async function() {
    // ... [Ton code loadSheetData complet d'avant reste ici, ne le change pas] ...
    // Je remets juste le début pour que tu ne sois pas perdu
    const tableContainer = document.getElementById("nativeTableContainer");
    const sheetFrame = document.getElementById("sheetFrame");
    const table = document.getElementById("sheetTable");
    sheetFrame.classList.add("hidden");
    tableContainer.classList.remove("hidden");
    table.innerHTML = "<tr><td style='padding:20px; text-align:center;'>📡 Chargement...</td></tr>";

    try {
        const response = await fetch(SHEET_CSV_URL);
        if (!response.ok) throw new Error("Erreur lien");
        const data = await response.text();
        if(data.trim().startsWith("<!DOCTYPE html>")) throw new Error("Erreur format");
        
        const rows = data.split("\n").map(row => row.split(","));
        let headerIndex = -1;
        for(let i=0; i < rows.length; i++) {
            if(JSON.stringify(rows[i]).toLowerCase().includes("nom du") && JSON.stringify(rows[i]).toLowerCase().includes("grade")) {
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
        table.innerHTML = `<tr><td style='color:red;text-align:center;'>❌ ${error.message}</td></tr>`;
    }
};
