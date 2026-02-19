import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, deleteUser } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, addDoc, deleteDoc, updateDoc, collection, getDocs, query, where, onSnapshot, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ==================== 1. CONFIGURATION FIREBASE ==================== */
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

/* INIT THEME */
if (localStorage.getItem('theme') === 'light') { 
    document.body.classList.add('light-mode'); 
    document.getElementById('themeBtn').innerText = "🌙 Mode Sombre"; 
}

/* ==================== 2. AUTHENTIFICATION & NAVIGATION ==================== */
window.login = async function() { 
    try { await signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value); } 
    catch(e){ document.getElementById("error").innerText = "❌ Erreur de connexion";} 
};

window.loginWithGoogle = async function() { 
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } 
    catch(e){ document.getElementById("error").innerText = "❌ Erreur Google";} 
};

window.logout = function() { 
    signOut(auth).then(() => window.location.reload()); 
};

window.showSection = function(id) {
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById(id)?.classList.add("active");
  
    if(id === 'home') { window.updateDashboardStats(); window.fetchAnnouncements(); }
    if(id === 'users') window.fetchUsers();
    if(id === 'rh') { window.fetchEmployees(); window.fetchAnnouncements(); }
    if(id === 'compta') window.toggleCompta('data');
    if(id === 'docs') window.fetchAdminDocs(); 
    if(id === 'service') window.loadMyService(); 
    if(id === 'requests') window.fetchRequests(); 
    if(id === 'chat') window.fetchChatMessages(); 
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
    }
});

/* ==================== 3. GESTION DES PROFILS & PERMISSIONS ==================== */
async function loadUserProfile(user) {
    try {
        const docRef = doc(db, "users", user.uid);
        let docSnap = await getDoc(docRef);

        // Forcer le Super Admin
        if (user.email === SUPER_ADMIN && (!docSnap.exists() || docSnap.data().role !== 'admin')) {
            await setDoc(docRef, { email: user.email, role: 'admin', displayName: "Le Boss", photoURL: "", createdAt: new Date().toISOString().split('T')[0] }, { merge: true });
            location.reload(); return;
        }

        // Fusionner si connexion Google
        if (!docSnap.exists()) {
            const q = await getDocs(query(collection(db, "users"), where("email", "==", user.email)));
            if (!q.empty) {
                await setDoc(docRef, { ...q.docs[0].data(), displayName: user.displayName, photoURL: user.photoURL, uid: user.uid });
                await deleteDoc(q.docs[0].ref);
            } else {
                await setDoc(docRef, { email: user.email, displayName: user.displayName, photoURL: user.photoURL, role: 'guest', createdAt: new Date().toISOString().split('T')[0] });
            }
            docSnap = await getDoc(docRef);
        }

        const data = docSnap.data();
        document.getElementById("sidebarUserName").innerText = data.displayName || "Utilisateur";
        document.getElementById("sidebarUserImg").src = data.photoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
        
        window.currentUserRole = data.role;
        window.currentUserName = data.displayName || "Utilisateur";
        window.currentUserEmail = data.email;
        
        applyPermissions(data.role);
    } catch (e) { console.error(e); }
}

