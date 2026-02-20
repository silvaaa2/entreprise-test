import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, deleteUser, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
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

if (localStorage.getItem('theme') === 'light') { 
    document.body.classList.add('light-mode'); 
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
        themeBtn.innerText = "🌙 Mode Sombre"; 
    }
}

/* ==================== OUTILS GLOBAUX ==================== */
window.getIsoWeek = function() {
    const date = new Date();
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return d.getUTCFullYear() + "-W" + weekNo;
};

function formatTime(totalSeconds) { 
    const h = Math.floor(totalSeconds / 3600); 
    const m = Math.floor((totalSeconds % 3600) / 60); 
    return `${h}h ${m}m`; 
}

const setElementText = function(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
};

/* ==================== 2. AUTHENTIFICATION & NAVIGATION ==================== */
window.login = async function() { 
    const emailInput = document.getElementById("email").value;
    const passwordInput = document.getElementById("password").value;
    const errorMsg = document.getElementById("error");
    
    try { 
        await signInWithEmailAndPassword(auth, emailInput, passwordInput); 
    } catch(e) { 
        if(errorMsg) {
            errorMsg.innerText = "❌ Erreur de connexion";
            errorMsg.style.color = "var(--error)";
        }
    } 
};

window.resetPassword = async function() {
    const emailInput = document.getElementById("email").value;
    const errorMsg = document.getElementById("error");
    
    if(!emailInput) {
        if(errorMsg) { 
            errorMsg.innerText = "⚠️ Tape ton email d'abord, puis clique ici !"; 
            errorMsg.style.color = "var(--warning)"; 
        }
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, emailInput);
        if(errorMsg) { 
            errorMsg.innerText = "✅ Lien envoyé ! Vérifie tes spams."; 
            errorMsg.style.color = "var(--success)"; 
        }
    } catch(e) {
        if(errorMsg) { 
            errorMsg.innerText = "❌ Email introuvable ou erreur."; 
            errorMsg.style.color = "var(--error)"; 
        }
    }
};

window.loginWithGoogle = async function() { 
    const errorMsg = document.getElementById("error");
    try { 
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider); 
    } catch(e) { 
        if(errorMsg) errorMsg.innerText = "❌ Erreur Google";
    } 
};

window.logout = async function() { 
    if(auth.currentUser) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), { isOnline: false });
    }
    signOut(auth).then(() => window.location.reload()); 
};

window.addEventListener('beforeunload', () => {
    if(auth.currentUser) {
        updateDoc(doc(db, "users", auth.currentUser.uid), { isOnline: false });
    }
});

window.showSection = function(id) {
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    const sectionToShow = document.getElementById(id);
    if(sectionToShow) {
        sectionToShow.classList.add("active");
    }
  
    if(id === 'home') { 
        window.updateDashboardStats(); 
        window.fetchAnnouncements(); 
        window.fetchFocusRadar(); 
    }
    else if(id === 'users') { 
        window.fetchUsers(); 
    }
    else if(id === 'rh') { 
        window.fetchEmployees(); 
        window.fetchAnnouncements(); 
    }
    else if(id === 'compta') { 
        window.toggleCompta('data'); 
    }
    else if(id === 'kanban') { 
        window.fetchTasks(); 
        window.populateKanbanAssignee();
    }
    else if(id === 'factures') {
        const dateInput = document.getElementById("invDateCurrent");
        if(dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        window.initSignature(); 
    }
    else if(id === 'docs') { 
        window.fetchAdminDocs(); 
    }
    else if(id === 'service') { 
        window.loadMyService(); 
    }
    else if(id === 'requests') { 
        window.fetchRequests(); 
    }
    else if(id === 'sanctions') { 
        window.fetchSanctions(); 
        window.populateSanctionDropdown(); 
    }
    else if(id === 'chat') { 
        window.fetchChatUsers(); 
        window.fetchChatMessages(); 
        const badgeChat = document.getElementById("badgeChat");
        if(badgeChat) badgeChat.classList.add("hidden");
    }
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if(loginBox) loginBox.classList.add("hidden");
        if(adminDashboard) adminDashboard.classList.remove("hidden");
        
        await loadUserProfile(user);
        
        // On le signale en ligne
        await updateDoc(doc(db, "users", user.uid), { isOnline: true });
        
        window.currentChatId = 'general';
        window.currentChatName = '☕ Général';
        
        window.showSection('home');
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

        if (user.email === SUPER_ADMIN && (!docSnap.exists() || docSnap.data().role !== 'admin')) {
            await setDoc(docRef, { 
                email: user.email, 
                role: 'admin', 
                displayName: "Le Boss", 
                photoURL: "", 
                createdAt: new Date().toISOString().split('T')[0] 
            }, { merge: true });
            location.reload(); 
            return;
        }

        if (!docSnap.exists()) {
            const q = await getDocs(query(collection(db, "users"), where("email", "==", user.email)));
            if (!q.empty) {
                const existingDoc = q.docs[0];
                await setDoc(docRef, { ...existingDoc.data(), displayName: user.displayName, photoURL: user.photoURL, uid: user.uid });
                await deleteDoc(existingDoc.ref);
            } else {
                await setDoc(docRef, { 
                    email: user.email, 
                    displayName: user.displayName, 
                    photoURL: user.photoURL, 
                    role: 'guest', 
                    createdAt: new Date().toISOString().split('T')[0] 
                });
            }
            docSnap = await getDoc(docRef);
        }

        const data = docSnap.data();
        setElementText("sidebarUserName", data.displayName || "Utilisateur");
        
        const img = document.getElementById("sidebarUserImg");
        if (img) {
            img.src = data.photoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
        }
        
        window.currentUserRole = data.role;
        window.currentUserName = data.displayName || "Utilisateur";
        window.currentUserEmail = data.email;
        
        applyPermissions(data.role);
        listenForNotifications();
        
    } catch (e) { 
        console.error("Erreur profil:", e); 
    }
}

