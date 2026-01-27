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

// Lien CSV qui marche (Copie de Compta Flashback FA)
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRkyHGb-HA5J6neWRkD5OEq7NWW71D3f1LqSs2-ulwYHYk9GY1ph6m2R0wDWKKOZvdAsSumqdlHQ_5v/pub?output=csv";

/* 2. NAVIGATION ET LOGIN */
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
    errorMsg.innerText = "❌ Login incorrect.";
  }
};

window.logout = function() {
  signOut(auth);
};

window.showSection = function(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
  
  // Si on va sur l'onglet Users, on charge la liste !
  if(id === 'users') {
    window.fetchUsers();
  }
};

/* 3. VERIF UTILISATEUR CONNECTÉ */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginBox.classList.add("hidden");
    adminDashboard.classList.remove("hidden");
    window.showSection('home');
    
    // On charge la liste des utilisateurs au démarrage pour être sûr
    window.fetchUsers(); 
  } else {
    loginBox.classList.remove("hidden");
    adminDashboard.classList.add("hidden");
  }
});

/* 4. GESTION DES UTILISATEURS (CREATE + READ) */

// Fonction A : Créer un utilisateur
window.createNewUser = async function() {
  const email = document.getElementById("newEmail").value;
  const password = document.getElementById("newPassword").value;
  const role = document.getElementById("newRole").value;
  const msg = document.getElementById("userMsg");

  if(!email || !password) {
    msg.innerText = "⚠️ Remplis tout !";
    return;
  }

  msg.innerText = "Création...";
  msg.style.color = "white";

  try {
    // Astuce 2ème App pour ne pas se déconnecter
    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = getAuth(secondaryApp);
    
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    
    // Sauvegarde en Base de Données
    await setDoc(doc(db, "users", cred.user.uid), {
      email: email,
      role: role,
      createdAt: new Date().toISOString().split('T')[0] // Date format YYYY-MM-DD
    });

    await signOut(secondaryAuth); // Ménage

    msg.innerText = `✅ Ajouté : ${email}`;
    msg.style.color = "#00ff88";
    
    // On rafraîchit la liste immédiatement !
    window.fetchUsers();

  } catch (error) {
    console.error(error);
    msg.innerText = "❌ Erreur : " + error.message;
    msg.style.color = "red";
  }
};

// Fonction B : Lire et Afficher la liste (C'est celle qui manquait !)
window.fetchUsers = async function() {
  const tbody = document.getElementById("userListBody");
  // Petit loader
  tbody.innerHTML = "<tr><td colspan='3' style='text-align:center'>Chargement de la liste...</td></tr>";

  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    let html = "";
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // On définit une couleur pour le rôle
      let badgeColor = "#cbd5e1";
      if(data.role === 'admin') badgeColor = "#ff4f4f"; // Rouge
      if(data.role === 'rh') badgeColor = "#facc15"; // Jaune
      if(data.role === 'compta') badgeColor = "#3b82f6"; // Bleu

      html += `
        <tr>
          <td>${data.email}</td>
          <td><span style="color:${badgeColor}; font-weight:bold; text-transform:uppercase;">${data.role}</span></td>
          <td>${data.createdAt || "-"}</td>
        </tr>
      `;
    });

    if(html === "") {
        tbody.innerHTML = "<tr><td colspan='3' style='text-align:center'>Aucun utilisateur trouvé.</td></tr>";
    } else {
        tbody.innerHTML = html;
    }

  } catch (error) {
    console.error("Erreur lecture Users:", error);
    tbody.innerHTML = "<tr><td colspan='3' style='color:red; text-align:center'>Erreur accès base de données (Firestore activé ?)</td></tr>";
  }
};


/* 5. GESTION DU SHEET (COMPTA) */
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
  table.innerHTML = "<tr><td style='padding:20px; text-align:center;'>📡 Chargement Compta...</td></tr>";

  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error("Erreur lien");
    const data = await response.text();

    if(data.trim().startsWith("<!DOCTYPE html>")) throw new Error("Format HTML reçu (Publier en CSV !)");

    const rows = data.split("\n").map(row => row.split(","));
    
    // Recherche automatique de l'en-tête
    let headerIndex = -1;
    for(let i=0; i < rows.length; i++) {
        const line = JSON.stringify(rows[i]).toLowerCase();
        // On cherche tes colonnes "Nom du salarié" + "Grade"
        if(line.includes("nom du") && line.includes("grade")) {
            headerIndex = i; break;
        }
    }
    // Fallback ligne 8
    if (headerIndex === -1) headerIndex = 7;

    const cleanRows = rows.slice(headerIndex);
    
    let html = "<thead><tr>";
    cleanRows[0].forEach(cell => { html += `<th>${cell.replace(/^"|"$/g, '').trim() || "."}</th>`; });
    html += "</tr></thead><tbody>";

    for (let i = 1; i < cleanRows.length; i++) {
        const row = cleanRows[i];
        // On affiche seulement si la colonne NOM (index 0) n'est pas vide
        if (row[0] && row[0].replace(/^"|"$/g, '').trim().length > 0) {
            html += "<tr>";
            for(let j=0; j < cleanRows[0].length; j++) {
                html += `<td>${row[j] ? row[j].replace(/^"|"$/g, '') : ""}</td>`;
            }
            html += "</tr>";
        }
    }
    html += "</tbody>";
    table.innerHTML = html;

  } catch (error) {
    console.error(error);
    table.innerHTML = `<tr><td style='color:red; text-align:center;'>❌ ${error.message}</td></tr>`;
  }
};