function applyPermissions(role) {
    const menusToHide = ["btn-users", "btn-rh", "btn-compta", "btn-docs", "btn-service", "btn-requests", "btn-chat", "mainStatsGrid", "admin-title-menu", "perso-title-menu", "thActionsReq", "employeeRequestBox"];
    menusToHide.forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.display = "none"; });
    
    const homeMsg = document.querySelector(".home-header p");

    if(role === 'admin') {
        menusToHide.forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.display = ""; });
        document.getElementById("employeeRequestBox").style.display = "none"; 
        if(homeMsg) homeMsg.innerText = "Voici l'état actuel de ton entreprise.";
    } 
    else if(role === 'employee') {
        ["btn-service", "btn-requests", "btn-chat", "perso-title-menu", "employeeRequestBox"].forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.display = ""; });
        if(homeMsg) homeMsg.innerText = "N'oublie pas de pointer pour commencer ta journée.";
    } 
    else if(role === 'rh') {
        ["btn-rh", "btn-service", "btn-requests", "btn-chat", "perso-title-menu", "admin-title-menu", "thActionsReq", "employeeRequestBox"].forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.display = ""; });
        if(homeMsg) homeMsg.innerText = "Sélectionne un menu pour travailler.";
    } 
    else if(role === 'compta') {
        ["btn-compta", "btn-chat", "perso-title-menu", "admin-title-menu"].forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.display = ""; });
        if(homeMsg) homeMsg.innerText = "Sélectionne un menu pour travailler.";
    }
    else {
        if(homeMsg) homeMsg.innerText = "⛔ Ton compte n'a pas encore d'accès. Demande à ton Boss.";
    }
}

function formatTime(totalSeconds) { 
    const h = Math.floor(totalSeconds / 3600); 
    const m = Math.floor((totalSeconds % 3600) / 60); 
    return `${h}h ${m}m`; 
}

/* ==================== 4. GESTION DES UTILISATEURS (COMPTES) ==================== */
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
          const r = data.role;

          const roleSelect = `
            <select onchange="window.updateUserRole('${uid}', this.value)" style="background:var(--panel); color:var(--text); border:1px solid var(--border); padding:5px; border-radius:5px;">
                <option value="guest" ${(!r || r === 'guest') ? 'selected' : ''}>⛔ Aucun accès</option>
                <option value="employee" ${r === 'employee' ? 'selected' : ''}>👷 Employé</option>
                <option value="rh" ${r === 'rh' ? 'selected' : ''}>🤝 RH</option>
                <option value="compta" ${r === 'compta' ? 'selected' : ''}>📊 Compta</option>
                <option value="admin" ${r === 'admin' ? 'selected' : ''}>👑 Admin</option>
            </select>`;

          html += `<tr>
            <td>
                <div onclick="window.openUserProfile('${uid}')" class="clickable-name">${data.displayName || "Sans nom"}</div>
                <div style="font-size:0.8em; color:var(--subtext);">${data.email}</div>
            </td>
            <td>${roleSelect}</td>
            <td>${data.createdAt || "-"}</td>
            <td>
                <button onclick="window.deleteUser('${uid}')" style="background:#ef4444; width:auto; padding:5px 10px; font-size:0.8em; color:white; border:none; border-radius:5px;">🗑️ Exclure</button>
            </td>
          </tr>`;
      });
      tbody.innerHTML = html;
  });
};

window.updateUserRole = async function(uid, newRole) { 
    try { await updateDoc(doc(db, "users", uid), { role: newRole }); } 
    catch (e) { alert("Erreur: " + e.message); } 
};

window.deleteUser = async function(uid) {
    if (auth.currentUser && auth.currentUser.uid === uid) return alert("Utilise les Paramètres.");
    if(confirm("⚠️ EXCLURE définitivement cette personne ?")) { await deleteDoc(doc(db, "users", uid)); }
};

window.openUserProfile = async function(uid) {
    document.getElementById("profileModal").classList.remove("hidden"); 
    const d = await getDoc(doc(db, "users", uid)); 
    if(d.exists()) { 
        document.getElementById("m_name").innerText = d.data().displayName || "Sans nom"; 
        document.getElementById("m_email").innerText = d.data().email; 
        
        let roleText = "Invité";
        if(d.data().role === 'admin') roleText = "👑 Admin";
        if(d.data().role === 'rh') roleText = "🤝 RH";
        if(d.data().role === 'employee') roleText = "👷 Employé";
        if(d.data().role === 'compta') roleText = "📊 Compta";
        
        document.getElementById("m_role").innerText = roleText; 
        document.getElementById("m_photo").src = d.data().photoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    } 
};
window.closeUserProfile = () => document.getElementById("profileModal").classList.add("hidden");


