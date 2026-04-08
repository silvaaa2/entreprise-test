import { db } from "./firebase.js";
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

let currentUserRole = null;
let currentUserName = null;
let currentUserEmail = null;

async function loadUserProfile(user) {
  try {
    const docRef = doc(db, "users", user.uid);
    let docSnap = await getDoc(docRef);

    if (user.email === SUPER_ADMIN && (!docSnap.exists() || docSnap.data().role !== "admin")) {
      await setDoc(
        docRef,
        {
          email: user.email,
          role: "admin",
          displayName: "Le Boss",
          photoURL: "",
          createdAt: new Date().toISOString().split("T")[0]
        },
        { merge: true }
      );

      location.reload();
      return;
    }

    if (!docSnap.exists()) {
      const q = await getDocs(
        query(collection(db, "users"), where("email", "==", user.email))
      );

      if (!q.empty) {
        const existingDoc = q.docs[0];

        await setDoc(docRef, {
          ...existingDoc.data(),
          displayName: user.displayName || existingDoc.data().displayName || "Utilisateur",
          photoURL: user.photoURL || existingDoc.data().photoURL || "",
          uid: user.uid
        });

        await deleteDoc(existingDoc.ref);
      } else {
        await setDoc(docRef, {
          email: user.email,
          displayName: user.displayName || "Utilisateur",
          photoURL: user.photoURL || "",
          role: "guest",
          createdAt: new Date().toISOString().split("T")[0]
        });
      }

      docSnap = await getDoc(docRef);
    }

    const data = docSnap.data();

    const sidebarName = document.getElementById("sidebarUserName");
    if (sidebarName) {
      sidebarName.innerText = data.displayName || "Utilisateur";
    }

    const img = document.getElementById("sidebarUserImg");
    if (img) {
      img.src = data.photoURL || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
    }

    currentUserRole = data.role || "guest";
    currentUserName = data.displayName || "Utilisateur";
    currentUserEmail = data.email || user.email || "";

    applyPermissions(currentUserRole);
  } catch (e) {
    console.error("Erreur profil :", e);
  }
}

function applyPermissions(role) {
  const menusToHide = [
    "btn-users",
    "btn-rh",
    "btn-compta",
    "btn-docs",
    "btn-factures",
    "btn-service",
    "btn-requests",
    "btn-sanctions",
    "btn-chat",
    "btn-kanban",
    "admin-title-menu",
    "perso-title-menu"
  ];

  menusToHide.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  if (role === "admin") {
    menusToHide.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "";
    });
  } else if (role === "employee") {
    [
      "btn-service",
      "btn-requests",
      "btn-sanctions",
      "btn-chat",
      "btn-kanban",
      "perso-title-menu"
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "";
    });
  } else if (role === "rh") {
    [
      "btn-rh",
      "btn-service",
      "btn-requests",
      "btn-sanctions",
      "btn-chat",
      "btn-kanban",
      "admin-title-menu",
      "perso-title-menu"
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "";
    });
  } else if (role === "compta") {
    [
      "btn-compta",
      "btn-factures",
      "btn-chat",
      "btn-kanban",
      "admin-title-menu"
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "";
    });
  }

  const homeMessage = document.querySelector(".home-header p");
  if (homeMessage) {
    if (role === "admin") {
      homeMessage.innerText = "Voici l'état actuel de ton entreprise.";
    } else if (role === "employee") {
      homeMessage.innerText = "N'oublie pas de pointer pour commencer ta journée.";
    } else if (role === "rh" || role === "compta") {
      homeMessage.innerText = "Sélectionne un menu pour travailler.";
    } else {
      homeMessage.innerText = "⛔ Ton compte n'a pas encore d'accès. Demande à ton Boss.";
    }
  }
}

function getCurrentUserRole() {
  return currentUserRole;
}

function getCurrentUserName() {
  return currentUserName;
}

function getCurrentUserEmail() {
  return currentUserEmail;
}

export {
  loadUserProfile,
  applyPermissions,
  getCurrentUserRole,
  getCurrentUserName,
  getCurrentUserEmail
};