function applyPermissions(role) {
    const menusToHide = [
        "btn-users", "btn-rh", "btn-compta", "btn-docs", "btn-factures",
        "btn-service", "btn-requests", "btn-sanctions", "btn-chat", "btn-kanban", "mainStatsGrid", 
        "admin-title-menu", "perso-title-menu", "thActionsReq", "employeeRequestBox", "hrSanctionBox", "thActionsSanc", "adminAlertWidget"
    ];
    
    menusToHide.forEach(id => { 
        const el = document.getElementById(id); 
        if(el) el.style.display = "none"; 
    });
    
    const homeMsg = document.querySelector(".home-header p");

    if (role === 'admin') {
        menusToHide.forEach(id => { 
            const el = document.getElementById(id); 
            if(el) el.style.display = ""; 
        });
        const reqBox = document.getElementById("employeeRequestBox");
        if(reqBox) reqBox.style.display = "none"; 
        if(homeMsg) homeMsg.innerText = "Voici l'état actuel de ton entreprise.";
    } 
    else if (role === 'employee') {
        ["btn-service", "btn-requests", "btn-sanctions", "btn-chat", "btn-kanban", "perso-title-menu", "employeeRequestBox"].forEach(id => { 
            const el = document.getElementById(id); 
            if(el) el.style.display = ""; 
        });
        if(homeMsg) homeMsg.innerText = "N'oublie pas de pointer pour commencer ta journée.";
    } 
    else if (role === 'rh') {
        ["btn-rh", "btn-service", "btn-requests", "btn-sanctions", "btn-chat", "btn-kanban", "perso-title-menu", "admin-title-menu", "thActionsReq", "employeeRequestBox", "hrSanctionBox", "thActionsSanc"].forEach(id => { 
            const el = document.getElementById(id); 
            if(el) el.style.display = ""; 
        });
        if(homeMsg) homeMsg.innerText = "Sélectionne un menu pour travailler.";
    } 
    else if (role === 'compta') {
        ["btn-compta", "btn-factures", "btn-chat", "btn-kanban", "perso-title-menu", "admin-title-menu"].forEach(id => { 
            const el = document.getElementById(id); 
            if(el) el.style.display = ""; 
        });
        if(homeMsg) homeMsg.innerText = "Sélectionne un menu pour travailler.";
    }
    else {
        if(homeMsg) homeMsg.innerText = "⛔ Ton compte n'a pas encore d'accès. Demande à ton Boss.";
    }
}

/* ==================== SYSTEME DE NOTIFICATIONS ==================== */
let unsubNotifs = null;
function listenForNotifications() {
    if(unsubNotifs) unsubNotifs();
    
    if(window.currentUserRole === 'admin' || window.currentUserRole === 'rh') {
        unsubNotifs = onSnapshot(query(collection(db, "requests"), where("status", "==", "pending")), (snap) => {
            const count = snap.size;
            const badge = document.getElementById("badgeRequests");
            if(badge) {
                if(count > 0) {
                    badge.innerText = count;
                    badge.classList.remove("hidden");
                } else {
                    badge.classList.add("hidden");
                }
            }
        });
    }
}

/* ==================== 3.1 RADAR FOCUS MODE (DEEP WORK) ==================== */
let unsubFocus = null;
window.currentFocusUsers = [];

window.toggleFocusMode = async function() {
    if(!auth.currentUser) return;
    const docRef = doc(db, "users", auth.currentUser.uid);
    const docSnap = await getDoc(docRef);
    
    if(docSnap.exists()) {
        const data = docSnap.data();
        const now = Date.now();
        
        if(data.focusUntil && data.focusUntil > now) {
            await updateDoc(docRef, { focusUntil: null });
        } else {
            await updateDoc(docRef, { focusUntil: now + 45 * 60 * 1000 });
        }
    }
};

window.fetchFocusRadar = function() {
    if(unsubFocus) return;
    
    unsubFocus = onSnapshot(collection(db, "users"), (snapshot) => {
        let amIFocusing = false;
        const now = Date.now();
        window.currentFocusUsers = []; 

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if(data.focusUntil && data.focusUntil > now) {
                if(docSnap.id === auth.currentUser.uid) amIFocusing = true;
                
                window.currentFocusUsers.push({
                    name: data.displayName || "Anonyme",
                    photo: data.photoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png",
                    focusUntil: data.focusUntil,
                    uid: docSnap.id
                });
            }
        });

        const btn = document.getElementById("btn-toggle-focus");
        if(btn) {
            if(amIFocusing) {
                btn.innerText = "🛑 Stopper le Focus";
                btn.style.background = "#ef4444";
                btn.style.color = "white";
            } else {
                btn.innerText = "Activer 45 min 🔕";
                btn.style.background = "transparent";
                btn.style.color = "#ef4444";
            }
        }

        window.renderFocusList();
    });
};

window.renderFocusList = function() {
    const radarList = document.getElementById("focusRadarList");
    if(!radarList) return;
    
    if(!window.currentFocusUsers || window.currentFocusUsers.length === 0) {
        radarList.innerHTML = `<p style="color: var(--subtext); text-align: center; padding: 20px 0;">Personne n'est en mode Focus actuellement.</p>`;
        return;
    }
    
    let html = "";
    const now = Date.now();
    
    window.currentFocusUsers.forEach(u => {
        let diff = Math.floor((u.focusUntil - now) / 1000);
        if(diff < 0) diff = 0;
        
        let m = Math.floor(diff / 60).toString().padStart(2, '0');
        let s = (diff % 60).toString().padStart(2, '0');
        
        html += `<div class="focus-item">
                    <div class="focus-user">
                        <img src="${u.photo}">
                        <span><b>${u.name}</b> <small style="color:var(--subtext)">en plein tryhard...</small></span>
                    </div>
                    <div class="focus-timer">${m}:${s}</div>
                 </div>`;
    });
    
    radarList.innerHTML = html;
};

setInterval(() => {
    const homeSection = document.getElementById("home");
    if(homeSection && homeSection.classList.contains("active")) {
        window.renderFocusList();
    }
}, 1000);

/* ==================== 4. GESTION DES UTILISATEURS (COMPTES) ==================== */
let unsubscribeUsers = null;

window.createNewUser = async function() {
    const email = document.getElementById("newEmail").value;
    const password = document.getElementById("newPassword").value;
    const role = document.getElementById("newRole").value;
    const msg = document.getElementById("userMsg");
    
    if(!email || !password) { 
        if(msg) msg.innerText = "Remplis tout !"; 
        return; 
    }
    
    if(msg) msg.innerText = "Création...";
    
    try {
        const secondaryApp = initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        
        await setDoc(doc(db, "users", cred.user.uid), { 
            email: email, 
            role: role, 
            createdAt: new Date().toISOString().split('T')[0], 
            displayName: "En attente", 
            photoURL: "",
            focusUntil: null
        });
        
        await signOut(secondaryAuth);
        
        if(msg) {
            msg.innerText = `✅ Ajouté !`; 
            msg.style.color = "var(--success)";
        }
    } catch (error) { 
        if(msg) msg.innerText = "Erreur: " + error.message; 
    }
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
    try { 
        await updateDoc(doc(db, "users", uid), { role: newRole }); 
    } catch (e) { 
        console.error("Erreur maj", e);
    } 
};

