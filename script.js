import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, deleteUser } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, addDoc, deleteDoc, updateDoc, collection, getDocs, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

/* INIT THEME */
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    const btn = document.getElementById('themeBtn');
    if(btn) btn.innerText = "🌙 Mode Sombre";
}

window.login = async function() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if(errorMsg) errorMsg.innerText = "Connexion...";
  try { await signInWithEmailAndPassword(auth, email, password); } 
  catch (error) { if(errorMsg) errorMsg.innerText = "❌ Login incorrect."; }
};

window.loginWithGoogle = async function() {
  const provider = new GoogleAuthProvider();
  if(errorMsg) errorMsg.innerText = "Connexion Google...";
  try { await signInWithPopup(auth, provider); } 
  catch (error) { if(errorMsg) errorMsg.innerText = "❌ Erreur Google: " + error.message; }
};

window.logout = function() { signOut(auth).then(() => window.location.reload()); };

window.showSection = function(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
  
  if(id === 'home') { window.updateDashboardStats(); window.fetchAnnouncements(); }
  if(id === 'users') window.fetchUsers();
  if(id === 'rh') { window.fetchEmployees(); window.fetchAnnouncements(); }
  if(id === 'compta') window.toggleCompta('data');
  if(id === 'docs') window.fetchAdminDocs(); 
  if(id === 'service') window.loadMyService(); // NOUVEAU
};

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
    document.getElementById("sidebarUserName").innerText = "Utilisateur";
    document.getElementById("sidebarUserImg").src = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
  }
});

