import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
// VERIFIE BIEN CETTE LIGNE CI-DESSOUS, C'EST ELLE QUI COMPTE :
import { getFirestore, doc, setDoc, getDoc, addDoc, deleteDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

/* 3. LOGIN */
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
  if(id === 'rh') window.fetchEmployees(); // Chargement RH
  if(id === 'compta') window.toggleCompta('data');
};

/* 4. AUTH STATE & PERMISSIONS */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if(loginBox) loginBox.classList.add("hidden");
    if(adminDashboard) adminDashboard.classList.remove("hidden");
    window.showSection('home');
    await loadUserProfile(user);
    window.fetchUsers();
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

/* 5. GESTION DU PROFIL */
async function loadUserProfile(user) {
    const uid = user.uid;
    const email = user.email;
    const sidebarName = document.getElementById("sidebarUserName");
    const sidebarImg = document.getElementById("sidebarUserImg");
    const nameInput = document.getElementById("settingsDisplayName");
    const photoInput = document.getElementById("settingsPhotoURL");

    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (email === SUPER_ADMIN) {
            if (!docSnap.exists() || docSnap.data().role !== 'admin') {
                await setDoc(docRef, {
                    email: email, role: 'admin', displayName: "Le Boss", photoURL: "", createdAt: new Date().toISOString().split('T')[0]
                }, { merge: true });
                location.reload(); return;
            }
        }

        if (docSnap.exists()) {
            const data = docSnap.data();
            const realName = data.displayName || "Utilisateur";
            const realPhoto = data.photoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";

            sidebarName.innerText = realName;
            sidebarImg.src = realPhoto;
            
            if(nameInput) nameInput.value = data.displayName || "";
            if(photoInput) photoInput.value = data.photoURL || "";

            applyPermissions(data.role);
        } else {
            applyPermissions("guest");
        }
    } catch (error) { console.error("Erreur profil:", error); }
}

function applyPermissions(role) {
    const btnUsers = document.getElementById("btn-users");
    const btnRh = document.getElementById("btn-rh");
    const btnCompta = document.getElementById("btn-compta");

    if(btnUsers) btnUsers.style.display = "block";
    if(btnRh) btnRh.style.display = "block";
    if(btnCompta) btnCompta.style.display = "block";

    if(role === 'admin') return;

    if(role === 'rh') {
        if(btnCompta) btnCompta.style.display = "none";
        if(btnUsers) btnUsers.style.display = "none";
    }
    if(role === 'compta') {
        if(btnRh) btnRh.style.display = "none";
        if(btnUsers) btnUsers.style.display = "none";
    }
    if(!role || (role !== 'rh' && role !== 'compta' && role !== 'admin')) {
        if(btnCompta) btnCompta.style.display = "none";
        if(btnUsers) btnUsers.style.display = "none";
        if(btnRh) btnRh.style.display = "none";
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
        await setDoc(doc(db, "users", user.uid), {
            displayName: newName,
            photoURL: newPhotoURL || ""
        }, { merge: true });

        msg.innerText = "✅ Sauvegardé !";
        msg.style.color = "#00ff88";
        document.getElementById("sidebarUserName").innerText = newName;
        document.getElementById("sidebarUserImg").src = newPhotoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    } catch (error) { msg.innerText = "Erreur."; }
};

/* ==================================================================
   6. MODULE RH (GESTION DES EMPLOYÉS) - NOUVEAU !
   ================================================================== */

// AJOUTER UN EMPLOYÉ
window.createEmployee = async function() {
    const name = document.getElementById("empName").value;
    const grade = document.getElementById("empGrade").value;
    const date = document.getElementById("empDate").value;
    const msg = document.getElementById("rhMsg");

    if(!name || !grade || !date) { msg.innerText = "⚠️ Remplis tout !"; return; }
    msg.innerText = "Signature du contrat...";

    try {
        // On ajoute dans une collection 'employees' différente des 'users'
        await addDoc(collection(db, "employees"), {
            name: name,
            grade: grade,
            hiredDate: date,
            createdAt: new Date().toISOString()
        });

        msg.innerText = "✅ Employé recruté !";
        msg.style.color = "#00ff88";
        
        // Reset des champs
        document.getElementById("empName").value = "";
        document.getElementById("empGrade").value = "";
        window.fetchEmployees(); // Rafraîchir la liste

    } catch (error) {
        msg.innerText = "Erreur: " + error.message;
        msg.style.color = "red";
    }
};

