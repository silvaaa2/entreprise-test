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
            window.currentUserName = data.displayName || "Admin";

            applyPermissions(data.role);
        }
    } catch (error) { console.error("Erreur profil:", error); }
}

function applyPermissions(role) {
    const btnUsers = document.getElementById("btn-users");
    const btnRh = document.getElementById("btn-rh");
    const btnCompta = document.getElementById("btn-compta");
    const btnDocs = document.getElementById("btn-docs");
    const statsGrid = document.querySelector(".stats-grid");
    const homeMsg = document.querySelector(".home-header p");
    const homeTitle = document.querySelector(".home-header h1");

    if(btnUsers) btnUsers.style.display = "none";
    if(btnRh) btnRh.style.display = "none";
    if(btnCompta) btnCompta.style.display = "none";
    if(btnDocs) btnDocs.style.display = "none"; 
    if(statsGrid) statsGrid.style.display = "none";
    
    if(role === 'admin') {
        if(btnUsers) btnUsers.style.display = "block";
        if(btnRh) btnRh.style.display = "block";
        if(btnCompta) btnCompta.style.display = "block";
        if(btnDocs) btnDocs.style.display = "block"; 
        if(statsGrid) statsGrid.style.display = "grid";
        if(homeTitle) homeTitle.innerText = "Bienvenue, Boss. 👋";
        if(homeMsg) homeMsg.innerText = "Voici l'état actuel de ton entreprise.";
        return;
    }

    if(homeTitle) homeTitle.innerText = "Bienvenue chez Mathieu"; 
    
    if (!role || role === 'guest') {
        if(homeMsg) homeMsg.innerText = "⛔ Ton compte n'a pas encore d'accès.";
        return; 
    }
    if(homeMsg) homeMsg.innerText = "Sélectionne un menu à gauche.";
    if(role === 'rh') if(btnRh) btnRh.style.display = "block";
    if(role === 'compta') if(btnCompta) btnCompta.style.display = "block";
}

/* ==================== ANNONCES ==================== */
let unsubscribeAnn = null;

window.postAnnouncement = async function() {
    const title = document.getElementById("annTitle").value;
    const content = document.getElementById("annContent").value;
    const msg = document.getElementById("annMsg");

    if(!title || !content) { msg.innerText = "Remplis tout !"; return; }
    msg.innerText = "Publication...";

    try {
        await addDoc(collection(db, "announcements"), {
            title: title,
            content: content,
            author: window.currentUserName,
            createdAt: new Date().toISOString()
        });
        msg.innerText = "✅ Publié !";
        document.getElementById("annTitle").value = "";
        document.getElementById("annContent").value = "";
    } catch(e) { msg.innerText = "Erreur: " + e.message; }
};

window.fetchAnnouncements = function() {
    const homeGrid = document.getElementById("homeAnnouncementsGrid");
    if(!homeGrid) return;
    if(unsubscribeAnn) return; 

    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    
    unsubscribeAnn = onSnapshot(q, (snapshot) => {
        let html = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            const dateStr = new Date(data.createdAt).toLocaleDateString('fr-FR');
            
            let deleteBtn = "";
            if(window.currentUserRole === 'admin' || window.currentUserRole === 'rh') {
                deleteBtn = `<span class="ann-delete" onclick="window.deleteAnnouncement('${id}')">❌ Supprimer</span>`;
            }

            html += `
            <div class="ann-card">
                <h4 class="ann-title">${data.title}</h4>
                <p class="ann-content">${data.content}</p>
                <div class="ann-footer">
                    <span>Par ${data.author} le ${dateStr}</span>
                    ${deleteBtn}
                </div>
            </div>`;
        });
        homeGrid.innerHTML = html || "<p style='color:var(--subtext);'>Aucune annonce pour le moment.</p>";
    });
};

window.deleteAnnouncement = async function(id) {
    if(!confirm("Supprimer cette annonce de l'accueil ?")) return;
    try { await deleteDoc(doc(db, "announcements", id)); } catch(e) { alert(e); }
};


/* ==================== RESSOURCES HUMAINES (POINTEUSE) ==================== */
let unsubscribeEmployees = null;
let liveServiceTimer = null; // Pour actualiser l'horloge en live