window.deleteUser = async function(uid) {
    if (auth.currentUser && auth.currentUser.uid === uid) { 
        return alert("Utilise les Paramètres pour supprimer ton propre compte."); 
    }
    if(confirm("⚠️ EXCLURE définitivement cette personne ?")) { 
        await deleteDoc(doc(db, "users", uid)); 
    }
};

window.openUserProfile = async function(uid) {
    const modal = document.getElementById("profileModal");
    if(modal) modal.classList.remove("hidden"); 
    
    const d = await getDoc(doc(db, "users", uid)); 
    if(d.exists()) { 
        setElementText("m_name", d.data().displayName || "Sans nom");
        setElementText("m_email", d.data().email);
        
        let roleText = "Invité";
        if(d.data().role === 'admin') roleText = "👑 Admin";
        if(d.data().role === 'rh') roleText = "🤝 RH";
        if(d.data().role === 'employee') roleText = "👷 Employé";
        if(d.data().role === 'compta') roleText = "📊 Compta";
        
        setElementText("m_role", roleText);
        setElementText("m_uid", uid);
        
        const img = document.getElementById("m_photo");
        if(img) img.src = d.data().photoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    } 
};

window.closeUserProfile = function() { 
    const modal = document.getElementById("profileModal");
    if(modal) modal.classList.add("hidden"); 
};

/* ==================== 5. POINTAGE (MON SERVICE EMPLOYE) ==================== */
let myPersonalTimer = null;
let myEmployeeDocId = null;

window.loadMyService = async function() {
    const user = auth.currentUser;
    if (!user) return;
    const container = document.getElementById("myServiceContainer");
    
    const snap = await getDocs(query(collection(db, "employees"), where("email", "==", user.email)));
    if (snap.empty) { 
        if(container) {
            container.innerHTML = `<div class="pointage-card"><h3 style="color:var(--error);">⚠️ Dossier introuvable</h3><p>Aucun dossier RH relié à <b>${user.email}</b>.</p></div>`; 
        }
        return; 
    }
    
    myEmployeeDocId = snap.docs[0].id;
    
    onSnapshot(doc(db, "employees", myEmployeeDocId), (docSnap) => { 
        if(docSnap.exists()) { 
            renderMyServiceUI(docSnap.data()); 
        }
    });
};

function renderMyServiceUI(data) {
    if(myPersonalTimer) clearInterval(myPersonalTimer);
    
    let isEnService = data.status === 'en_service';
    let statusText = isEnService ? `<span class="status-badge status-en_service" style="font-size:1em;">🟢 EN SERVICE</span>` : `<span class="status-badge status-hors_service" style="font-size:1em;">⚪ HORS SERVICE</span>`;
    let buttonHtml = isEnService ? `<button class="btn-clock-out" onclick="window.toggleMyService('hors_service')">🔴 Terminer mon service</button>` : `<button class="btn-clock-in" onclick="window.toggleMyService('en_service')">🟢 Prendre mon service</button>`;

    const currentWeekStr = window.getIsoWeek();
    let baseWeekly = (data.currentWeek === currentWeekStr) ? (data.weeklyServiceSeconds || 0) : 0;
    let lastSession = data.lastSessionSeconds || 0;
    
    let topLabel = isEnService ? "Temps de la session actuelle :" : "Dernière session :";

    const container = document.getElementById("myServiceContainer");
    if(container) {
        container.innerHTML = `
            <div class="pointage-card">
                <h2 style="margin-top:0;">${data.name}</h2>
                <p style="color:var(--subtext); margin-bottom: 20px;">${data.grade}</p>
                <div style="margin-bottom: 30px;">${statusText}</div>
                
                <p style="color:var(--subtext); margin:0;">${topLabel}</p>
                <div id="my_session_clock" class="live-clock" style="font-size: 2.5em; margin: 10px 0;">
                    ${isEnService ? "0h 0m" : formatTime(lastSession)}
                </div>
                
                <div style="margin: 20px 0; padding-top: 20px; border-top: 1px solid var(--border);">
                    <p style="color:var(--subtext); margin:0; font-size: 0.9em;">⏱️ Service total de la semaine :</p>
                    <div id="my_weekly_clock" style="font-size: 1.5em; color:var(--text); font-weight: bold; font-family: monospace;">0h 0m</div>
                </div>
                
                ${buttonHtml}
            </div>`;
    }

    const updateMyTimer = () => {
        let sessionSecs = 0;
        let weeklySecs = baseWeekly;
        
        if (isEnService && data.currentServiceStart) {
            sessionSecs = Math.floor((Date.now() - data.currentServiceStart) / 1000);
            weeklySecs += sessionSecs;
        }
        
        setElementText("my_session_clock", formatTime(sessionSecs));
        setElementText("my_weekly_clock", formatTime(weeklySecs));
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
    
    const currentWeekStr = window.getIsoWeek();
    let currentWeekly = (data.currentWeek === currentWeekStr) ? (data.weeklyServiceSeconds || 0) : 0;
    let updates = { status: newStatus, currentWeek: currentWeekStr };

    if (data.status !== 'en_service' && newStatus === 'en_service') {
        updates.currentServiceStart = Date.now();
        updates.weeklyServiceSeconds = currentWeekly; 
    } 
    else if (data.status === 'en_service' && newStatus !== 'en_service') {
        const durationSecs = Math.floor((Date.now() - data.currentServiceStart) / 1000);
        updates.weeklyServiceSeconds = currentWeekly + durationSecs;
        updates.lastSessionSeconds = durationSecs;
        updates.currentServiceStart = null; 
        
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
    
    if(!dates || !motif) { 
        if(msg) msg.innerText = "Remplis tout !"; 
        return; 
    }
    
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
        
        if(msg) {
            msg.innerText = "✅ Demande envoyée !"; 
            msg.style.color = "var(--success)";
        }
        
        const dInput = document.getElementById("reqDates");
        if(dInput) dInput.value = ""; 
        const mInput = document.getElementById("reqMotif");
        if(mInput) mInput.value = "";
    } catch(e) { 
        if(msg) msg.innerText = "Erreur de soumission."; 
    }
};

let unsubReq = null;
window.fetchRequests = function() {
    if(unsubReq) return;
    
    unsubReq = onSnapshot(query(collection(db, "requests"), orderBy("createdAt", "desc")), (snapshot) => {
        let html = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const dateStr = new Date(data.createdAt).toLocaleDateString('fr-FR');
            
            if(window.currentUserRole === 'employee' && data.employeeEmail !== window.currentUserEmail) { 
                return; 
            }

            let badge = `<span class="status-badge status-pending">⏳ En attente</span>`;
            if(data.status === 'approved') badge = `<span class="status-badge status-en_service">✅ Approuvé</span>`;
            if(data.status === 'rejected') badge = `<span class="status-badge status-absent">❌ Refusé</span>`;

            let actions = "-";
            if(data.status === 'pending' && (window.currentUserRole === 'admin' || window.currentUserRole === 'rh')) {
                actions = `
                <button onclick="window.updateRequest('${docSnap.id}', 'approved', '${data.employeeEmail}', '${data.type}')" style="background:var(--success); padding:5px; width:auto; font-size:0.8em; margin-right:5px; color:white; border:none; border-radius:3px;">✔️</button>
                <button onclick="window.updateRequest('${docSnap.id}', 'rejected', null, null)" style="background:var(--error); padding:5px; width:auto; font-size:0.8em; color:white; border:none; border-radius:3px;">❌</button>`;
            }

            html += `<tr>
                <td>${dateStr}</td><td><b>${data.employeeName}</b></td>
                <td><span style="color:var(--accent); font-weight:bold;">${data.type}</span><br><small>${data.dates}</small><br><i>"${data.motif}"</i></td>
                <td>${badge}</td>${window.currentUserRole !== 'employee' ? `<td>${actions}</td>` : ''}
            </tr>`;
        });
        
        const tbody = document.getElementById("requestsListBody");
        if(tbody) {
            tbody.innerHTML = html || "<tr><td colspan='5'>Aucune demande.</td></tr>";
        }
    });
};

