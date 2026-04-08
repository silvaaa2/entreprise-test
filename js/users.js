import { db } from "./firebase.js";
import { getCurrentUserName } from "./user.js";

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import { firebaseConfig } from "./firebase.js";

let unsubscribeUsers = null;

// ================= CREATE USER =================
async function createNewUser() {
  const email = document.getElementById("newEmail").value;
  const password = document.getElementById("newPassword").value;
  const role = document.getElementById("newRole").value;
  const msg = document.getElementById("userMsg");

  if (!email || !password) {
    msg.innerText = "Remplis tout !";
    return;
  }

  msg.innerText = "Création...";

  try {
    const secondaryApp = initializeApp(firebaseConfig, "Secondary");
    const secondaryAuth = getAuth(secondaryApp);

    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      email: email,
      role: role,
      createdAt: new Date().toISOString().split("T")[0],
      displayName: "En attente",
      photoURL: ""
    });

    await signOut(secondaryAuth);

    msg.innerText = "✅ Utilisateur ajouté";
    msg.style.color = "var(--success)";

  } catch (error) {
    msg.innerText = "Erreur : " + error.message;
  }
}

// ================= FETCH USERS =================
function fetchUsers() {
  const tbody = document.getElementById("userListBody");

  if (!tbody || unsubscribeUsers) return;

  tbody.innerHTML = "<tr><td colspan='4'>Chargement...</td></tr>";

  unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
    let html = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const uid = docSnap.id;

      const roleSelect = `
        <select onchange="updateUserRole('${uid}', this.value, '${data.email}')">
          <option value="guest" ${data.role === "guest" ? "selected" : ""}>⛔ Aucun</option>
          <option value="employee" ${data.role === "employee" ? "selected" : ""}>👷 Employé</option>
          <option value="rh" ${data.role === "rh" ? "selected" : ""}>🤝 RH</option>
          <option value="compta" ${data.role === "compta" ? "selected" : ""}>📊 Compta</option>
          <option value="admin" ${data.role === "admin" ? "selected" : ""}>👑 Admin</option>
        </select>
      `;

      html += `
        <tr>
          <td onclick="openUserProfile('${uid}')" class="clickable-name">
            ${data.displayName || "Sans nom"}<br>
            <small>${data.email}</small>
          </td>
          <td>${roleSelect}</td>
          <td>${data.createdAt || "-"}</td>
          <td>
            <button onclick="deleteUser('${uid}', '${data.email}')">🗑️</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  });
}

// ================= UPDATE ROLE =================
async function updateUserRole(uid, newRole, email) {
  await updateDoc(doc(db, "users", uid), { role: newRole });
}

// ================= DELETE =================
async function deleteUser(uid, email) {
  if (confirm("Supprimer cet utilisateur ?")) {
    await deleteDoc(doc(db, "users", uid));
  }
}

// ================= PROFILE =================
async function openUserProfile(uid) {
  const modal = document.getElementById("profileModal");
  modal.classList.remove("hidden");

  const snap = await getDocs(collection(db, "users"));
  snap.forEach((d) => {
    if (d.id === uid) {
      const data = d.data();

      document.getElementById("m_name").innerText = data.displayName;
      document.getElementById("m_email").innerText = data.email;
      document.getElementById("m_uid").innerText = uid;
    }
  });
}

function closeUserProfile() {
  document.getElementById("profileModal").classList.add("hidden");
}

export {
  createNewUser,
  fetchUsers,
  updateUserRole,
  deleteUser,
  openUserProfile,
  closeUserProfile
};