/* ==================== 5. POINTAGE (MON SERVICE EMPLOYE) ==================== */
let myPersonalTimer = null;
let myEmployeeDocId = null;

window.loadMyService = async function() {
    const user = auth.currentUser;
    if (!user) return;
    const container = document.getElementById("myServiceContainer");
    
    const snap = await getDocs(query(collection(db, "employees"), where("email", "==", user.email)));
    
    if (snap.empty) { 
        container.innerHTML = `<div class="pointage-card"><h3 style="color:var(--error);">⚠️ Dossier introuvable</h3><p>Aucun dossier RH relié à <b>${user.email}</b>.</p></div>`; 
        return; 
    }
    
    myEmployeeDocId = snap.docs[0].id;
    
    onSnapshot(doc(db, "employees", myEmployeeDocId), (docSnap) => { 
        if(docSnap.exists()) renderMyServiceUI(docSnap.data()); 
    });
};

function renderMyServiceUI(data) {
    if(myPersonalTimer) clearInterval(myPersonalTimer);
    
    let isEnService = data.status === 'en_service';
    let statusText = isEnService ? `<span class="status-badge status-en_service" style="font-size:1em;">🟢 EN SERVICE</span>` : `<span class="status-badge status-hors_service" style="font-size:1em;">⚪ HORS SERVICE</span>`;
    let buttonHtml = isEnService ? `<button class="btn-clock-out" onclick="toggleMyService('hors_service')">🔴 Terminer mon service</button>` : `<button class="btn-clock-in" onclick="toggleMyService('en_service')">🟢 Prendre mon service</button>`;

    document.getElementById("myServiceContainer").innerHTML = `
        <div class="pointage-card">
            <h2 style="margin-top:0;">${data.name}</h2>
            <p style="color:var(--subtext); margin-bottom: 20px;">${data.grade}</p>
            <div style="margin-bottom: 30px;">${statusText}</div>
            <p style="color:var(--subtext); margin:0;">Temps de service total :</p>
            <div id="my_live_clock" class="live-clock">0h 0m</div>
            ${buttonHtml}
        </div>`;

    let baseSeconds = data.totalServiceSeconds || 0;
    
    const updateMyTimer = () => {
        let currentSecs = baseSeconds;
        if (isEnService && data.currentServiceStart) {
            currentSecs += Math.floor((Date.now() - data.currentServiceStart) / 1000);
        }
        if(document.getElementById("my_live_clock")) {
            document.getElementById("my_live_clock").innerText = formatTime(currentSecs);
        }
    };
    
    updateMyTimer();
    
    if (isEnService) {
        myPersonalTimer = setInterval(updateMyTimer, 60000);
    }
}

window.toggleMyService = async function(newStatus) {
    if(!myEmployeeDocId) return;
    const docSnap = await getDoc(doc(db, "employees", myEmployeeDocId));
    const data = docSnap.data();
    let updates = { status: newStatus };

    if (data.status !== 'en_service' && newStatus === 'en_service') {
        updates.currentServiceStart = Date.now();
    } else if (data.status === 'en_service' && newStatus !== 'en_service') {
        const durationSecs = Math.floor((Date.now() - data.currentServiceStart) / 1000);
        updates.totalServiceSeconds = (data.totalServiceSeconds || 0) + durationSecs;
        updates.currentServiceStart = null; 
        
        // SAUVEGARDE HISTORIQUE (POINTEUSE)
        await addDoc(collection(db, "timelogs"), {
            employeeId: myEmployeeDocId,
            date: new Date().toLocaleDateString('fr-FR'),
            startTime: data.currentServiceStart,
            endTime: Date.now(),
            durationText: formatTime(durationSecs)
        });
    }
    await updateDoc(doc(db, "employees", myEmployeeDocId), updates);
};