window.updateRequest = async function(reqId, newStatus, empEmail, reqType) {
    await updateDoc(doc(db, "requests", reqId), { status: newStatus });
    
    if(newStatus === 'approved' && reqType === 'Vacances' && empEmail) {
        const snap = await getDocs(query(collection(db, "employees"), where("email", "==", empEmail)));
        if(!snap.empty) {
            await updateDoc(doc(db, "employees", snap.docs[0].id), { status: 'vacation' });
        }
    }
};

/* ==================== 6.5 SANCTIONS ==================== */
window.populateSanctionDropdown = async function() {
    const select = document.getElementById("sancEmployee");
    if(!select) return;
    
    const snap = await getDocs(collection(db, "employees"));
    let html = "<option value=''>-- Sélectionner un employé --</option>";
    
    snap.forEach(d => {
        const data = d.data();
        if(data.email) { 
            html += `<option value="${data.email}|${data.name}">${data.name} (${data.email})</option>`; 
        }
    });
    select.innerHTML = html;
};

window.submitSanction = async function() {
    const empData = document.getElementById("sancEmployee").value;
    const type = document.getElementById("sancType").value;
    const motif = document.getElementById("sancMotif").value;
    const msg = document.getElementById("sancMsg");
    
    if(!empData || !motif) { 
        if(msg) {
            msg.innerText = "⚠️ Remplis tous les champs !"; 
            msg.style.color="var(--warning)"; 
        }
        return; 
    }
    
    const [empEmail, empName] = empData.split("|");
    try {
        await addDoc(collection(db, "sanctions"), {
            employeeEmail: empEmail, 
            employeeName: empName, 
            type: type, 
            motif: motif, 
            issuedBy: window.currentUserName, 
            createdAt: new Date().toISOString()
        });
        
        if(msg) {
            msg.innerText = "✅ Sanction appliquée avec succès."; 
            msg.style.color="var(--success)";
        }
        
        const mInput = document.getElementById("sancMotif");
        if(mInput) mInput.value = ""; 
        const sInput = document.getElementById("sancEmployee");
        if(sInput) sInput.value = "";
    } catch(e) { 
        if(msg) msg.innerText = "Erreur."; 
    }
};

window.deleteSanction = async function(id) {
    if(confirm("Annuler définitivement cette sanction ?")) {
        await deleteDoc(doc(db, "sanctions", id));
    }
};

let unsubSanctions = null;
window.fetchSanctions = function() {
    if(unsubSanctions) return;
    
    unsubSanctions = onSnapshot(query(collection(db, "sanctions"), orderBy("createdAt", "desc")), (snapshot) => {
        let html = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const dateStr = new Date(data.createdAt).toLocaleDateString('fr-FR');
            
            if(window.currentUserRole === 'employee' && data.employeeEmail !== window.currentUserEmail) return;
            
            let badgeClass = "badge-avert-verbal";
            if(data.type === 'Avertissement écrit') badgeClass = "badge-avert-ecrit";
            if(data.type === 'Mise à pied') badgeClass = "badge-mise-pied";
            if(data.type === 'Licenciement') badgeClass = "badge-licenciement";

            let actions = "-";
            if(window.currentUserRole === 'admin' || window.currentUserRole === 'rh') {
                actions = `<button onclick="window.deleteSanction('${docSnap.id}')" style="background:var(--error); padding:5px; width:auto; font-size:0.8em; color:white; border:none; border-radius:3px;">🗑️ Annuler</button>`;
            }

            html += `<tr>
                <td>${dateStr}</td><td><b>${data.employeeName}</b></td>
                <td><span class="${badgeClass}">${data.type}</span></td>
                <td><i>"${data.motif}"</i><br><small style="color:var(--subtext)">Par: ${data.issuedBy}</small></td>
                ${(window.currentUserRole === 'admin' || window.currentUserRole === 'rh') ? `<td>${actions}</td>` : ''}
            </tr>`;
        });
        
        const tbody = document.getElementById("sanctionsListBody");
        if(tbody) {
            tbody.innerHTML = html || "<tr><td colspan='5'>Aucune sanction enregistrée.</td></tr>";
        }
    });
};

/* ==================== 7. MESSAGERIE (GENERAL + MP) ==================== */
let unsubChat = null;