window.openNewEmployeeModal = function() { document.getElementById("newEmployeeModal").classList.remove("hidden"); };
window.closeNewEmployeeModal = function() { document.getElementById("newEmployeeModal").classList.add("hidden"); };

window.saveNewEmployee = async function() {
    const name = document.getElementById("ne_name").value;
    const grade = document.getElementById("ne_grade").value;
    const phone = document.getElementById("ne_phone").value;
    const salary = document.getElementById("ne_salary").value;
    const msg = document.getElementById("ne_msg");

    if(!name || !grade) { msg.innerText = "Nom et Grade obligatoires !"; return; }
    msg.innerText = "Création du dossier...";

    try {
        await addDoc(collection(db, "employees"), {
            name: name,
            grade: grade,
            phone: phone || "Non renseigné",
            salary: salary || "Non défini",
            status: "hors_service", // NOUVEAU: Par défaut, hors service
            totalServiceSeconds: 0, // NOUVEAU: Compteur de temps
            currentServiceStart: null, // NOUVEAU: Timestamp de début de service
            hiredDate: new Date().toISOString().split('T')[0],
            hrNotes: ""
        });
        msg.innerText = "✅ Dossier Créé !"; msg.style.color = "var(--success)";
        setTimeout(() => { closeNewEmployeeModal(); document.getElementById("ne_name").value = ""; msg.innerText = ""; }, 1000);
    } catch(e) { msg.innerText = "Erreur: " + e.message; }
};

window.fetchEmployees = function() {
    const tbody = document.getElementById("employeeListBody");
    if(!tbody) return;
    if(unsubscribeEmployees) return; 

    tbody.innerHTML = "<tr><td colspan='4'>Chargement en temps réel... 📡</td></tr>";

    const q = collection(db, "employees");
    
    unsubscribeEmployees = onSnapshot(q, (snapshot) => {
        let html = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            // Affichage du statut
            let badgeHtml = "";
            if(data.status === 'en_service') badgeHtml = `<span class="status-badge status-en_service">🟢 En service</span>`;
            else if(data.status === 'absent') badgeHtml = `<span class="status-badge status-absent">🔴 Absent/Malade</span>`;
            else if(data.status === 'vacation') badgeHtml = `<span class="status-badge status-vacation">🟠 En congés</span>`;
            else badgeHtml = `<span class="status-badge status-hors_service">⚪ Hors service</span>`;

            html += `<tr>
                <td>${badgeHtml}</td>
                <td><span class="clickable-name" onclick="window.openHrEmployeeModal('${id}')">${data.name}</span></td>
                <td><span style="color:#facc15;">${data.grade}</span></td>
                <td>${data.phone || "-"}</td>
            </tr>`;
        });
        tbody.innerHTML = html || "<tr><td colspan='4'>Aucun dossier employé.</td></tr>";
    });
};

