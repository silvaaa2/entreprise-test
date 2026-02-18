import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, addDoc, deleteDoc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

const SUPER_ADMIN = "dr947695@gmail.com"; 
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRkyHGb-HA5J6neWRkD5OEq7NWW71D3f1LqSs2-ulwYHYk9GY1ph6m2R0wDWKKOZvdAsSumqdlHQ_5v/pub?gid=2002987340&single=true&output=csv";

const loginBox = document.getElementById("loginBox");
const adminDashboard = document.getElementById("adminDashboard");
const errorMsg = document.getElementById("error");

/* LOGIN EMAIL */
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

/* LOGIN GOOGLE */
window.loginWithGoogle = async function() {
  const provider = new GoogleAuthProvider();
  if(errorMsg) errorMsg.innerText = "Connexion Google...";
  try {
    await signInWithPopup(auth, provider);
    // La redirection et le profil sont gérés par onAuthStateChanged
  } catch (error) {
    console.error(error);
    if(errorMsg) errorMsg.innerText = "❌ Erreur Google: " + error.message;
  }
};

window.logout = function() {
  signOut(auth).then(() => window.location.reload());
};

window.showSection = function(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
  
  if(id === 'home') window.updateDashboardStats();
  if(id === 'users') window.fetchUsers();
  if(id === 'rh') window.fetchEmployees();
  if(id === 'compta') window.toggleCompta('data');
};

/* AUTH STATE */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if(loginBox) loginBox.classList.add("hidden");
    if(adminDashboard) adminDashboard.classList.remove("hidden");
    window.showSection('home');
    await loadUserProfile(user);
    window.updateDashboardStats(); 
  } else {
    if(loginBox) loginBox.classList.remove("hidden");
    if(adminDashboard) adminDashboard.classList.add("hidden");
    resetInterface();
  }
});

function resetInterface() {
    document.getElementById("sidebarUserName").innerText = "Utilisateur";
    document.getElementById("sidebarUserImg").src = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
}

/* PROFIL & PERMISSIONS (AVEC FUSION INTELLIGENTE) */
async function loadUserProfile(user) {
    const uid = user.uid;
    const email = user.email;
    
    // Elements UI
    const sidebarName = document.getElementById("sidebarUserName");
    const sidebarImg = document.getElementById("sidebarUserImg");
    const nameInput = document.getElementById("settingsDisplayName");
    const photoInput = document.getElementById("settingsPhotoURL");

    try {
        const docRef = doc(db, "users", uid);
        let docSnap = await getDoc(docRef);

        // 1. BACKDOOR SUPER ADMIN
        if (email === SUPER_ADMIN) {
            if (!docSnap.exists() || docSnap.data().role !== 'admin') {
                await setDoc(docRef, {
                    email: email, role: 'admin', displayName: "Le Boss", photoURL: "", createdAt: new Date().toISOString().split('T')[0]
                }, { merge: true });
                location.reload(); return;
            }
        }

        // 2. FUSION COMPTES : Si le compte Google n'existe pas, on cherche s'il a été pré-créé par email
        if (!docSnap.exists()) {
            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                // TROUVÉ ! C'est un compte pré-créé par l'admin (avec un autre UID)
                const oldDoc = querySnapshot.docs[0];
                const oldData = oldDoc.data();
                
                // On copie les droits (le rôle) sur le nouveau compte Google
                await setDoc(docRef, {
                    ...oldData, // Garde le role 'admin' ou 'compta'
                    displayName: user.displayName || oldData.displayName,
                    photoURL: user.photoURL || oldData.photoURL,
                    uid: uid // Mise à jour UID
                });
                
                // On supprime l'ancien compte fantôme pour éviter les doublons
                await deleteDoc(oldDoc.ref);
                
                // On recharge le nouveau doc
                docSnap = await getDoc(docRef);
                console.log("✅ Compte fusionné avec succès !");
            } else {
                // Pas trouvé, c'est un vrai nouveau visiteur -> Invité
                await setDoc(docRef, {
                    email: email, 
                    displayName: user.displayName, 
                    photoURL: user.photoURL, 
                    role: 'guest', 
                    createdAt: new Date().toISOString().split('T')[0]
                });
                docSnap = await getDoc(docRef);
            }
        }

        // 3. CHARGEMENT UI
        if (docSnap.exists()) {
            const data = docSnap.data();
            const realName = data.displayName || user.displayName || "Utilisateur";
            const realPhoto = data.photoURL || user.photoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
            
            sidebarName.innerText = realName;
            sidebarImg.src = realPhoto;
            if(nameInput) nameInput.value = realName;
            if(photoInput) photoInput.value = realPhoto;
            
            applyPermissions(data.role);
        }

    } catch (error) { console.error("Erreur profil:", error); }
}