// Charge la liste de tous les collègues pour les MP
window.fetchChatUsers = async function() {
    if(!auth.currentUser) return;
    const snap = await getDocs(collection(db, "users"));
    let html = "";
    snap.forEach(d => {
        if(d.id !== auth.currentUser.uid) { 
            const data = d.data();
            
            // --- MODIFICATION ICI : RESTRICTION DES MP ---
            // Si l'utilisateur connecté N'EST PAS admin ET que le profil qu'on regarde N'EST PAS admin, on zappe.
            if (window.currentUserRole !== 'admin' && data.role !== 'admin') {
                return; // Ne pas afficher cet utilisateur dans la liste
            }
            
            const photo = data.photoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
            const name = data.displayName || "Anonyme";
            const statusDot = data.isOnline ? `<div class="online-dot"></div>` : `<div class="offline-dot"></div>`;
            
            html += `
            <div class="chat-contact" id="contact_${d.id}" onclick="window.selectChat('${d.id}', '${name}')">
                <div style="position:relative; display:inline-block;">
                    <img src="${photo}">
                    <span style="position:absolute; bottom:0; right:0;">${statusDot}</span>
                </div>
                ${name}
            </div>`;
        }
    });
    const list = document.getElementById("chatUsersList");
    if(list) list.innerHTML = html;
};

// Fonction pour changer de salon (Général ou Privé)
window.selectChat = function(targetUid, targetName) {
    if(!auth.currentUser) return;
    
    if(targetUid === 'general') {
        window.currentChatId = 'general';
        window.currentChatName = '☕ Général';
    } else {
        const myUid = auth.currentUser.uid;
        window.currentChatId = [myUid, targetUid].sort().join('_');
        window.currentChatName = '🔒 ' + targetName;
    }
    
    setElementText('currentChatHeader', window.currentChatName);
    
    document.querySelectorAll('.chat-contact').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById('contact_' + targetUid);
    if(activeEl) activeEl.classList.add('active');
    
    window.fetchChatMessages();
};

window.sendChatMessage = async function() {
    const input = document.getElementById("chatInput");
    if(!input) return;
    const text = input.value.trim();
    if(!text) return;
    
    try {
        await addDoc(collection(db, "messages"), {
            chatId: window.currentChatId || 'general', 
            text: text, 
            authorName: window.currentUserName, 
            authorEmail: window.currentUserEmail, 
            createdAt: serverTimestamp() 
        });
        input.value = "";
    } catch(e) { 
        console.error("Erreur d'envoi", e);
    }
};

window.handleChatKeyPress = function(e) { 
    if(e.key === 'Enter') { 
        window.sendChatMessage(); 
    } 
};

let isFirstChatLoad = true;
window.fetchChatMessages = function() {
    if(unsubChat) unsubChat(); 
    
    unsubChat = onSnapshot(query(collection(db, "messages"), where("chatId", "==", window.currentChatId || 'general')), (snapshot) => {
        let msgs = [];
        snapshot.forEach(docSnap => msgs.push(docSnap.data()));
        
        msgs.sort((a, b) => {
            let tA = a.createdAt ? a.createdAt.toMillis() : Date.now();
            let tB = b.createdAt ? b.createdAt.toMillis() : Date.now();
            return tA - tB;
        });

        let html = "";
        msgs.forEach((data) => {
            const isMine = data.authorEmail === window.currentUserEmail;
            const alignClass = isMine ? 'mine' : 'other';
            let timeStr = "";
            
            if(data.createdAt) { 
                timeStr = new Date(data.createdAt.toMillis()).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}); 
            }
            
            html += `<div class="chat-row ${alignClass}"><div class="chat-meta"><b>${isMine ? 'Moi' : data.authorName}</b> • ${timeStr}</div><div class="chat-bubble">${data.text}</div></div>`;
        });
        
        const container = document.getElementById("chatMessages");
        if(container) {
            container.innerHTML = html || "<p style='color:var(--subtext); text-align:center;'>Aucun message ici. Lance la discussion !</p>";
            container.scrollTop = container.scrollHeight; 
        }

        const chatSection = document.getElementById('chat');
        const badgeChat = document.getElementById('badgeChat');
        
        if(!isFirstChatLoad && chatSection && !chatSection.classList.contains('active')) {
            if(badgeChat) badgeChat.classList.remove('hidden');
        }
        isFirstChatLoad = false;
    });
};

/* ==================== 7.5 KANBAN (TRELLO) ==================== */
let unsubTasks = null;

window.openTaskModal = function() {
    const modal = document.getElementById("newTaskModal");
    if(modal) modal.classList.remove("hidden");
};

window.closeTaskModal = function() {
    const modal = document.getElementById("newTaskModal");
    if(modal) modal.classList.add("hidden");
};

window.populateKanbanAssignee = async function() {
    const select = document.getElementById("taskAssignee");
    if(!select) return;
    
    const snap = await getDocs(collection(db, "users"));
    let html = "<option value='Pour toute l équipe'>Pour toute l'équipe</option>";
    
    snap.forEach(d => {
        const data = d.data();
        if(data.displayName) { 
            html += `<option value="${data.displayName}">${data.displayName}</option>`; 
        }
    });
    select.innerHTML = html;
};

window.saveNewTask = async function() {
    const title = document.getElementById("taskTitle").value;
    const desc = document.getElementById("taskDesc").value;
    const assignee = document.getElementById("taskAssignee").value;
    
    if(!title) return alert("Il faut un titre !");
    
    await addDoc(collection(db, "tasks"), {
        title: title,
        desc: desc,
        assignee: assignee,
        status: "todo", 
        createdAt: new Date().toISOString()
    });
    
    document.getElementById("taskTitle").value = "";
    document.getElementById("taskDesc").value = "";
    window.closeTaskModal();
};

window.fetchTasks = function() {
    if(unsubTasks) return;
    
    unsubTasks = onSnapshot(collection(db, "tasks"), (snapshot) => {
        const colTodo = document.getElementById("list-todo");
        const colInProgress = document.getElementById("list-inprogress");
        const colDone = document.getElementById("list-done");
        
        if(!colTodo || !colInProgress || !colDone) return;
        
        colTodo.innerHTML = ""; colInProgress.innerHTML = ""; colDone.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            const card = document.createElement("div");
            card.className = "kanban-card";
            card.draggable = true;
            card.id = id;
            card.ondragstart = window.drag;
            
            let deleteBtn = "";
            if(window.currentUserRole === 'admin') {
                deleteBtn = `<span class="delete-task" onclick="window.deleteTask('${id}')">X</span>`;
            }
            
            card.innerHTML = `
                ${deleteBtn}
                <h4>${data.title}</h4>
                <p>${data.desc}</p>
                <span class="assignee">👤 ${data.assignee}</span>
            `;
            
            if(data.status === 'todo') colTodo.appendChild(card);
            else if(data.status === 'inprogress') colInProgress.appendChild(card);
            else if(data.status === 'done') colDone.appendChild(card);
        });
    });
};

