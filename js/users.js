import { db, firebaseConfig } from "./firebase.js";
import { registerListener } from "./core.js";
import { clearCache } from "./cache.js";
import { requirePermission } from "./permissions.js";

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

async function createNewUser() {
  if (!requirePermission("manage_users", "Tu n'as pas le droit de créer des utilisateurs.")) return;

  const email = document.getElementById("newEmail")?.value.trim();
  const password = document.getElementById("newPassword")?.value;
  const role = document.getElementById("newRole")?.value;
  const msg = document.getElementById("userMsg");

  if (!email || !password) {
    if (msg) {
      msg.innerText = "Remplis tout !";
      msg.style.color = "var(--warning)";
    }
    return;
  }

  if (msg) {
    msg.innerText = "Création...";
    msg.style.color = "var(--text)";
  }

  try {
    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = getAuth(secondaryApp);

    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      role,
      createdAt: new Date().toISOString().split("T")[0],
      displayName: "En attente",
      photoURL: ""
    });

    clearCache("dashboard_stats");
    await signOut(secondaryAuth);

    if (msg) {
      msg.innerText = "✅ Utilisateur ajouté";
      msg.style.color = "var(--success)";
    }

    const emailInput = document.getElementById("newEmail");
    const passInput = document.getElementById("newPassword");
    const roleInput = document.getElementById("newRole");

    if (emailInput) emailInput.value = "";
    if (passInput) passInput.value = "";
    if (roleInput) roleInput.value = "guest";
  } catch (error) {
    console.error("Erreur création utilisateur :", error);
    if (msg) {
      msg.innerText = "Erreur : " + error.message;
      msg.style.color = "var(--error)";
    }
  }
}

function fetchUsers() {
  if (!requirePermission("manage_users", "Tu n'as pas accès à la gestion des utilisateurs.")) return;

  const tbody = document.getElementById("userListBody");
  if (!tbody) return;

  tbody.innerHTML = "<tr><td colspan='4'>Chargement...</td></tr>";

  const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
    let html = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const uid = docSnap.id;

      const roleValue = data.role || "guest";
      const safeEmail = (data.email || "").replace(/'/g, "\\'");

      const roleSelect = `
        <select onchange="updateUserRole('${uid}', this.value, '${safeEmail}')" style="background:var(--panel); color:var(--text); border:1px solid var(--glass-border); padding:5px; border-radius:5px;">
          <option value="guest" ${roleValue === "guest" ? "selected" : ""}>⛔ Aucun accès</option>
          <option value="employee" ${roleValue === "employee" ? "selected" : ""}>👷 Employé</option>
          <option value="rh" ${roleValue === "rh" ? "selected" : ""}>🤝 RH</option>
          <option value="compta" ${roleValue === "compta" ? "selected" : ""}>📊 Compta</option>
          <option value="admin" ${roleValue === "admin" ? "selected" : ""}>👑 Admin</option>
        </select>
      `;

      html += `
        <tr>
          <td>
            <div onclick="openUserProfile('${uid}')" class="clickable-name">${data.displayName || "Sans nom"}</div>
            <div style="font-size:0.8em; color:var(--subtext);">${data.email || ""}</div>
          </td>
          <td>${roleSelect}</td>
          <td>${data.createdAt || "-"}</td>
          <td>
            <button onclick="deleteUser('${uid}', '${safeEmail}')" style="background:#ef4444; width:auto; padding:5px 10px; font-size:0.8em; color:white; border:none; border-radius:5px;">
              🗑️ Exclure
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html || "<tr><td colspan='4'>Aucun utilisateur</td></tr>";
  });

  registerListener("users", unsubscribe);
}

async function updateUserRole(uid, newRole, email) {
  if (!requirePermission("manage_users", "Tu n'as pas le droit de modifier les rôles.")) return;

  try {
    await updateDoc(doc(db, "users", uid), { role: newRole });
    clearCache("dashboard_stats");
  } catch (e) {
    console.error("Erreur update rôle :", e);
  }
}

async function deleteUser(uid, email) {
  if (!requirePermission("manage_users", "Tu n'as pas le droit de supprimer des utilisateurs.")) return;

  if (confirm(`Supprimer ${email} ?`)) {
    try {
      await deleteDoc(doc(db, "users", uid));
      clearCache("dashboard_stats");
    } catch (e) {
      console.error("Erreur suppression utilisateur :", e);
    }
  }
}

async function openUserProfile(uid) {
  if (!requirePermission("manage_users", "Tu n'as pas accès aux profils utilisateurs.")) return;

  const modal = document.getElementById("profileModal");
  if (modal) modal.classList.remove("hidden");

  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return;

    const data = snap.data();

    const nameEl = document.getElementById("m_name");
    const emailEl = document.getElementById("m_email");
    const uidEl = document.getElementById("m_uid");
    const roleEl = document.getElementById("m_role");
    const dateEl = document.getElementById("m_date");
    const imgEl = document.getElementById("m_photo");

    if (nameEl) nameEl.innerText = data.displayName || "Sans nom";
    if (emailEl) emailEl.innerText = data.email || "";
    if (uidEl) uidEl.innerText = uid;
    if (dateEl) dateEl.innerText = data.createdAt || "-";

    let roleText = "⛔ Invité";
    if (data.role === "admin") roleText = "👑 Admin";
    else if (data.role === "rh") roleText = "🤝 RH";
    else if (data.role === "employee") roleText = "👷 Employé";
    else if (data.role === "compta") roleText = "📊 Compta";

    if (roleEl) roleEl.innerText = roleText;
    if (imgEl) {
      imgEl.src = data.photoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    }
  } catch (e) {
    console.error("Erreur profil utilisateur :", e);
  }
}

function closeUserProfile() {
  const modal = document.getElementById("profileModal");
  if (modal) modal.classList.add("hidden");
}

export {
  createNewUser,
  fetchUsers,
  updateUserRole,
  deleteUser,
  openUserProfile,
  closeUserProfile
};
