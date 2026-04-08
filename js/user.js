import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const SUPER_ADMIN = "dr947695@gmail.com";

// variables globales propres
let currentUserRole = null;
let currentUserName = null;
let currentUserEmail = null;

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
        await setDoc(docRef, {
          ...existingDoc.data(),
          displayName: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid
        });
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

    document.getElementById("sidebarUserName").innerText = data.displayName || "Utilisateur";

    const img = document.getElementById("sidebarUserImg");
    if (img) {
      img.src = data.photoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    }

    currentUserRole = data.role;
    currentUserName = data.displayName || "Utilisateur";
    currentUserEmail = data.email;

    applyPermissions(data.role);

  } catch (e) {
    console.error("Erreur profil:", e);
  }
}

function applyPermissions(role) {
  const menusToHide = [
    "btn-users", "btn-rh", "btn-compta", "btn-docs", "btn-factures",
    "btn-service", "btn-requests", "btn-sanctions", "btn-chat", "btn-kanban",
    "admin-title-menu", "perso-title-menu"
  ];

  menusToHide.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  if (role === 'admin') {
    menusToHide.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "";
    });
  }

  if (role === 'employee') {
    ["btn-service", "btn-requests", "btn-sanctions", "btn-chat", "btn-kanban", "perso-title-menu"]
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "";
      });
  }

  if (role === 'rh') {
    ["btn-rh", "btn-service", "btn-requests", "btn-sanctions", "btn-chat", "btn-kanban", "admin-title-menu"]
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "";
      });
  }

  if (role === 'compta') {
    ["btn-compta", "btn-factures", "btn-chat", "btn-kanban", "admin-title-menu"]
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "";
      });
  }
}

export {
  loadUserProfile,
  currentUserRole,
  currentUserName,
  currentUserEmail
};