async function loadUserProfile(user) {
    const uid = user.uid;
    const email = user.email;
    const sidebarName = document.getElementById("sidebarUserName");
    const sidebarImg = document.getElementById("sidebarUserImg");

    try {
        const docRef = doc(db, "users", uid);
        let docSnap = await getDoc(docRef);

        if (email === SUPER_ADMIN) {
            if (!docSnap.exists() || docSnap.data().role !== 'admin') {
                await setDoc(docRef, { email: email, role: 'admin', displayName: "Le Boss", photoURL: "", createdAt: new Date().toISOString().split('T')[0] }, { merge: true });
                location.reload(); return;
            }
        }

        if (!docSnap.exists()) {
            const q = query(collection(db, "users"), where("email", "==", email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const oldDoc = querySnapshot.docs[0];
                await setDoc(docRef, { ...oldDoc.data(), displayName: user.displayName || oldDoc.data().displayName, photoURL: user.photoURL || oldDoc.data().photoURL, uid: uid });
                await deleteDoc(oldDoc.ref);
                docSnap = await getDoc(docRef);
            } else {
                await setDoc(docRef, { email: email, displayName: user.displayName, photoURL: user.photoURL, role: 'guest', createdAt: new Date().toISOString().split('T')[0] });
                docSnap = await getDoc(docRef);
            }
        }

        if (docSnap.exists()) {
            const data = docSnap.data();
            sidebarName.innerText = data.displayName || user.displayName || "Utilisateur";
            sidebarImg.src = data.photoURL || user.photoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
            
            window.currentUserRole = data.role;
            window.currentUserName = data.displayName || "Utilisateur";
            applyPermissions(data.role);
        }
    } catch (error) { console.error("Erreur profil:", error); }
}

function applyPermissions(role) {
    const btnUsers = document.getElementById("btn-users");
    const btnRh = document.getElementById("btn-rh");
    const btnCompta = document.getElementById("btn-compta");
    const btnDocs = document.getElementById("btn-docs");
    const btnService = document.getElementById("btn-service"); // POINTAGE
    const statsGrid = document.getElementById("mainStatsGrid");
    const homeMsg = document.querySelector(".home-header p");

    if(btnUsers) btnUsers.style.display = "none";
    if(btnRh) btnRh.style.display = "none";
    if(btnCompta) btnCompta.style.display = "none";
    if(btnDocs) btnDocs.style.display = "none"; 
    if(btnService) btnService.style.display = "none"; 
    if(statsGrid) statsGrid.style.display = "none";
    
    // ADMIN
    if(role === 'admin') {
        if(btnUsers) btnUsers.style.display = "block";
        if(btnRh) btnRh.style.display = "block";
        if(btnCompta) btnCompta.style.display = "block";
        if(btnDocs) btnDocs.style.display = "block"; 
        if(btnService) btnService.style.display = "block"; 
        if(statsGrid) statsGrid.style.display = "grid";
        if(homeMsg) homeMsg.innerText = "Voici l'état actuel de ton entreprise.";
        return;
    }

    // NOUVEAU : EMPLOYÉ (POINTAGE)
    if(role === 'employee') {
        if(btnService) btnService.style.display = "block";
        if(homeMsg) homeMsg.innerText = "Va dans 'Mon Pointage' pour commencer ta journée.";
        return;
    }

    if (!role || role === 'guest') {
        if(homeMsg) homeMsg.innerText = "⛔ Ton compte n'a pas encore d'accès.";
        return; 
    }
    
    if(homeMsg) homeMsg.innerText = "Sélectionne un menu à gauche.";
    if(role === 'rh') { 
        if(btnRh) btnRh.style.display = "block"; 
        if(btnService) btnService.style.display = "block"; 
    }
    if(role === 'compta') if(btnCompta) btnCompta.style.display = "block";
}

/* ==================== POINTAGE PERSONNEL (NOUVEAU) ==================== */
let myPersonalTimer = null;
let myEmployeeDocId = null;

window.loadMyService = async function() {
    const user = auth.currentUser;
    if (!user) return;
    const container = document.getElementById("myServiceContainer");

    container.innerHTML = "<p>Recherche de ton dossier RH...</p>";

    // Chercher le dossier RH lié à cet email
    const q = query(collection(db, "employees"), where("email", "==", user.email));
    const snap = await getDocs(q);

    if (snap.empty) {
        container.innerHTML = `
            <div class="pointage-card">
                <h3 style="color:var(--error);">⚠️ Dossier introuvable</h3>
                <p>Aucun dossier RH n'est relié à ton adresse email (<b>${user.email}</b>).</p>
                <p>Demande à l'admin ou aux RH d'ajouter ton email dans ta fiche employé.</p>
            </div>`;
        return;
    }

    const empDoc = snap.docs[0];
    const data = empDoc.data();
    myEmployeeDocId = empDoc.id;

    renderMyServiceUI(data);

    // Écouter les changements en direct au cas où l'admin change le statut
    onSnapshot(doc(db, "employees", myEmployeeDocId), (docSnap) => {
        if(docSnap.exists()) renderMyServiceUI(docSnap.data());
    });
};

function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h}h ${m}m`;
}

function renderMyServiceUI(data) {
    const container = document.getElementById("myServiceContainer");
    if(myPersonalTimer) clearInterval(myPersonalTimer);

    let statusText = "";
    let buttonHtml = "";
    let isEnService = data.status === 'en_service';

    if (isEnService) {
        statusText = `<span class="status-badge status-en_service" style="font-size:1em;">🟢 EN SERVICE</span>`;
        buttonHtml = `<button class="btn-clock-out" onclick="toggleMyService('hors_service')">🔴 Terminer mon service</button>`;
    } else {
        statusText = `<span class="status-badge status-hors_service" style="font-size:1em;">⚪ HORS SERVICE</span>`;
        buttonHtml = `<button class="btn-clock-in" onclick="toggleMyService('en_service')">🟢 Prendre mon service</button>`;
    }

    container.innerHTML = `
        <div class="pointage-card">
            <h2 style="margin-top:0;">${data.name}</h2>
            <p style="color:var(--subtext); margin-bottom: 20px;">${data.grade}</p>
            
            <div style="margin-bottom: 30px;">
                ${statusText}
            </div>

            <p style="color:var(--subtext); margin:0;">Temps de service total :</p>
            <div id="my_live_clock" class="live-clock">0h 0m</div>

            ${buttonHtml}
        </div>
    `;

    // Gestion du temps
    let baseSeconds = data.totalServiceSeconds || 0;
    let startTimestamp = data.currentServiceStart;

    const updateMyTimer = () => {
        let currentSeconds = baseSeconds;
        if (isEnService && startTimestamp) {
            currentSeconds += Math.floor((Date.now() - startTimestamp) / 1000);
        }
        const clockEl = document.getElementById("my_live_clock");
        if(clockEl) clockEl.innerText = formatTime(currentSeconds);
    };

    updateMyTimer();
    if (isEnService) {
        myPersonalTimer = setInterval(updateMyTimer, 60000); // Actu chaque minute
    }
}

window.toggleMyService = async function(newStatus) {
    if(!myEmployeeDocId) return;
    
    // Récupérer les données actuelles
    const docSnap = await getDoc(doc(db, "employees", myEmployeeDocId));
    if(!docSnap.exists()) return;
    const data = docSnap.data();

    const oldStatus = data.status || 'hors_service';
    let totalSeconds = data.totalServiceSeconds || 0;
    let currentStart = data.currentServiceStart;

    let updates = { status: newStatus };

    if (oldStatus !== 'en_service' && newStatus === 'en_service') {
        updates.currentServiceStart = Date.now();
    } 
    else if (oldStatus === 'en_service' && newStatus !== 'en_service') {
        if (currentStart) {
            const timeDiffSeconds = Math.floor((Date.now() - parseInt(currentStart)) / 1000);
            updates.totalServiceSeconds = totalSeconds + timeDiffSeconds;
        }
        updates.currentServiceStart = null; 
    }

    try {
        await updateDoc(doc(db, "employees", myEmployeeDocId), updates);
    } catch(e) { alert("Erreur de pointage : " + e.message); }
};

/* ==================== ANNONCES ==================== */
let unsubscribeAnn = null;

window.postAnnouncement = async function() {
    const title = document.getElementById("annTitle").value;
    const content = document.getElementById("annContent").value;
    const msg = document.getElementById("annMsg");
    if(!title || !content) { msg.innerText = "Remplis tout !"; return; }
    msg.innerText = "Publication...";
    try {
        await addDoc(collection(db, "announcements"), { title: title, content: content, author: window.currentUserName, createdAt: new Date().toISOString() });
        msg.innerText = "✅ Publié !"; document.getElementById("annTitle").value = ""; document.getElementById("annContent").value = "";
    } catch(e) { msg.innerText = "Erreur: " + e.message; }
};

window.fetchAnnouncements = function() {
    const homeGrid = document.getElementById("homeAnnouncementsGrid");
    if(!homeGrid || unsubscribeAnn) return; 
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    unsubscribeAnn = onSnapshot(q, (snapshot) => {
        let html = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const dateStr = new Date(data.createdAt).toLocaleDateString('fr-FR');
            let deleteBtn = "";
            if(window.currentUserRole === 'admin' || window.currentUserRole === 'rh') {
                deleteBtn = `<span class="ann-delete" onclick="window.deleteAnnouncement('${docSnap.id}')">❌ Supprimer</span>`;
            }
            html += `<div class="ann-card"><h4 class="ann-title">${data.title}</h4><p class="ann-content">${data.content}</p><div class="ann-footer"><span>Par ${data.author} le ${dateStr}</span>${deleteBtn}</div></div>`;
        });
        homeGrid.innerHTML = html || "<p style='color:var(--subtext);'>Aucune annonce.</p>";
    });
};

window.deleteAnnouncement = async function(id) { if(confirm("Supprimer cette annonce ?")) await deleteDoc(doc(db, "announcements", id)); };


/* ==================== RESSOURCES HUMAINES ==================== */
let unsubscribeEmployees = null;
let hrLiveTimer = null; 

window.openNewEmployeeModal = function() { document.getElementById("newEmployeeModal").classList.remove("hidden"); };
window.closeNewEmployeeModal = function() { document.getElementById("newEmployeeModal").classList.add("hidden"); };

window.saveNewEmployee = async function() {
    const name = document.getElementById("ne_name").value;
    const email = document.getElementById("ne_email").value; // NOUVEAU
    const grade = document.getElementById("ne_grade").value;
    const phone = document.getElementById("ne_phone").value;
    const salary = document.getElementById("ne_salary").value;
    const msg = document.getElementById("ne_msg");

    if(!name || !grade) { msg.innerText = "Nom et Grade obligatoires !"; return; }
    msg.innerText = "Création...";

    try {
        await addDoc(collection(db, "employees"), {
            name: name,
            email: email, // NOUVEAU
            grade: grade,
            phone: phone || "Non renseigné",
            salary: salary || "Non défini",
            status: "hors_service", 
            totalServiceSeconds: 0, 
            currentServiceStart: null, 
            hiredDate: new Date().toISOString().split('T')[0],
            hrNotes: ""
        });
        msg.innerText = "✅ Dossier Créé !"; msg.style.color = "var(--success)";
        setTimeout(() => { closeNewEmployeeModal(); document.getElementById("ne_name").value = ""; document.getElementById("ne_email").value = ""; msg.innerText = ""; }, 1000);
    } catch(e) { msg.innerText = "Erreur: " + e.message; }
};

window.fetchEmployees = function() {
    const tbody = document.getElementById("employeeListBody");
    if(!tbody || unsubscribeEmployees) return; 
    tbody.innerHTML = "<tr><td colspan='4'>Chargement... 📡</td></tr>";
    unsubscribeEmployees = onSnapshot(collection(db, "employees"), (snapshot) => {
        let html = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            let badgeHtml = "";
            if(data.status === 'en_service') badgeHtml = `<span class="status-badge status-en_service">🟢 En service</span>`;
            else if(data.status === 'absent') badgeHtml = `<span class="status-badge status-absent">🔴 Absent/Malade</span>`;
            else if(data.status === 'vacation') badgeHtml = `<span class="status-badge status-vacation">🟠 En congés</span>`;
            else badgeHtml = `<span class="status-badge status-hors_service">⚪ Hors service</span>`;

            html += `<tr><td>${badgeHtml}</td><td><span class="clickable-name" onclick="window.openHrEmployeeModal('${docSnap.id}')">${data.name}</span></td><td><span style="color:#facc15;">${data.grade}</span></td><td>${data.phone || "-"}</td></tr>`;
        });
        tbody.innerHTML = html || "<tr><td colspan='4'>Aucun dossier.</td></tr>";
    });
};

window.openHrEmployeeModal = async function(id) {
    const modal = document.getElementById("hrEmployeeModal");
    if(!modal) return;
    if(hrLiveTimer) clearInterval(hrLiveTimer);
    document.getElementById("hre_name").innerText = "Chargement...";
    modal.classList.remove("hidden");
    
    try {
        const docSnap = await getDoc(doc(db, "employees", id));
        if(docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("hre_id").value = id;
            document.getElementById("hre_name").innerText = data.name;
            document.getElementById("hre_email").value = data.email || ""; // NOUVEAU
            document.getElementById("hre_grade").innerText = data.grade;
            document.getElementById("hre_phone").innerText = data.phone || "N/A";
            document.getElementById("hre_salary").innerText = data.salary || "N/A";
            document.getElementById("hre_date").innerText = data.hiredDate || "N/A";
            document.getElementById("hre_status").value = data.status || "hors_service";
            document.getElementById("hre_notes").value = data.hrNotes || "";

            document.getElementById("hre_old_status").value = data.status || "hors_service";
            document.getElementById("hre_total_seconds").value = data.totalServiceSeconds || 0;
            document.getElementById("hre_current_start").value = data.currentServiceStart || "";

            let baseSeconds = data.totalServiceSeconds || 0;
            let startTimestamp = data.currentServiceStart;

            const updateTimerDisplay = () => {
                let currentSeconds = baseSeconds;
                if (data.status === 'en_service' && startTimestamp) { currentSeconds += Math.floor((Date.now() - startTimestamp) / 1000); }
                document.getElementById("hre_service_time").innerText = formatTime(currentSeconds);
            };

            updateTimerDisplay();
            if (data.status === 'en_service') { hrLiveTimer = setInterval(updateTimerDisplay, 60000); }
        }
    } catch(e) { alert("Erreur: " + e.message); }
};

window.closeHrEmployeeModal = function() { 
    if(hrLiveTimer) clearInterval(hrLiveTimer);
    document.getElementById("hrEmployeeModal").classList.add("hidden"); 
};

window.updateEmployeeDossier = async function() {
    const id = document.getElementById("hre_id").value;
    const newStatus = document.getElementById("hre_status").value;
    const newEmail = document.getElementById("hre_email").value; // NOUVEAU
    const newNotes = document.getElementById("hre_notes").value;

    const oldStatus = document.getElementById("hre_old_status").value;
    let totalSeconds = parseInt(document.getElementById("hre_total_seconds").value) || 0;
    let currentStart = document.getElementById("hre_current_start").value;

    let updates = { status: newStatus, email: newEmail, hrNotes: newNotes };

    if (oldStatus !== 'en_service' && newStatus === 'en_service') { updates.currentServiceStart = Date.now(); } 
    else if (oldStatus === 'en_service' && newStatus !== 'en_service') {
        if (currentStart) { updates.totalServiceSeconds = totalSeconds + Math.floor((Date.now() - parseInt(currentStart)) / 1000); }
        updates.currentServiceStart = null; 
    }
    
    try { await updateDoc(doc(db, "employees", id), updates); closeHrEmployeeModal(); } 
    catch(e) { alert("Erreur de sauvegarde: " + e.message); }
};

window.deleteEmployeeDossier = async function() {
    const id = document.getElementById("hre_id").value;
    if(!confirm("⚠️ Virer cet employé ?")) return;
    try { await deleteDoc(doc(db, "employees", id)); closeHrEmployeeModal(); } catch(e) {}
};

window.searchRH = function() {
  const input = document.getElementById("rhSearch");
  const filter = input.value.toUpperCase();
  const tr = document.getElementById("rhTable").getElementsByTagName("tr");
  for (let i = 1; i < tr.length; i++) {
    let visible = false;
    const tds = tr[i].getElementsByTagName("td");
    for(let j=0; j < tds.length; j++) { if(tds[j] && tds[j].textContent.toUpperCase().indexOf(filter) > -1) { visible = true; break; } }
    tr[i].style.display = visible ? "" : "none";
  }
};


/* ==================== UTILISATEURS ==================== */
let unsubscribeUsers = null;

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
        await setDoc(doc(db, "users", cred.user.uid), { email: email, role: role, createdAt: new Date().toISOString().split('T')[0], displayName: "En attente", photoURL: "" });
        await signOut(secondaryAuth);
        msg.innerText = `✅ Ajouté !`; msg.style.color = "var(--success)";
    } catch (error) { msg.innerText = "Erreur: " + error.message; }
};

window.fetchUsers = function() {
  const tbody = document.getElementById("userListBody");
  if(!tbody || unsubscribeUsers) return;
  tbody.innerHTML = "<tr><td colspan='4'>Chargement... 📡</td></tr>";
  unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      let html = "";
      snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const uid = docSnap.id;
          const roleSelect = `
            <select onchange="window.updateUserRole('${uid}', this.value)" style="background:var(--panel); color:var(--text); border:1px solid var(--border); padding:5px; border-radius:5px;">
                <option value="guest" ${(!data.role || data.role === 'guest') ? 'selected' : ''}>⛔ Aucun accès</option>
                <option value="employee" ${data.role === 'employee' ? 'selected' : ''}>👷 Employé</option>
                <option value="admin" ${data.role === 'admin' ? 'selected' : ''}>👑 Admin</option>
                <option value="rh" ${data.role === 'rh' ? 'selected' : ''}>🤝 RH</option>
                <option value="compta" ${data.role === 'compta' ? 'selected' : ''}>📊 Compta</option>
            </select>`;
          html += `<tr>
            <td><div onclick="window.openUserProfile('${uid}')" class="clickable-name">${data.displayName || "Sans nom"}</div><div style="font-size:0.8em; color:var(--subtext);">${data.email}</div></td>
            <td>${roleSelect}</td>
            <td>${data.createdAt || "-"}</td>
            <td><button onclick="window.deleteUser('${uid}')" style="background:#ef4444; width:auto; padding:5px 10px; font-size:0.8em;">🗑️</button></td>
          </tr>`;
      });
      tbody.innerHTML = html;
  });
};

window.updateUserRole = async function(uid, newRole) { try { await updateDoc(doc(db, "users", uid), { role: newRole }); } catch (e) { alert("Erreur: " + e.message); } };
window.deleteUser = async function(uid) {
    if (auth.currentUser && auth.currentUser.uid === uid) return alert("Utilise les Paramètres.");
    if(confirm("⚠️ EXCLURE définitivement cette personne ?")) { await deleteDoc(doc(db, "users", uid)); }
};

window.openUserProfile = async function(uid) {
    const modal = document.getElementById("profileModal");
    if(!modal) return;
    modal.classList.remove("hidden");
    document.getElementById("m_name").innerText = "Chargement...";
    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if(userDoc.exists()) {
            const data = userDoc.data();
            document.getElementById("m_name").innerText = data.displayName || "Sans nom";
            document.getElementById("m_email").innerText = data.email || "Pas d'email";
            document.getElementById("m_photo").src = data.photoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
            
            let roleText = "Invité";
            if(data.role === 'admin') roleText = "👑 Admin";
            if(data.role === 'rh') roleText = "🤝 RH";
            if(data.role === 'employee') roleText = "👷 Employé";
            if(data.role === 'compta') roleText = "📊 Compta";
            document.getElementById("m_role").innerText = roleText;
        }
    } catch(e) {}
};
window.closeUserProfile = function() { document.getElementById("profileModal").classList.add("hidden"); };


/* ==================== AUTRES ==================== */
let unsubscribeDocs = null;
window.createAdminDoc = async function() {
    const title = document.getElementById("docTitle").value;
    const content = document.getElementById("docContent").value;
    const msg = document.getElementById("docMsg");
    if(!title || !content) return;
    try {
        await addDoc(collection(db, "admin_docs"), { title: title, content: content, createdAt: new Date().toISOString() });
        msg.innerText = "✅ Sauvegardé !"; document.getElementById("docTitle").value = ""; document.getElementById("docContent").value = "";
    } catch(e) {}
};

window.fetchAdminDocs = function() {
    const container = document.getElementById("docsGrid");
    if(!container || unsubscribeDocs) return; 
    unsubscribeDocs = onSnapshot(query(collection(db, "admin_docs"), orderBy("createdAt", "desc")), (snapshot) => {
        let html = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            html += `<div class="doc-card"><div class="doc-icon">📁</div><h4>${data.title}</h4><p>${data.content}</p><button onclick="window.deleteAdminDoc('${docSnap.id}')" class="delete-doc-btn">Supprimer</button></div>`;
        });
        container.innerHTML = html || "<p>Aucun document.</p>";
    });
};
window.deleteAdminDoc = async function(id) { if(confirm("Supprimer ?")) await deleteDoc(doc(db, "admin_docs", id)); };

window.toggleTheme = function() {
    const body = document.body;
    body.classList.toggle('light-mode');
    const btn = document.getElementById('themeBtn');
    if(body.classList.contains('light-mode')) { localStorage.setItem('theme', 'light'); if(btn) btn.innerText = "🌙 Mode Sombre"; } 
    else { localStorage.setItem('theme', 'dark'); if(btn) btn.innerText = "☀️ Mode Clair"; }
};

window.saveProfileSettings = async function() {
    const newName = document.getElementById("settingsDisplayName").value;
    const newPhotoURL = document.getElementById("settingsPhotoURL").value;
    const user = auth.currentUser;
    if (!user || !newName) return;
    try {
        await setDoc(doc(db, "users", user.uid), { displayName: newName, photoURL: newPhotoURL || "" }, { merge: true });
        document.getElementById("settingsMsg").innerText = "✅ Sauvegardé !"; 
        document.getElementById("sidebarUserName").innerText = newName;
    } catch (error) {}
};

window.deleteMyAccount = async function() {
    const user = auth.currentUser;
    if (!user) return;
    if (!confirm("⚠️ DÉFINITIF.\nVeux-tu continuer ?") || !confirm("Vraiment sûr ?")) return;
    try { await deleteDoc(doc(db, "users", user.uid)); await deleteUser(user); window.location.reload(); } 
    catch (error) { if (error.code === 'auth/requires-recent-login') { alert("🔒 Reconnecte-toi d'abord."); await signOut(auth); } }
};

window.updateDashboardStats = async function() {
    setInterval(() => {
        const now = new Date();
        document.getElementById("statDate").innerText = now.toLocaleDateString('fr-FR');
        document.getElementById("statTime").innerText = now.toLocaleTimeString('fr-FR');
    }, 1000);
    try {
        const snapEmp = await getDocs(collection(db, "employees"));
        document.getElementById("statEmployees").innerText = snapEmp.size;
        const snapUsers = await getDocs(collection(db, "users"));
        document.getElementById("statUsers").innerText = snapUsers.size;
    } catch (e) { }
};

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
    let data = await response.text();
    const rows = data.split(/\r?\n/).map(row => row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, '').trim()));
    const cleanRows = rows.slice(0); // Simplifié pour éviter erreurs
    let html = "<thead><tr>";
    cleanRows[0].forEach(cell => { html += `<th>${cell || "."}</th>`; });
    html += "</tr></thead><tbody>";
    for (let i = 1; i < cleanRows.length; i++) {
        if (cleanRows[i].length > 1 && cleanRows[i][0] !== "") {
            html += "<tr>";
            cleanRows[0].forEach((_, j) => { html += `<td>${cleanRows[i][j] || ""}</td>`; });
            html += "</tr>";
        }
    }
    table.innerHTML = html + "</tbody>";
  } catch (error) { table.innerHTML = `<tr><td style='color:#ff4f4f;'>❌ Erreur lecture CSV.</td></tr>`; }
};
window.searchTable = function() {
  const filter = document.getElementById("tableSearch").value.toUpperCase();
  const tr = document.getElementById("sheetTable").getElementsByTagName("tr");
  for (let i = 1; i < tr.length; i++) {
    let visible = false;
    const tds = tr[i].getElementsByTagName("td");
    for(let j=0; j < tds.length; j++) { if(tds[j] && tds[j].textContent.toUpperCase().indexOf(filter) > -1) { visible = true; break; } }
    tr[i].style.display = visible ? "" : "none";
  }
};
