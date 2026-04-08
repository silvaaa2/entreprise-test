import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { fetchUsers } from "./users.js";
import { fetchRequests } from "./requests.js";
import { fetchSanctions, populateSanctionDropdown } from "./sanctions.js";
import { fetchEmployees } from "./employees.js";
import { loadMyService } from "./pointage.js";

import {
  clearAllListeners,
  clearIntervals,
  registerInterval
} from "./core.js";

import { getCache, setCache } from "./cache.js";
import { getCurrentUserRole } from "./user.js";

let currentSection = null;
let statsClockStarted = false;

const sectionPermissions = {
  home: ["admin", "employee", "rh", "compta", "guest"],
  service: ["admin", "employee", "rh"],
  requests: ["admin", "employee", "rh"],
  sanctions: ["admin", "employee", "rh"],
  chat: ["admin", "employee", "rh", "compta"],
  kanban: ["admin", "employee", "rh", "compta"],
  users: ["admin"],
  rh: ["admin", "rh"],
  compta: ["admin", "compta"],
  factures: ["admin", "compta"],
  docs: ["admin"],
  logs: ["admin"],
  settings: ["admin", "employee", "rh", "compta", "guest"]
};

function canAccessSection(sectionId) {
  const role = getCurrentUserRole() || "guest";
  const allowedRoles = sectionPermissions[sectionId] || [];
  return allowedRoles.includes(role);
}

function showSection(id) {
  if (!canAccessSection(id)) {
    console.warn(`Accès refusé à la section : ${id}`);
    return;
  }

  if (currentSection === id) return;

  currentSection = id;

  clearAllListeners();
  clearIntervals();
  statsClockStarted = false;

  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });

  const target = document.getElementById(id);
  if (target) target.classList.add("active");

  if (id === "home") {
    updateDashboardStats();
  } 
  else if (id === "users") {
    fetchUsers();
  } 
  else if (id === "requests") {
    fetchRequests();
  } 
  else if (id === "sanctions") {
    fetchSanctions();
    populateSanctionDropdown();
  }
  else if (id === "rh") {
    fetchEmployees();
  }
  else if (id === "service") {
    loadMyService();
  }
}

function updateDashboardStats() {
  startClock();
  loadStats();
}

function startClock() {
  if (statsClockStarted) return;

  const interval = setInterval(() => {
    const dateEl = document.getElementById("statDate");
    const timeEl = document.getElementById("statTime");

    if (dateEl) {
      dateEl.innerText = new Date().toLocaleDateString("fr-FR");
    }

    if (timeEl) {
      timeEl.innerText = new Date().toLocaleTimeString("fr-FR");
    }
  }, 1000);

  registerInterval("dashboard_clock", interval);
  statsClockStarted = true;
}

async function loadStats() {
  try {
    const empEl = document.getElementById("statEmployees");
    const usrEl = document.getElementById("statUsers");

    const cachedStats = getCache("dashboard_stats");

    if (cachedStats) {
      if (empEl) empEl.innerText = cachedStats.employees;
      if (usrEl) usrEl.innerText = cachedStats.users;
      return;
    }

    const [employeesSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, "employees")),
      getDocs(collection(db, "users"))
    ]);

    const stats = {
      employees: employeesSnap.size,
      users: usersSnap.size
    };

    setCache("dashboard_stats", stats, 20000);

    if (empEl) empEl.innerText = stats.employees;
    if (usrEl) usrEl.innerText = stats.users;
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
  initTheme,
  canAccessSection
};