window.deleteTask = async function(id) {
    if(confirm("Supprimer cette tâche ?")) {
        await deleteDoc(doc(db, "tasks", id));
    }
};

window.allowDrop = function(ev) {
    ev.preventDefault();
};

window.drag = function(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
};

window.drop = async function(ev) {
    ev.preventDefault();
    const dataId = ev.dataTransfer.getData("text");
    const draggedCard = document.getElementById(dataId);
    if(!draggedCard) return;

    let targetCol = ev.target;
    while(targetCol && !targetCol.classList.contains("kanban-column")) {
        targetCol = targetCol.parentNode;
    }
    
    if(!targetCol) return;
    
    const targetList = targetCol.querySelector('.kanban-cards');
    if(targetList) {
        targetList.appendChild(draggedCard);
    }
    
    let newStatus = "todo";
    if(targetCol.id === "col-inprogress") newStatus = "inprogress";
    if(targetCol.id === "col-done") newStatus = "done";
    
    await updateDoc(doc(db, "tasks", dataId), { status: newStatus });
};

/* ==================== 8. RESSOURCES HUMAINES & DOSSIERS ==================== */
window.postAnnouncement = async function() {
    const titleInput = document.getElementById("annTitle");
    const contentInput = document.getElementById("annContent");
    
    if(!titleInput || !contentInput) return;
    
    const title = titleInput.value;
    const content = contentInput.value;
    
    if(!title || !content) return;
    
    await addDoc(collection(db, "announcements"), { 
        title: title, 
        content: content, 
        author: window.currentUserName, 
        createdAt: new Date().toISOString() 
    });
    
    titleInput.value = ""; 
    contentInput.value = "";
};

window.deleteAnnouncement = async function(id) {
    if(confirm("Supprimer cette annonce ?")) {
        await deleteDoc(doc(db, "announcements", id));
    }
};

window.fetchAnnouncements = function() {
    onSnapshot(query(collection(db, "announcements"), orderBy("createdAt", "desc")), (snap) => {
        let html = "";
        snap.forEach((d) => { 
            let deleteHTML = "";
            if(window.currentUserRole === 'admin') { 
                deleteHTML = `<span class="ann-delete" onclick="window.deleteAnnouncement('${d.id}')">❌</span>`; 
            }
            html += `
            <div class="ann-card">
                <h4 class="ann-title">${d.data().title}</h4>
                <p class="ann-content">${d.data().content}</p>
                <div class="ann-footer"><span>Par ${d.data().author}</span>${deleteHTML}</div>
            </div>`; 
        });
        
        const grid = document.getElementById("homeAnnouncementsGrid");
        if(grid) {
            grid.innerHTML = html || "<p style='color:var(--subtext)'>Aucune annonce.</p>";
        }
    });
};

window.openNewEmployeeModal = function() { 
    const modal = document.getElementById("newEmployeeModal");
    if(modal) modal.classList.remove("hidden"); 
};

window.closeNewEmployeeModal = function() { 
    const modal = document.getElementById("newEmployeeModal");
    if(modal) modal.classList.add("hidden"); 
};

window.closeHrEmployeeModal = function() { 
    const modal = document.getElementById("hrEmployeeModal");
    if(modal) modal.classList.add("hidden"); 
};

window.saveNewEmployee = async function() {
    await addDoc(collection(db, "employees"), {
        name: document.getElementById("ne_name").value, 
        email: document.getElementById("ne_email").value,
        grade: document.getElementById("ne_grade").value, 
        phone: document.getElementById("ne_phone").value,
        salary: document.getElementById("ne_salary").value, 
        status: "hors_service", 
        weeklyServiceSeconds: 0, 
        lastSessionSeconds: 0, 
        currentWeek: window.getIsoWeek(),
        currentServiceStart: null, 
        hiredDate: new Date().toISOString().split('T')[0], 
        hrNotes: ""
    });
    
    window.closeNewEmployeeModal();
    
    const idsToClear = ["ne_name", "ne_email", "ne_grade", "ne_phone", "ne_salary"];
    idsToClear.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = "";
    });
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
        
        const tbody = document.getElementById("employeeListBody");
        if(tbody) {
            tbody.innerHTML = html || "<tr><td colspan='4'>Aucun dossier.</td></tr>";
        }
    });
};

window.openHrEmployeeModal = async function(id) {
    const modal = document.getElementById("hrEmployeeModal");
    if(modal) modal.classList.remove("hidden");
    
    const docSnap = await getDoc(doc(db, "employees", id));
    const data = docSnap.data();
    
    const setVal = (eid, val) => { const el = document.getElementById(eid); if(el) el.value = val; };
    
    setVal("hre_id", id);
    setElementText("hre_name", data.name || "N/A");
    setElementText("hre_grade", data.grade || "N/A");
    setElementText("hre_phone", data.phone || "N/A");
    setElementText("hre_salary", data.salary || "N/A");
    setElementText("hre_date", data.hiredDate || "N/A");
    
    setVal("hre_email", data.email || ""); 
    setVal("hre_status", data.status || "hors_service");
    setVal("hre_notes", data.hrNotes || "");
    setVal("hre_old_status", data.status || "hors_service");
    setVal("hre_current_start", data.currentServiceStart || "");

    const currentWeekStr = window.getIsoWeek();
    let baseWeekly = (data.currentWeek === currentWeekStr) ? (data.weeklyServiceSeconds || 0) : 0;
    
    setVal("hre_weekly_seconds", baseWeekly);

    const updateTimerDisplay = () => {
        let currentSecs = baseWeekly;
        if (data.status === 'en_service' && data.currentServiceStart) { 
            currentSecs += Math.floor((Date.now() - data.currentServiceStart) / 1000); 
        }
        setElementText("hre_service_time", formatTime(currentSecs));
    };
    updateTimerDisplay();

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
    
    const logContainer = document.getElementById("hre_timelogs");
    if(logContainer) logContainer.innerHTML = logHtml;
};

window.updateEmployeeDossier = async function() {
    const id = document.getElementById("hre_id").value;
    const oldStatus = document.getElementById("hre_old_status").value;
    const newStatus = document.getElementById("hre_status").value;
    
    let weeklySecs = parseInt(document.getElementById("hre_weekly_seconds").value) || 0;
    
    let updates = { 
        status: newStatus, 
        email: document.getElementById("hre_email").value, 
        hrNotes: document.getElementById("hre_notes").value 
    };

    if (oldStatus !== 'en_service' && newStatus === 'en_service') {
        updates.currentServiceStart = Date.now();
        updates.currentWeek = window.getIsoWeek();
    } 
    else if (oldStatus === 'en_service' && newStatus !== 'en_service') {
        const currentStart = document.getElementById("hre_current_start").value;
        if (currentStart) { 
            updates.weeklyServiceSeconds = weeklySecs + Math.floor((Date.now() - parseInt(currentStart)) / 1000); 
        }
        updates.currentServiceStart = null; 
    }

    await updateDoc(doc(db, "employees", id), updates);
    window.closeHrEmployeeModal();
};