/* ==================== 6. DEMANDES ET CONGÉS ==================== */
window.submitRequest = async function() {
    const type = document.getElementById("reqType").value;
    const dates = document.getElementById("reqDates").value;
    const motif = document.getElementById("reqMotif").value;
    const msg = document.getElementById("reqMsg");
    if(!dates || !motif) { msg.innerText = "Remplis tout !"; return; }

    try {
        await addDoc(collection(db, "requests"), {
            employeeName: window.currentUserName,
            employeeEmail: window.currentUserEmail,
            type: type,
            dates: dates,
            motif: motif,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        msg.innerText = "✅ Demande envoyée !"; msg.style.color = "var(--success)";
        document.getElementById("reqDates").value = ""; 
        document.getElementById("reqMotif").value = "";
    } catch(e) { msg.innerText = "Erreur."; }
};

let unsubReq = null;
window.fetchRequests = function() {
    if(unsubReq) return;
    unsubReq = onSnapshot(query(collection(db, "requests"), orderBy("createdAt", "desc")), (snapshot) => {
        let html = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const dateStr = new Date(data.createdAt).toLocaleDateString('fr-FR');
            
            // L'employé ne voit que ses propres demandes
            if(window.currentUserRole === 'employee' && data.employeeEmail !== window.currentUserEmail) return;

            let badge = `<span class="status-badge status-pending">⏳ En attente</span>`;
            if(data.status === 'approved') badge = `<span class="status-badge status-en_service">✅ Approuvé</span>`;
            if(data.status === 'rejected') badge = `<span class="status-badge status-absent">❌ Refusé</span>`;

            let actions = "-";
            if(data.status === 'pending' && (window.currentUserRole === 'admin' || window.currentUserRole === 'rh')) {
                actions = `<button onclick="updateRequest('${docSnap.id}', 'approved', '${data.employeeEmail}', '${data.type}')" style="background:var(--success); padding:5px; width:auto; font-size:0.8em; margin-right:5px; color:white; border:none; border-radius:3px;">✔️</button>
                           <button onclick="updateRequest('${docSnap.id}', 'rejected', null, null)" style="background:var(--error); padding:5px; width:auto; font-size:0.8em; color:white; border:none; border-radius:3px;">❌</button>`;
            }

            html += `<tr>
                <td>${dateStr}</td>
                <td><b>${data.employeeName}</b></td>
                <td><span style="color:var(--accent); font-weight:bold;">${data.type}</span><br><small>${data.dates}</small><br><i>"${data.motif}"</i></td>
                <td>${badge}</td>
                ${window.currentUserRole !== 'employee' ? `<td>${actions}</td>` : ''}
            </tr>`;
        });
        document.getElementById("requestsListBody").innerHTML = html || "<tr><td colspan='5'>Aucune demande.</td></tr>";
    });
};

window.updateRequest = async function(reqId, newStatus, empEmail, reqType) {
    await updateDoc(doc(db, "requests", reqId), { status: newStatus });
    
    // Si approuvé et que c'est des vacances, on met le dossier à jour
    if(newStatus === 'approved' && reqType === 'Vacances' && empEmail) {
        const snap = await getDocs(query(collection(db, "employees"), where("email", "==", empEmail)));
        if(!snap.empty) {
            await updateDoc(doc(db, "employees", snap.docs[0].id), { status: 'vacation' });
            alert("Requête approuvée. Employé mis en statut 'Congés'.");
        }
    }
};


/* ==================== 7. MACHINE A CAFE (TCHAT) ==================== */
let unsubChat = null;

window.sendChatMessage = async function() {
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if(!text) return;
    try {
        await addDoc(collection(db, "messages"), {
            text: text,
            authorName: window.currentUserName,
            authorEmail: window.currentUserEmail,
            createdAt: serverTimestamp() 
        });
        input.value = "";
    } catch(e) { alert("Erreur chat"); }
};