function applyPermissions(role) {
    const btnUsers = document.getElementById("btn-users");
    const btnRh = document.getElementById("btn-rh");
    const btnCompta = document.getElementById("btn-compta");
    
    const statsGrid = document.querySelector(".stats-grid");
    const homeMsg = document.querySelector(".home-header p");
    const homeTitle = document.querySelector(".home-header h1");

    // 1. Reset : On cache tout par sécurité d'abord
    if(btnUsers) btnUsers.style.display = "none";
    if(btnRh) btnRh.style.display = "none";
    if(btnCompta) btnCompta.style.display = "none";
    if(statsGrid) statsGrid.style.display = "none";
    
    console.log("Application des droits pour le rôle :", role);

    // 2. Logique ADMIN (Tout voir)
    if(role === 'admin') {
        if(btnUsers) btnUsers.style.display = "block";
        if(btnRh) btnRh.style.display = "block";
        if(btnCompta) btnCompta.style.display = "block";
        if(statsGrid) statsGrid.style.display = "grid";
        
        if(homeTitle) homeTitle.innerText = "Bienvenue, Boss. 👋";
        if(homeMsg) homeMsg.innerText = "Voici l'état actuel de ton entreprise.";
        return;
    }

    // 3. Logique GUEST / INVITE (Rien voir)
    if(homeTitle) homeTitle.innerText = "Bienvenue chez Mathieu"; 
    if(homeMsg) homeMsg.innerText = "Attends qu'un administrateur valide ton compte.";

    // 4. Logique RH (Voit RH seulement)
    if(role === 'rh') {
        if(btnRh) btnRh.style.display = "block";
        if(homeMsg) homeMsg.innerText = "Accès RH activé.";
    }

    // 5. Logique COMPTA (Voit Compta seulement)
    if(role === 'compta') {
        if(btnCompta) btnCompta.style.display = "block";
        if(homeMsg) homeMsg.innerText = "Accès Comptabilité activé.";
    }
}

window.saveProfileSettings = async function() {
    const newName = document.getElementById("settingsDisplayName").value;
    const newPhotoURL = document.getElementById("settingsPhotoURL").value;
    const msg = document.getElementById("settingsMsg");
    const user = auth.currentUser;
    if (!user) return;
    if (!newName) { msg.innerText = "Nom obligatoire !"; return; }
    msg.innerText = "Sauvegarde...";
    try {
        await setDoc(doc(db, "users", user.uid), { displayName: newName, photoURL: newPhotoURL || "" }, { merge: true });
        msg.innerText = "✅ Sauvegardé !"; msg.style.color = "#00ff88";
        document.getElementById("sidebarUserName").innerText = newName;
        document.getElementById("sidebarUserImg").src = newPhotoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    } catch (error) { msg.innerText = "Erreur."; }
};

/* DASHBOARD STATS */
window.updateDashboardStats = async function() {
    setInterval(() => {
        const now = new Date();
        const dateElem = document.getElementById("statDate");
        const timeElem = document.getElementById("statTime");
        if(dateElem) dateElem.innerText = now.toLocaleDateString('fr-FR');
        if(timeElem) timeElem.innerText = now.toLocaleTimeString('fr-FR');
    }, 1000);

    try {
        const snapEmp = await getDocs(collection(db, "employees"));
        const elEmp = document.getElementById("statEmployees");
        if(elEmp) elEmp.innerText = snapEmp.size;

        const snapUsers = await getDocs(collection(db, "users"));
        const elUsers = document.getElementById("statUsers");
        if(elUsers) elUsers.innerText = snapUsers.size;
    } catch (e) { console.log("Stats chargées en arrière-plan"); }
};

/* MODULE RH */
window.createEmployee = async function() {
    const name = document.getElementById("empName").value;
    const grade = document.getElementById("empGrade").value;
    const date = document.getElementById("empDate").value;
    const msg = document.getElementById("rhMsg");
    if(!name || !grade || !date) { msg.innerText = "⚠️ Remplis tout !"; return; }
    msg.innerText = "Signature du contrat...";
    try {
        await addDoc(collection(db, "employees"), { name: name, grade: grade, hiredDate: date, createdAt: new Date().toISOString() });
        msg.innerText = "✅ Employé recruté !"; msg.style.color = "#00ff88";
        document.getElementById("empName").value = ""; document.getElementById("empGrade").value = "";
        window.fetchEmployees();
    } catch (error) { msg.innerText = "Erreur: " + error.message; }
};

window.fetchEmployees = async function() {
    const tbody = document.getElementById("employeeListBody");
    if(!tbody) return;
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center'>Chargement...</td></tr>";
    try {
        const querySnapshot = await getDocs(collection(db, "employees"));
        let html = "";
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            html += `<tr><td style="font-weight:bold; color:white;">${data.name}</td><td><span style="color:#facc15;">${data.grade}</span></td><td>${data.hiredDate}</td><td><button onclick="deleteEmployee('${id}')" style="background:#ff4f4f; padding:5px 10px; font-size:0.8em; width:auto;">🗑️ Virer</button></td></tr>`;
        });
        tbody.innerHTML = html || "<tr><td colspan='4' style='text-align:center'>Aucun employé.</td></tr>";
    } catch (error) { tbody.innerHTML = "<tr><td colspan='4'>Erreur DB RH</td></tr>"; }
};