window.deleteEmployeeDossier = async function() { 
    if(confirm("Virer l'employé définitivement ?")) { 
        await deleteDoc(doc(db, "employees", document.getElementById("hre_id").value)); 
        window.closeHrEmployeeModal(); 
    } 
};

window.searchRH = function() { 
    const searchEl = document.getElementById("rhSearch");
    if(!searchEl) return;
    const f = searchEl.value.toUpperCase(); 
    
    const table = document.getElementById("rhTable");
    if(!table) return;
    
    const tr = table.getElementsByTagName("tr"); 
    
    for(let i=1; i<tr.length; i++) { 
        tr[i].style.display = Array.from(tr[i].getElementsByTagName("td")).some(td => td.textContent.toUpperCase().includes(f)) ? "" : "none"; 
    } 
};

/* ==================== 8.5 CALCULS FACTURES ==================== */
window.calculateInvoice = function() {
    try {
        const tbody = document.getElementById("invoiceBody");
        if(!tbody) return;
        
        const rows = tbody.getElementsByTagName("tr");
        let subtotal = 0;
        
        for(let i = 0; i < rows.length; i++) {
            const qtyInput = rows[i].querySelector(".qty");
            const priceInput = rows[i].querySelector(".price");
            const rowTotalEl = rows[i].querySelector(".row-total");
            
            if(qtyInput && priceInput && rowTotalEl) {
                const qVal = qtyInput.value.replace(',', '.');
                const pVal = priceInput.value.replace(',', '.');
                
                const qty = parseFloat(qVal) || 0;
                const price = parseFloat(pVal) || 0;
                const total = qty * price;
                
                subtotal += total;
                rowTotalEl.innerText = total.toFixed(2) + " €";
            }
        }
        
        const taxRateInput = document.getElementById("invTaxRate");
        let taxRate = 20;
        if(taxRateInput) {
            taxRate = parseFloat(taxRateInput.value.replace(',', '.')) || 0;
        }
        
        const taxAmount = subtotal * (taxRate / 100);
        const grandTotal = subtotal + taxAmount;
        
        const stEl = document.getElementById("invSubtotal");
        if(stEl) stEl.innerText = subtotal.toFixed(2) + " €";

        const txEl = document.getElementById("invTaxAmount");
        if(txEl) txEl.innerText = taxAmount.toFixed(2) + " €";

        const gtEl = document.getElementById("invTotal");
        if(gtEl) gtEl.innerText = grandTotal.toFixed(2) + " €";

    } catch(e) {
        console.error("Erreur de calcul facture :", e);
    }
};