window.handleChatKeyPress = function(e) { 
    if(e.key === 'Enter') sendChatMessage(); 
};

window.fetchChatMessages = function() {
    if(unsubChat) return;
    unsubChat = onSnapshot(query(collection(db, "messages"), orderBy("createdAt", "asc")), (snapshot) => {
        const container = document.getElementById("chatMessages");
        let html = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const isMine = data.authorEmail === window.currentUserEmail;
            const alignClass = isMine ? 'mine' : 'other';
            let timeStr = "";
            
            if(data.createdAt) {
                timeStr = new Date(data.createdAt.toMillis()).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
            }
            
            html += `
            <div class="chat-row ${alignClass}">
                <div class="chat-meta"><b>${isMine ? 'Moi' : data.authorName}</b> • ${timeStr}</div>
                <div class="chat-bubble">${data.text}</div>
            </div>`;
        });
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight; // Scroll en bas automatique
    });
};


/* ==================== 8. RESSOURCES HUMAINES & DOSSIERS ==================== */
window.postAnnouncement = async function() {
    const title = document.getElementById("annTitle").value;
    const content = document.getElementById("annContent").value;
    if(!title || !content) return;
    await addDoc(collection(db, "announcements"), { 
        title, content, author: window.currentUserName, createdAt: new Date().toISOString() 
    });
    document.getElementById("annTitle").value = ""; 
    document.getElementById("annContent").value = "";
};

window.fetchAnnouncements = function() {
    onSnapshot(query(collection(db, "announcements"), orderBy("createdAt", "desc")), (snap) => {
        let html = "";
        snap.forEach((d) => { 
            let deleteHTML = "";
            if(window.currentUserRole === 'admin') {
                deleteHTML = `<span class="ann-delete" onclick="deleteDoc(doc(db, 'announcements', '${d.id}'))">❌</span>`;
            }
            html += `
            <div class="ann-card">
                <h4 class="ann-title">${d.data().title}</h4>
                <p class="ann-content">${d.data().content}</p>
                <div class="ann-footer"><span>Par ${d.data().author}</span>${deleteHTML}</div>
            </div>`; 
        });
        if(document.getElementById("homeAnnouncementsGrid")) document.getElementById("homeAnnouncementsGrid").innerHTML = html;
    });
};

window.openNewEmployeeModal = () => document.getElementById("newEmployeeModal").classList.remove("hidden");
window.closeNewEmployeeModal = () => document.getElementById("newEmployeeModal").classList.add("hidden");
window.closeHrEmployeeModal = () => document.getElementById("hrEmployeeModal").classList.add("hidden");

window.saveNewEmployee = async function() {
    await addDoc(collection(db, "employees"), {
        name: document.getElementById("ne_name").value, 
        email: document.getElementById("ne_email").value,
        grade: document.getElementById("ne_grade").value, 
        phone: document.getElementById("ne_phone").value,
        salary: document.getElementById("ne_salary").value, 
        status: "hors_service", 
        totalServiceSeconds: 0,
        currentServiceStart: null, 
        hiredDate: new Date().toISOString().split('T')[0], 
        hrNotes: ""
    });
    closeNewEmployeeModal();
    document.getElementById("ne_name").value = ""; 
    document.getElementById("ne_email").value = ""; 
    document.getElementById("ne_grade").value = "";
};