window.deleteEmployee = async function(id) {
    if(!confirm("⚠️ Virer cet employé ?")) return;
    try { await deleteDoc(doc(db, "employees", id)); window.fetchEmployees(); } 
    catch (error) { alert("Erreur: " + error.message); }
};

window.searchRH = function() {
  const input = document.getElementById("rhSearch");
  const filter = input.value.toUpperCase();
  const table = document.getElementById("rhTable");
  const tr = table.getElementsByTagName("tr");
  for (let i = 1; i < tr.length; i++) {
    let visible = false;
    const tds = tr[i].getElementsByTagName("td");
    for(let j=0; j < tds.length; j++) { if(tds[j] && tds[j].textContent.toUpperCase().indexOf(filter) > -1) { visible = true; break; } }
    tr[i].style.display = visible ? "" : "none";
  }
};

/* USERS */
window.createNewUser = async function() {
    const email = document.getElementById("newEmail").value;
    const password = document.getElementById("newPassword").value;
    const role = document.getElementById("newRole").value;
    const msg = document.getElementById("userMsg");
    if(!email || !password) { msg.innerText = "Remplis tout !"; return; }
    msg.innerText = "Création...";
    try {
        const secondaryApp = initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        // Ajout avec un displayName vide pour éviter le "undefined"
        await setDoc(doc(db, "users", cred.user.uid), { email: email, role: role, createdAt: new Date().toISOString().split('T')[0], displayName: "En attente", photoURL: "" });
        await signOut(secondaryAuth);
        msg.innerText = `✅ Ajouté !`; msg.style.color = "#00ff88";
        window.fetchUsers();
    } catch (error) { msg.innerText = "Erreur: " + error.message; }
};

window.fetchUsers = async function() {
  const tbody = document.getElementById("userListBody");
  if(!tbody) return;
  tbody.innerHTML = "<tr><td colspan='3'>Chargement...</td></tr>";
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    let html = "";
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const uid = docSnap.id;
      const name = data.displayName || "Sans nom";
      const isSelectAdmin = data.role === 'admin' ? 'selected' : '';
      const isSelectRh = data.role === 'rh' ? 'selected' : '';
      const isSelectCompta = data.role === 'compta' ? 'selected' : '';
      const roleSelect = `<select onchange="window.updateUserRole('${uid}', this.value)" style="background:#0f172a; color:white; border:1px solid #334155; padding:5px; border-radius:5px;"><option value="admin" ${isSelectAdmin}>👑 Admin</option><option value="rh" ${isSelectRh}>🤝 RH</option><option value="compta" ${isSelectCompta}>📊 Compta</option></select>`;
      html += `<tr><td><div style="font-weight:bold;">${name}</div><div style="font-size:0.8em; color:#94a3b8;">${data.email}</div></td><td>${roleSelect}</td><td>${data.createdAt || "-"}</td></tr>`;
    });
    tbody.innerHTML = html;
  } catch (error) { tbody.innerHTML = "<tr><td colspan='3'>Erreur DB</td></tr>"; }
};

window.updateUserRole = async function(uid, newRole) {
    try { await updateDoc(doc(db, "users", uid), { role: newRole }); console.log(`Rôle mis à jour.`); } 
    catch (error) { alert("Erreur rôle : " + error.message); }
};

/* COMPTA */
window.toggleCompta = function(mode) {
  const frame = document.getElementById("sheetFrame");
  const table = document.getElementById("nativeTableContainer");
  const btns = document.querySelectorAll(".compta-controls button");
  if(mode === 'iframe') {
    frame.classList.remove("hidden"); table.classList.add("hidden");
    if(btns[0]) btns[0].classList.add("action-btn"); if(btns[1]) btns[1].classList.remove("action-btn");
  } else {
    frame.classList.add("hidden"); table.classList.remove("hidden");
    if(btns[0]) btns[0].classList.remove("action-btn"); if(btns[1]) btns[1].classList.add("action-btn");
    window.loadSheetData();
  }
};

window.loadSheetData = async function() {
  const table = document.getElementById("sheetTable");
  table.innerHTML = "<tr><td style='padding:20px; text-align:center;'>📡 Lecture...</td></tr>";
  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error("Erreur lien");
    let data = await response.text();
    if(data.trim().startsWith("<!DOCTYPE html>")) throw new Error("Accès refusé.");
    const rows = data.split(/\r?\n/).map(row => row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, '').trim()));
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
  } catch (error) { table.innerHTML = `<tr><td style='color:#ff4f4f; text-align:center; padding:20px;'>❌ ${error.message}</td></tr>`; }
};

window.searchTable = function() {
  const input = document.getElementById("tableSearch");
  const filter = input.value.toUpperCase();
  const table = document.getElementById("sheetTable");
  const tr = table.getElementsByTagName("tr");
  for (let i = 1; i < tr.length; i++) {
    let visible = false;
    const tds = tr[i].getElementsByTagName("td");
    for(let j=0; j < tds.length; j++) { if(tds[j] && tds[j].textContent.toUpperCase().indexOf(filter) > -1) { visible = true; break; } }
    tr[i].style.display = visible ? "" : "none";
  }
};