/* --- FONCTION POUR FORMATER LE TEMPS --- */
function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h}h ${m}m`;
}

window.openHrEmployeeModal = async function(id) {
    const modal = document.getElementById("hrEmployeeModal");
    if(!modal) return;
    
    // Nettoyer l'ancien timer si on l'avait ouvert sur un autre
    if(liveServiceTimer) clearInterval(liveServiceTimer);

    document.getElementById("hre_name").innerText = "Chargement...";
    modal.classList.remove("hidden");
    
    try {
        const docSnap = await getDoc(doc(db, "employees", id));
        if(docSnap.exists()) {
            const data = docSnap.data();
            
            document.getElementById("hre_id").value = id;
            document.getElementById("hre_name").innerText = data.name;
            document.getElementById("hre_grade").innerText = data.grade;
            document.getElementById("hre_phone").innerText = data.phone || "N/A";
            document.getElementById("hre_salary").innerText = data.salary || "N/A";
            document.getElementById("hre_date").innerText = data.hiredDate || "N/A";
            document.getElementById("hre_status").value = data.status || "hors_service";
            document.getElementById("hre_notes").value = data.hrNotes || "";

            // --- GESTION DE LA POINTEUSE (LECTURE) ---
            document.getElementById("hre_old_status").value = data.status || "hors_service";
            document.getElementById("hre_total_seconds").value = data.totalServiceSeconds || 0;
            document.getElementById("hre_current_start").value = data.currentServiceStart || "";

            let baseSeconds = data.totalServiceSeconds || 0;
            let startTimestamp = data.currentServiceStart;

            // Fonction pour mettre à jour l'affichage en live
            const updateTimerDisplay = () => {
                let currentSeconds = baseSeconds;
                if (data.status === 'en_service' && startTimestamp) {
                    // Ajoute le temps écoulé depuis le début de son service
                    currentSeconds += Math.floor((Date.now() - startTimestamp) / 1000);
                }
                document.getElementById("hre_service_time").innerText = formatTime(currentSeconds);
            };

            // Appel immédiat
            updateTimerDisplay();
            
            // Si le gars est en service, on actualise l'horloge toutes les minutes
            if (data.status === 'en_service') {
                liveServiceTimer = setInterval(updateTimerDisplay, 60000);
            }
        }
    } catch(e) { alert("Erreur: " + e.message); }
};

window.closeHrEmployeeModal = function() { 
    if(liveServiceTimer) clearInterval(liveServiceTimer);
    document.getElementById("hrEmployeeModal").classList.add("hidden"); 
};

window.updateEmployeeDossier = async function() {
    const id = document.getElementById("hre_id").value;
    const newStatus = document.getElementById("hre_status").value;
    const newNotes = document.getElementById("hre_notes").value;

    const oldStatus = document.getElementById("hre_old_status").value;
    let totalSeconds = parseInt(document.getElementById("hre_total_seconds").value) || 0;
    let currentStart = document.getElementById("hre_current_start").value;

    let updates = {
        status: newStatus,
        hrNotes: newNotes
    };

    // --- LOGIQUE DE CALCUL DU TEMPS (LE CERVEAU) ---
    if (oldStatus !== 'en_service' && newStatus === 'en_service') {
        // Le mec commence son service ! On déclenche le chrono.
        updates.currentServiceStart = Date.now();
    } 
    else if (oldStatus === 'en_service' && newStatus !== 'en_service') {
        // Le mec termine son service ! On coupe le chrono et on additionne.
        if (currentStart) {
            const timeDiffSeconds = Math.floor((Date.now() - parseInt(currentStart)) / 1000);
            updates.totalServiceSeconds = totalSeconds + timeDiffSeconds;
        }
        updates.currentServiceStart = null; // Remise à zéro du départ
    }
    
    try {
        await updateDoc(doc(db, "employees", id), updates);
        closeHrEmployeeModal();
    } catch(e) { alert("Erreur de sauvegarde: " + e.message); }
};

window.deleteEmployeeDossier = async function() {
    const id = document.getElementById("hre_id").value;
    if(!confirm("⚠️ ATTENTION : Es-tu sûr de vouloir virer et supprimer cet employé des registres ?")) return;
    try { await deleteDoc(doc(db, "employees", id)); closeHrEmployeeModal(); } catch(e) { alert("Erreur: " + e.message); }
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
  if(!tbody) return;
  if(unsubscribeUsers) return;

  tbody.innerHTML = "<tr><td colspan='4'>Chargement en direct... 📡</td></tr>";
  const q = collection(db, "users");
  
  unsubscribeUsers = onSnapshot(q, (snapshot) => {
      let html = "";
      snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const uid = docSnap.id;
          const name = data.displayName || "Sans nom";
          
          const isSelectAdmin = data.role === 'admin' ? 'selected' : '';
          const isSelectRh = data.role === 'rh' ? 'selected' : '';
          const isSelectCompta = data.role === 'compta' ? 'selected' : '';
          const isSelectGuest = (!data.role || data.role === 'guest') ? 'selected' : '';

          const roleSelect = `
            <select onchange="window.updateUserRole('${uid}', this.value)" style="background:var(--panel); color:var(--text); border:1px solid var(--border); padding:5px; border-radius:5px;">
                <option value="guest" ${isSelectGuest}>⛔ Aucun accès</option>
                <option value="admin" ${isSelectAdmin}>👑 Admin</option>
                <option value="rh" ${isSelectRh}>🤝 RH</option>
                <option value="compta" ${isSelectCompta}>📊 Compta</option>
            </select>`;
          
          const deleteBtn = `<button onclick="window.deleteUser('${uid}')" style="background:#ef4444; width:auto; padding:5px 10px; font-size:0.8em;">🗑️ Exclure</button>`;
          const nameClickable = `<div onclick="window.openUserProfile('${uid}')" class="clickable-name">${name}</div>`;

          html += `<tr>
            <td>${nameClickable}<div style="font-size:0.8em; color:var(--subtext);">${data.email}</div></td>
            <td>${roleSelect}</td>
            <td>${data.createdAt || "-"}</td>
            <td>${deleteBtn}</td>
          </tr>`;
      });
      tbody.innerHTML = html;
  });
};

window.updateUserRole = async function(uid, newRole) { try { await updateDoc(doc(db, "users", uid), { role: newRole }); } catch (error) { alert("Erreur rôle : " + error.message); } };

window.deleteUser = async function(uid) {
    if (auth.currentUser && auth.currentUser.uid === uid) { alert("⚠️ Tu ne peux pas te supprimer toi-même ! Utilise les Paramètres."); return; }
    if(!confirm("⚠️ EXCLURE définitivement cette personne ?")) return;
    try { await deleteDoc(doc(db, "users", uid)); } catch (error) { alert("Erreur: " + error.message); }
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
            document.getElementById("m_date").innerText = data.createdAt || "Inconnue";
            document.getElementById("m_uid").innerText = uid;

            let roleText = "Invité";
            if(data.role === 'admin') roleText = "👑 Administrateur";
            if(data.role === 'rh') roleText = "🤝 Ressources Humaines";
            if(data.role === 'compta') roleText = "📊 Comptable";
            if(data.role === 'guest' || !data.role) roleText = "⛔ Aucun accès";
            document.getElementById("m_role").innerText = roleText;
        }
    } catch(e) { console.error(e); }
};
window.closeUserProfile = function() { document.getElementById("profileModal").classList.add("hidden"); };


/* ==================== AUTRES (DOCS / COMPTA / PARAMETRES) ==================== */
let unsubscribeDocs = null;
window.createAdminDoc = async function() {
    const title = document.getElementById("docTitle").value;
    const content = document.getElementById("docContent").value;
    const msg = document.getElementById("docMsg");
    if(!title || !content) { msg.innerText = "Remplis tout !"; return; }
    try {
        await addDoc(collection(db, "admin_docs"), { title: title, content: content, createdAt: new Date().toISOString() });
        msg.innerText = "✅ Sauvegardé !"; document.getElementById("docTitle").value = ""; document.getElementById("docContent").value = "";
    } catch(e) { msg.innerText = "Erreur: " + e.message; }
};

window.fetchAdminDocs = function() {
    const container = document.getElementById("docsGrid");
    if(!container || unsubscribeDocs) return; 
    const q = query(collection(db, "admin_docs"), orderBy("createdAt", "desc"));
    unsubscribeDocs = onSnapshot(q, (snapshot) => {
        let html = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            html += `<div class="doc-card"><div class="doc-icon">📁</div><h4>${data.title}</h4><p>${data.content}</p><button onclick="window.deleteAdminDoc('${docSnap.id}')" class="delete-doc-btn">Supprimer</button></div>`;
        });
        container.innerHTML = html || "<p>Aucun document.</p>";
    });
};

window.deleteAdminDoc = async function(id) { if(confirm("Supprimer ce document ?")) await deleteDoc(doc(db, "admin_docs", id)); };

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
    const msg = document.getElementById("settingsMsg");
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(doc(db, "users", user.uid), { displayName: newName, photoURL: newPhotoURL || "" }, { merge: true });
        msg.innerText = "✅ Sauvegardé !"; msg.style.color = "var(--success)";
        document.getElementById("sidebarUserName").innerText = newName;
        document.getElementById("sidebarUserImg").src = newPhotoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    } catch (error) { msg.innerText = "Erreur."; }
};

window.deleteMyAccount = async function() {
    const user = auth.currentUser;
    if (!user) return;
    if (!confirm("⚠️ DÉFINITIF.\nVeux-tu continuer ?") || !confirm("Vraiment sûr ?")) return;
    try { await deleteDoc(doc(db, "users", user.uid)); await deleteUser(user); alert("Adieu ! 👋"); window.location.reload(); } 
    catch (error) { if (error.code === 'auth/requires-recent-login') { alert("🔒 Reconnecte-toi d'abord."); await signOut(auth); } }
};

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
    } catch (e) { }
};

/* COMPTA (Inchangée) */
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