let unsubscribeEmployees = null;
window.fetchEmployees = function() {
    if(unsubscribeEmployees) return;
    unsubscribeEmployees = onSnapshot(collection(db, "employees"), (snap) => {
        let html = "";
        snap.forEach((d) => {
            const dt = d.data();
            let b = `<span class="status-badge status-hors_service">⚪ Hors service</span>`;
            if(dt.status === 'en_service') b = `<span class="status-badge status-en_service">🟢 En service</span>`;
            if(dt.status === 'absent') b = `<span class="status-badge status-absent">🔴 Absent</span>`;
            if(dt.status === 'vacation') b = `<span class="status-badge status-vacation">🟠 Congés</span>`;
            
            html += `<tr>
                <td>${b}</td>
                <td><span class="clickable-name" onclick="window.openHrEmployeeModal('${d.id}')">${dt.name}</span></td>
                <td><span style="color:#facc15;">${dt.grade}</span></td>
                <td>${dt.phone}</td>
            </tr>`;
        });
        if(document.getElementById("employeeListBody")) document.getElementById("employeeListBody").innerHTML = html || "<tr><td colspan='4'>Aucun dossier.</td></tr>";
    });
};

window.openHrEmployeeModal = async function(id) {
    const modal = document.getElementById("hrEmployeeModal");
    modal.classList.remove("hidden");
    const docSnap = await getDoc(doc(db, "employees", id));
    const data = docSnap.data();
    
    document.getElementById("hre_id").value = id;
    document.getElementById("hre_name").innerText = data.name;
    document.getElementById("hre_email").value = data.email || ""; 
    document.getElementById("hre_grade").innerText = data.grade;
    document.getElementById("hre_phone").innerText = data.phone || "N/A";
    document.getElementById("hre_salary").innerText = data.salary || "N/A";
    document.getElementById("hre_date").innerText = data.hiredDate || "N/A";
    document.getElementById("hre_status").value = data.status || "hors_service";
    document.getElementById("hre_notes").value = data.hrNotes || "";
    document.getElementById("hre_service_time").innerText = formatTime(data.totalServiceSeconds || 0);

    // CHARGEMENT DE L'HISTORIQUE DE CE MEC
    const logSnap = await getDocs(query(collection(db, "timelogs"), where("employeeId", "==", id)));
    let logHtml = "";
    if(logSnap.empty) {
        logHtml = "<p style='color:var(--subtext);'>Aucun pointage enregistré.</p>";
    } else {
        logSnap.forEach(l => {
            const d = l.data();
            const startStr = new Date(d.startTime).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
            const endStr = new Date(d.endTime).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
            logHtml += `<div style="border-bottom:1px solid rgba(255,255,255,0.05); padding:5px 0;"><b>${d.date}</b> : De ${startStr} à ${endStr} <i style="color:var(--accent);"> (+${d.durationText})</i></div>`;
        });
    }
    document.getElementById("hre_timelogs").innerHTML = logHtml;
};

window.updateEmployeeDossier = async function() {
    await updateDoc(doc(db, "employees", document.getElementById("hre_id").value), {
        status: document.getElementById("hre_status").value, 
        email: document.getElementById("hre_email").value, 
        hrNotes: document.getElementById("hre_notes").value
    });
    closeHrEmployeeModal();
};

window.deleteEmployeeDossier = async function() { 
    if(confirm("Virer ?")) { 
        await deleteDoc(doc(db, "employees", document.getElementById("hre_id").value)); 
        closeHrEmployeeModal(); 
    } 
};

window.searchRH = () => { 
    const f = document.getElementById("rhSearch").value.toUpperCase(); 
    const tr = document.getElementById("rhTable").getElementsByTagName("tr"); 
    for(let i=1; i<tr.length; i++) { 
        tr[i].style.display = Array.from(tr[i].getElementsByTagName("td")).some(td => td.textContent.toUpperCase().includes(f)) ? "" : "none"; 
    } 
};


/* ==================== 9. AUTRES (DOCS / COMPTA / PARAMETRES) ==================== */
let unsubscribeDocs = null;
window.createAdminDoc = async function() {
    const title = document.getElementById("docTitle").value;
    const content = document.getElementById("docContent").value;
    if(!title || !content) return;
    try {
        await addDoc(collection(db, "admin_docs"), { title: title, content: content, createdAt: new Date().toISOString() });
        document.getElementById("docMsg").innerText = "✅ Sauvegardé !"; 
        document.getElementById("docTitle").value = ""; 
        document.getElementById("docContent").value = "";
    } catch(e) {}
};