window.addInvoiceRow = function() {
    const tbody = document.getElementById("invoiceBody");
    if(!tbody) return;
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td><input type="text" class="inv-input" placeholder="Prestation ou Produit" oninput="window.calculateInvoice()"></td>
        <td><input type="text" class="inv-input qty" value="1" oninput="window.calculateInvoice()" style="text-align:center;"></td>
        <td><input type="text" class="inv-input price" value="0.00" oninput="window.calculateInvoice()" style="text-align:right;"></td>
        <td class="row-total" style="text-align:right;">0.00 €</td>
        <td class="no-print"><button onclick="window.removeInvoiceRow(this)" style="background:#ef4444; padding:5px; width:100%;">X</button></td>
    `;
    tbody.appendChild(tr);
    window.calculateInvoice();
};

window.removeInvoiceRow = function(btn) {
    if(!btn || !btn.parentNode || !btn.parentNode.parentNode) return;
    const row = btn.parentNode.parentNode;
    if(row.parentNode) {
        row.parentNode.removeChild(row);
        window.calculateInvoice();
    }
};

/* ==================== 8.6 SIGNATURE ELECTRONIQUE ==================== */
let sigCtx = null;
let isDrawing = false;

window.initSignature = function() {
    const canvas = document.getElementById('sigCanvas');
    const clearBtn = document.getElementById('clearSigBtn');
    if(!canvas) return;

    if(window.currentUserRole !== 'admin') {
        canvas.style.pointerEvents = 'none';
        if(clearBtn) clearBtn.style.display = 'none';
        return;
    }

    sigCtx = canvas.getContext('2d');
    sigCtx.lineWidth = 2;
    sigCtx.lineCap = 'round';
    sigCtx.strokeStyle = document.body.classList.contains('light-mode') ? '#000' : '#fff';

    canvas.addEventListener('mousedown', startPos);
    canvas.addEventListener('mouseup', endPos);
    canvas.addEventListener('mousemove', drawSig);

    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startPos(e.touches[0]); });
    canvas.addEventListener('touchend', endPos);
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); drawSig(e.touches[0]); });
};

function startPos(e) {
    isDrawing = true;
    drawSig(e);
}

function endPos() {
    isDrawing = false;
    if(sigCtx) sigCtx.beginPath();
}

function drawSig(e) {
    if (!isDrawing || !sigCtx) return;
    
    const canvas = document.getElementById('sigCanvas');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    sigCtx.lineTo(x, y);
    sigCtx.stroke();
    sigCtx.beginPath();
    sigCtx.moveTo(x, y);
}

window.clearSignature = function() {
    const canvas = document.getElementById('sigCanvas');
    if(sigCtx && canvas) {
        sigCtx.clearRect(0, 0, canvas.width, canvas.height);
        sigCtx.beginPath();
    }
};

/* ==================== 9. AUTRES (DOCS / COMPTA / PARAMETRES) ==================== */
window.createAdminDoc = async function() {
    const titleEl = document.getElementById("docTitle"); 
    const contentEl = document.getElementById("docContent");
    if(!titleEl || !contentEl) return;

    const title = titleEl.value;
    const content = contentEl.value;
    if(!title || !content) return;
    
    try {
        await addDoc(collection(db, "admin_docs"), { 
            title: title, 
            content: content, 
            createdAt: new Date().toISOString() 
        });
        
        setElementText("docMsg", "✅ Sauvegardé !"); 
        titleEl.value = ""; 
        contentEl.value = "";
    } catch(e) { 
        console.error(e); 
    }
};

window.deleteAdminDoc = async function(id) {
    if(confirm("Supprimer ce document ?")) {
        await deleteDoc(doc(db, "admin_docs", id));
    }
};

let unsubscribeDocs = null;
window.fetchAdminDocs = function() {
    const container = document.getElementById("docsGrid");
    if(!container || unsubscribeDocs) return; 
    
    unsubscribeDocs = onSnapshot(query(collection(db, "admin_docs"), orderBy("createdAt", "desc")), (snapshot) => {
        let html = ""; 
        snapshot.forEach((d) => { 
            html += `
            <div class="doc-card">
                <div class="doc-icon">📁</div>
                <h4>${d.data().title}</h4>
                <p>${d.data().content}</p>
                <button onclick="window.deleteAdminDoc('${d.id}')" class="delete-doc-btn">Supprimer</button>
            </div>`; 
        });
        
        container.innerHTML = html || "<p>Aucun document.</p>";
    });
};

window.toggleTheme = function() { 
    document.body.classList.toggle('light-mode'); 
    const isL = document.body.classList.contains('light-mode'); 
    localStorage.setItem('theme', isL ? 'light' : 'dark'); 
    setElementText('themeBtn', isL ? "🌙 Mode Sombre" : "☀️ Mode Clair"); 
    
    if(sigCtx) sigCtx.strokeStyle = isL ? '#000' : '#fff';
};

window.saveProfileSettings = async function() { 
    const newNameEl = document.getElementById("settingsDisplayName"); 
    const newPhotoURLEl = document.getElementById("settingsPhotoURL"); 
    if(!newNameEl || !newPhotoURLEl) return;

    const newName = newNameEl.value;
    const newPhotoURL = newPhotoURLEl.value;
    
    if (!auth.currentUser || !newName) return; 
    
    try { 
        await setDoc(doc(db, "users", auth.currentUser.uid), { 
            displayName: newName, 
            photoURL: newPhotoURL || "" 
        }, { merge: true }); 
        
        setElementText("settingsMsg", "✅ Sauvegardé !"); 
        setElementText("sidebarUserName", newName); 
    } catch(e) { 
        console.error(e); 
    } 
};

window.deleteMyAccount = async function() { 
    if (!auth.currentUser) return; 
    
    if (!confirm("⚠️ DÉFINITIF.\nVeux-tu continuer ?") || !confirm("Vraiment sûr ?")) return; 
    
    try { 
        await deleteDoc(doc(db, "users", auth.currentUser.uid)); 
        await deleteUser(auth.currentUser); 
        window.location.reload(); 
    } catch (error) { 
        if (error.code === 'auth/requires-recent-login') { 
            alert("🔒 Reconnecte-toi d'abord."); 
            await signOut(auth); 
        } 
    } 
};

window.updateDashboardStats = async function() { 
    setInterval(() => { 
        setElementText("statDate", new Date().toLocaleDateString('fr-FR')); 
        setElementText("statTime", new Date().toLocaleTimeString('fr-FR')); 
    }, 1000); 
    
    try { 
        const empEl = document.getElementById("statEmployees"); 
        const usrEl = document.getElementById("statUsers"); 
        
        if(empEl) {
            const e = await getDocs(collection(db, "employees"));
            empEl.innerText = e.size; 
        }
        
        if(usrEl) {
            const u = await getDocs(collection(db, "users"));
            usrEl.innerText = u.size; 
        }
    } catch (e) { 
        console.error(e); 
    } 
};

window.toggleCompta = function(m) { 
    const sFrame = document.getElementById("sheetFrame");
    const nTable = document.getElementById("nativeTableContainer");
    
    if(sFrame) sFrame.classList.toggle("hidden", m !== 'iframe'); 
    if(nTable) nTable.classList.toggle("hidden", m === 'iframe'); 
    
    if(m !== 'iframe') { 
        window.loadSheetData(); 
    } 
};

window.loadSheetData = async function() { 
    try { 
        const r = await fetch(SHEET_CSV_URL); 
        const t = await r.text(); 
        let rows = t.split(/\r?\n/).map(row => row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g,'').trim())); 
        
        let html="<thead><tr>"; 
        rows[0].forEach(c => html += `<th>${c}</th>`); 
        html+="</tr></thead><tbody>"; 
        
        for(let i=1; i<rows.length; i++) { 
            if(rows[i].length > 1) { 
                html+="<tr>"; 
                rows[0].forEach((_, j) => html += `<td>${rows[i][j]||""}</td>`); 
                html+="</tr>"; 
            } 
        } 
        
        const sTable = document.getElementById("sheetTable");
        if(sTable) {
            sTable.innerHTML = html + "</tbody>"; 
        }
    } catch(e) { 
        console.error(e); 
    } 
};

/* ==================== ALERTE GENERALE ==================== */
window.triggerGeneralAlert = async function() {
    const msg = document.getElementById("alertMessage").value || "ALERTE GÉNÉRALE DE LA DIRECTION !";
    if(!confirm("⚠️ Sûr de vouloir faire trembler l'écran de TOUTE l'équipe ?")) return;
    
    await setDoc(doc(db, "system", "global_alert"), {
        message: msg,
        triggeredBy: window.currentUserName,
        timestamp: Date.now()
    });
    document.getElementById("alertMessage").value = "";
};

onSnapshot(doc(db, "system", "global_alert"), (docSnap) => {
    if(docSnap.exists()) {
        const data = docSnap.data();
        if(Date.now() - data.timestamp < 10000) {
            executeScreenShake(data.message, data.triggeredBy);
        }
    }
});

function executeScreenShake(msg, author) {
    document.body.classList.add("shake-active");
    
    const modalHtml = `
    <div id="nukeAlertModal" class="alert-modal-overlay">
        <div class="alert-modal-box">
            <h1 style="color:var(--error); font-size:3.5em; margin:0; text-shadow: 0 0 20px var(--error);">🚨 ALERTE ! 🚨</h1>
            <p style="font-size:1.8em; font-weight:bold; color:var(--text);">${msg}</p>
            <p style="color:var(--subtext); margin-bottom: 30px;">Déclenché par : ${author}</p>
            <button onclick="stopScreenShake()" style="background:var(--error); font-size: 1.2em;">J'ai compris</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.stopScreenShake = function() {
    document.body.classList.remove("shake-active");
    const alertEl = document.getElementById("nukeAlertModal");
    if(alertEl) alertEl.remove();
};