// LISTER LES EMPLOYÉS
window.fetchEmployees = async function() {
    const tbody = document.getElementById("employeeListBody");
    if(!tbody) return;
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center'>Chargement du registre...</td></tr>";

    try {
        const querySnapshot = await getDocs(collection(db, "employees"));
        let html = "";

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            html += `
            <tr>
                <td style="font-weight:bold; color:white;">${data.name}</td>
                <td><span style="color:#facc15;">${data.grade}</span></td>
                <td>${data.hiredDate}</td>
                <td>
                    <button onclick="deleteEmployee('${id}')" style="background:#ff4f4f; padding:5px 10px; font-size:0.8em; width:auto;">🗑️ Virer</button>
                </td>
            </tr>
            `;
        });

        tbody.innerHTML = html || "<tr><td colspan='4' style='text-align:center'>Aucun employé pour le moment.</td></tr>";
    } catch (error) {
        tbody.innerHTML = "<tr><td colspan='4'>Erreur DB RH</td></tr>";
    }
};

// SUPPRIMER (VIRER) UN EMPLOYÉ
window.deleteEmployee = async function(id) {
    if(!confirm("⚠️ Es-tu sûr de vouloir virer cet employé ? Cette action est irréversible.")) return;

    try {
        await deleteDoc(doc(db, "employees", id));
        window.fetchEmployees(); // Rafraîchir
    } catch (error) {
        alert("Erreur suppression: " + error.message);
    }
};

// RECHERCHE RH
window.searchRH = function() {
  const input = document.getElementById("rhSearch");
  const filter = input.value.toUpperCase();
  const table = document.getElementById("rhTable");
  const tr = table.getElementsByTagName("tr");

  for (let i = 1; i < tr.length; i++) {
    let visible = false;
    const tds = tr[i].getElementsByTagName("td");
    for(let j=0; j < tds.length; j++) {
        if(tds[j] && tds[j].textContent.toUpperCase().indexOf(filter) > -1) {
            visible = true; break;
        }
    }
    tr[i].style.display = visible ? "" : "none";
  }
};


/* 7. GESTION UTILISATEURS DU SITE (Login) */
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
        
        await setDoc(doc(db, "users", cred.user.uid), {
            email: email, role: role, createdAt: new Date().toISOString().split('T')[0],
            displayName: "", photoURL: ""
        });
        await signOut(secondaryAuth);
        msg.innerText = `✅ Ajouté !`;
        msg.style.color = "#00ff88";
        window.fetchUsers();
    } catch (error) {
        msg.innerText = "Erreur: " + error.message;
    }
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

      const roleSelect = `
        <select onchange="window.updateUserRole('${uid}', this.value)" 
                style="background:#0f172a; color:white; border:1px solid #334155; padding:5px; border-radius:5px;">
            <option value="admin" ${isSelectAdmin}>👑 Admin</option>
            <option value="rh" ${isSelectRh}>🤝 RH</option>
            <option value="compta" ${isSelectCompta}>📊 Compta</option>
        </select>`;

      html += `<tr><td><div style="font-weight:bold;">${name}</div><div style="font-size:0.8em; color:#94a3b8;">${data.email}</div></td><td>${roleSelect}</td><td>${data.createdAt || "-"}</td></tr>`;
    });
    tbody.innerHTML = html;
  } catch (error) {
    tbody.innerHTML = "<tr><td colspan='3'>Erreur DB</td></tr>";
  }
};

window.updateUserRole = async function(uid, newRole) {
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, { role: newRole });
        console.log(`Rôle mis à jour.`);
    } catch (error) { alert("Erreur rôle : " + error.message); }
};

/* 8. IMPORT TABLEAU */
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
  table.innerHTML = "<tr><td style='padding:20px; text-align:center;'>📡 Lecture...</td></tr>";
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

window.searchTable = function() {
  const input = document.getElementById("tableSearch");
  const filter = input.value.toUpperCase();
  const table = document.getElementById("sheetTable");
  const tr = table.getElementsByTagName("tr");
  for (let i = 1; i < tr.length; i++) {
    let visible = false;
    const tds = tr[i].getElementsByTagName("td");
    for(let j=0; j < tds.length; j++) {
        if(tds[j] && tds[j].textContent.toUpperCase().indexOf(filter) > -1) {
            visible = true; break;
        }
    }
    tr[i].style.display = visible ? "" : "none";
  }
};
