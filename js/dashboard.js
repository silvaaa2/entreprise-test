import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { fetchUsers } from "./users.js";
import { fetchRequests } from "./requests.js";

let statsInterval = null;

function showSection(id) {
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });

  const target = document.getElementById(id);
  if (target) target.classList.add("active");

  if (id === "home") {
    updateDashboardStats();
  } else if (id === "users") {
    fetchUsers();
  } else if (id === "requests") {
    fetchRequests();
  }
}

function updateDashboardStats() {
  if (!statsInterval) {
    statsInterval = setInterval(() => {
      const dateEl = document.getElementById("statDate");
      const timeEl = document.getElementById("statTime");

      if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString("fr-FR");
      }

      if (timeEl) {
        timeEl.innerText = new Date().toLocaleTimeString("fr-FR");
      }
    }, 1000);
  }

  loadStats();
}

async function loadStats() {
  try {
    const empEl = document.getElementById("statEmployees");
    const usrEl = document.getElementById("statUsers");

    if (empEl) {
      const e = await getDocs(collection(db, "employees"));
      empEl.innerText = e.size;
    }

    if (usrEl) {
      const u = await getDocs(collection(db, "users"));
      usrEl.innerText = u.size;
    }
  } catch (e) {
    console.error("Erreur stats :", e);
  }
}

function toggleTheme() {
  document.body.classList.toggle("light-mode");

  const isLight = document.body.classList.contains("light-mode");
  localStorage.setItem("theme", isLight ? "light" : "dark");

  const btn = document.getElementById("themeBtn");
  if (btn) {
    btn.innerText = isLight ? "🌙 Mode Sombre" : "☀️ Mode Clair";
  }
}

function initTheme() {
  const saved = localStorage.getItem("theme");

  if (saved === "light") {
    document.body.classList.add("light-mode");

    const btn = document.getElementById("themeBtn");
    if (btn) {
      btn.innerText = "🌙 Mode Sombre";
    }
  }
}

export {
  showSection,
  updateDashboardStats,
  toggleTheme,
  initTheme
};