window.fetchAdminDocs = function() {
    const container = document.getElementById("docsGrid");
    if(!container || unsubscribeDocs) return; 
    unsubscribeDocs = onSnapshot(query(collection(db, "admin_docs"), orderBy("createdAt", "desc")), (snapshot) => {
        let html = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            html += `
            <div class="doc-card">
                <div class="doc-icon">📁</div>
                <h4>${data.title}</h4>
                <p>${data.content}</p>
                <button onclick="deleteDoc(doc(db,'admin_docs','${docSnap.id}'))" class="delete-doc-btn">Supprimer</button>
            </div>`;
        });
        container.innerHTML = html || "<p>Aucun document.</p>";
    });
};

window.toggleTheme = () => { 
    document.body.classList.toggle('light-mode'); 
    const isL = document.body.classList.contains('light-mode'); 
    localStorage.setItem('theme', isL ? 'light' : 'dark'); 
    document.getElementById('themeBtn').innerText = isL ? "🌙 Mode Sombre" : "☀️ Mode Clair"; 
};

window.saveProfileSettings = async () => { 
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

window.deleteMyAccount = async () => { 
    const user = auth.currentUser;
    if (!user) return;
    if (!confirm("⚠️ DÉFINITIF.\nVeux-tu continuer ?") || !confirm("Vraiment sûr ?")) return;
    try { 
        await deleteDoc(doc(db, "users", user.uid)); 
        await deleteUser(user); 
        window.location.reload(); 
    } catch (error) { 
        if (error.code === 'auth/requires-recent-login') { 
            alert("🔒 Reconnecte-toi d'abord."); 
            await signOut(auth); 
        } 
    }
};

window.updateDashboardStats = async () => { 
    setInterval(() => { 
        document.getElementById("statDate").innerText = new Date().toLocaleDateString('fr-FR'); 
        document.getElementById("statTime").innerText = new Date().toLocaleTimeString('fr-FR'); 
    }, 1000);
    try {
        const snapEmp = await getDocs(collection(db, "employees"));
        document.getElementById("statEmployees").innerText = snapEmp.size;
        const snapUsers = await getDocs(collection(db, "users"));
        document.getElementById("statUsers").innerText = snapUsers.size;
    } catch (e) { }
};

window.toggleCompta = (m) => { 
    document.getElementById("sheetFrame").classList.toggle("hidden", m!=='iframe'); 
    document.getElementById("nativeTableContainer").classList.toggle("hidden", m==='iframe'); 
    if(m!=='iframe') window.loadSheetData(); 
};

window.loadSheetData = async () => { 
    try { 
        const r = await fetch(SHEET_CSV_URL); 
        const t = await r.text(); 
        let rows = t.split(/\r?\n/).map(row => row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c=>c.replace(/^"|"$/g,'').trim())); 
        let html="<thead><tr>"; 
        rows[0].forEach(c=>html+=`<th>${c}</th>`); 
        html+="</tr></thead><tbody>"; 
        for(let i=1;i<rows.length;i++){ 
            if(rows[i].length>1){ 
                html+="<tr>"; 
                rows[0].forEach((_,j)=>html+=`<td>${rows[i][j]||""}</td>`); 
                html+="</tr>"; 
            } 
        } 
        document.getElementById("sheetTable").innerHTML = html+"</tbody>"; 
    } catch(e){} 
};

window.searchTable = () => { 
    const f = document.getElementById("tableSearch").value.toUpperCase(); 
    const tr = document.getElementById("sheetTable").getElementsByTagName("tr"); 
    for(let i=1; i<tr.length; i++){ 
        tr[i].style.display = Array.from(tr[i].getElementsByTagName("td")).some(td=>td.textContent.toUpperCase().includes(f)) ? "" : "none"; 
    } 
};
