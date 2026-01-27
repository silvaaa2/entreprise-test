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

/* 2. LIEN TABLEAU */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRkyHGb-HA5J6neWRkD5OEq7NWW71D3f1LqSs2-ulwYHYk9GY1ph6m2R0wDWKKOZvdAsSumqdlHQ_5v/pub?gid=2002987340&single=true&output=csv";

/* 3. NAVIGATION */
const loginBox = document.getElementById("loginBox");
const adminDashboard = document.getElementById("adminDashboard");
const errorMsg = document.getElementById("error");

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
  if(id === 'compta') window.toggleCompta('data');
};

/* 4. AUTH STATE (C'EST ICI QUE CA SE JOUE) */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // >>> CONNEXION <<<
    if(loginBox) loginBox.classList.add("hidden");
    if(adminDashboard) adminDashboard.classList.remove("hidden");
    window.showSection('home');
    
    // On charge le profil spécifique de CELUI qui vient de se connecter
    await loadUserProfile(user.uid);
    window.fetchUsers();
  } else {
    // >>> DÉCONNEXION (NETTOYAGE) <<<
    if(loginBox) loginBox.classList.remove("hidden");
    if(adminDashboard) adminDashboard.classList.add("hidden");

    // ON REMET A ZERO L'AFFICHAGE pour éviter que le prochain voie le profil d'avant
    document.getElementById("sidebarUserName").innerText = "Utilisateur";
    document.getElementById("sidebarUserImg").src = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    document.getElementById("settingsDisplayName").value = "";
    document.getElementById("settingsPhotoURL").value = "";
  }
});

/* ==================================================================
   GESTION DU PROFIL (LOGIQUE AMÉLIORÉE)
   ================================================================== */

async function loadUserProfile(uid) {
    const sidebarName = document.getElementById("sidebarUserName");
    const sidebarImg = document.getElementById("sidebarUserImg");
    const nameInput = document.getElementById("settingsDisplayName");
    const photoInput = document.getElementById("settingsPhotoURL");
    
    // IMAGE PAR DÉFAUT (Si l'utilisateur n'a rien mis)
    const defaultImg = "https://cdn-icons-png.flaticon.com/512/847/847969.png";

    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Si data.displayName existe on le met, sinon on met "Utilisateur"
            const realName = data.displayName && data.displayName !== "" ? data.displayName : "Utilisateur";
            
            // Si data.photoURL existe on la met, sinon image par défaut
            const realPhoto = data.photoURL && data.photoURL !== "" ? data.photoURL : defaultImg;

            // Mise à jour Sidebar
            sidebarName.innerText = realName;
            sidebarImg.src = realPhoto;
            
            // Mise à jour Inputs Paramètres
            if(nameInput) nameInput.value = data.displayName || "";
            if(photoInput) photoInput.value = data.photoURL || "";
            
        } else {
            // C'est un nouvel utilisateur qui n'a pas encore de doc dans la base
            // On force l'affichage par défaut pour effacer les traces du précédent
            sidebarName.innerText = "Utilisateur";
            sidebarImg.src = defaultImg;
            if(nameInput) nameInput.value = "";
            if(photoInput) photoInput.value = "";
        }
    } catch (error) {
        console.error("Erreur profil:", error);
    }
}

window.saveProfileSettings = async function() {
    const newName = document.getElementById("settingsDisplayName").value;
    const newPhotoURL = document.getElementById("settingsPhotoURL").value;
    const msg = document.getElementById("settingsMsg");
    const user = auth.currentUser;

    if (!user) { alert("Erreur : Non connecté !"); return; }
    if (!newName || newName.trim() === "") {
        msg.innerText = "⚠️ Le nom est obligatoire !";
        msg.style.color = "orange";
        return;
    }

    msg.innerText = "Sauvegarde...";
    msg.style.color = "white";

    try {
        const userRef = doc(db, "users", user.uid);
        
        await setDoc(userRef, {
            displayName: newName,
            photoURL: newPhotoURL || ""
        }, { merge: true });

        msg.innerText = "✅ Profil mis à jour !";
        msg.style.color = "#00ff88";
        
        // Mise à jour visuelle immédiate
        document.getElementById("sidebarUserName").innerText = newName;
        document.getElementById("sidebarUserImg").src = newPhotoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";

    } catch (error) {
        console.error(error);
        msg.innerText = "❌ Erreur (Voir pop-up)";
        msg.style.color = "red";
        alert("ERREUR :\n" + error.message);
    }
};


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
      email: email, role: role, createdAt: new Date().toISOString().split('T')[0],
      displayName: "", photoURL: ""
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
      const nameDisplay = data.displayName ? `${data.displayName}` : data.email;
      html += `<tr><td>${nameDisplay}</td><td><span style="color:${color};font-weight:bold">${data.role}</span></td><td>${data.createdAt || "-"}</td></tr>`;
    });
    tbody.innerHTML = html || "<tr><td colspan='3' style='text-align:center'>Aucun utilisateur.</td></tr>";
  } catch (error) {
    tbody.innerHTML = "<tr><td colspan='3' style='text-align:center; color:red'>Erreur DB</td></tr>";
  }
};

/* 6. IMPORT TABLEAU */
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
  table.innerHTML = "<tr><td style='padding:20px; text-align:center;'>📡 Lecture des données...</td></tr>";

  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error("Erreur lien");
    let data = await response.text();
    if(data.trim().startsWith("<!DOCTYPE html>")) throw new Error("Accès refusé.");

    const rows = data.split(/\r?\n/).map(row => {
        return row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, '').trim());
    });

    let headerIndex = -1;
    for(let i=0; i < rows.length; i++) {
        const lineStr = JSON.stringify(rows[i]).toLowerCase();
        if(lineStr.includes("achats") && lineStr.includes("farm")) throw new Error("⚠️ Mauvais onglet.");
        if(lineStr.includes("nom du") || lineStr.includes("grade")) { headerIndex = i; break; }
    }
    if (headerIndex === -1) headerIndex = 0;

    const cleanRows = rows.slice(headerIndex);
    let html = "<thead><tr>";
    cleanRows[0].forEach(cell => { html += `<th>${cell || "."}</th>`; });
    html += "</tr></thead><tbody>";

    for (let i = 1; i < cleanRows.length; i++) {
        const row = cleanRows[i];
        if (row.length > 1 && row[0] !== "") {
            html += "<tr>";
            cleanRows[0].forEach((_, j) => { html += `<td>${row[j] || ""}</td>`; });
            html += "</tr>";
        }
    }
    html += "</tbody>";
    table.innerHTML = html;
  } catch (error) {
    table.innerHTML = `<tr><td style='color:#ff4f4f; text-align:center; padding:20px;'>❌ ${error.message}</td></tr>`;
  }
};
