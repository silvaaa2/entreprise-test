import { db } from "./firebase.js";
import { registerListener } from "./core.js";
import { clearCache } from "./cache.js";
import { requirePermission } from "./permissions.js";

import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

function openNewEmployeeModal() {
  if (!requirePermission("manage_employees", "Tu n'as pas le droit d'ouvrir ce formulaire.")) return;

  const modal = document.getElementById("newEmployeeModal");
  if (modal) modal.classList.remove("hidden");
}

function closeNewEmployeeModal() {
  const modal = document.getElementById("newEmployeeModal");
  if (modal) modal.classList.add("hidden");
}

async function saveNewEmployee() {
  if (!requirePermission("manage_employees", "Tu n'as pas le droit de créer un employé.")) return;

  const name = document.getElementById("ne_name")?.value.trim();
  const email = document.getElementById("ne_email")?.value.trim();
  const grade = document.getElementById("ne_grade")?.value.trim();
  const phone = document.getElementById("ne_phone")?.value.trim();
  const salary = document.getElementById("ne_salary")?.value.trim();

  const msg = document.getElementById("ne_msg");

  if (!name || !email) {
    if (msg) {
      msg.innerText = "Nom et email obligatoires";
      msg.style.color = "var(--warning)";
    }
    return;
  }

  try {
    await addDoc(collection(db, "employees"), {
      name,
      email,
      grade,
      phone,
      salary,
      status: "hors_service",
      hiredDate: new Date().toISOString().split("T")[0],
      weeklyServiceSeconds: 0,
      currentServiceStart: null,
      lastSessionSeconds: 0,
      currentWeek: "",
      hrNotes: ""
    });

    clearCache("dashboard_stats");

    if (msg) {
      msg.innerText = "✅ Employé créé";
      msg.style.color = "var(--success)";
    }

    const ids = ["ne_name", "ne_email", "ne_grade", "ne_phone", "ne_salary"];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    closeNewEmployeeModal();
  } catch (e) {
    console.error("Erreur création employé :", e);
    if (msg) {
      msg.innerText = "Erreur";
      msg.style.color = "var(--error)";
    }
  }
}

function fetchEmployees() {
  if (!requirePermission("manage_employees", "Tu n'as pas accès aux employés.")) return;

  const tbody = document.getElementById("employeeListBody");
  if (!tbody) return;

  const unsubscribe = onSnapshot(collection(db, "employees"), (snap) => {
    let html = "";

    snap.forEach((d) => {
      const data = d.data();

      let status = "⚪ Hors service";
      if (data.status === "en_service") status = "🟢 En service";
      if (data.status === "absent") status = "🔴 Absent";
      if (data.status === "vacation") status = "🟠 Congé";

      html += `
        <tr>
          <td>${status}</td>
          <td onclick="openHrEmployeeModal('${d.id}')" class="clickable-name">
            ${data.name || ""}
          </td>
          <td>${data.grade || ""}</td>
          <td>${data.phone || ""}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html || "<tr><td colspan='4'>Aucun employé</td></tr>";
  });

  registerListener("employees", unsubscribe);
}

async function openHrEmployeeModal(id) {
  if (!requirePermission("manage_employees", "Tu n'as pas accès à ce dossier employé.")) return;

  const modal = document.getElementById("hrEmployeeModal");
  if (modal) modal.classList.remove("hidden");

  try {
    const snap = await getDoc(doc(db, "employees", id));
    if (!snap.exists()) return;

    const data = snap.data();

    const setValue = (idEl, value) => {
      const el = document.getElementById(idEl);
      if (el) el.value = value ?? "";
    };

    const setText = (idEl, value) => {
      const el = document.getElementById(idEl);
      if (el) el.innerText = value ?? "";
    };

    setValue("hre_id", id);
    setText("hre_name", data.name || "");
    setText("hre_grade", data.grade || "");
    setText("hre_phone", data.phone || "");
    setText("hre_salary", data.salary || "");
    setText("hre_date", data.hiredDate || "");
    setValue("hre_email", data.email || "");
    setValue("hre_status", data.status || "hors_service");
    setValue("hre_notes", data.hrNotes || "");

    const timeEl = document.getElementById("hre_service_time");
    if (timeEl) {
      const seconds = data.weeklyServiceSeconds || 0;
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      timeEl.innerText = `${h}h ${m}m`;
    }

    const logsBox = document.getElementById("hre_timelogs");
    if (logsBox) {
      const logsSnap = await getDocs(
        query(collection(db, "timelogs"), where("employeeId", "==", id))
      );

      let logsHtml = "";

      logsSnap.forEach((logDoc) => {
        const log = logDoc.data();
        logsHtml += `
          <div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <b>${log.date || "-"}</b> — ${log.durationText || "-"}
          </div>
        `;
      });

      logsBox.innerHTML = logsHtml || "<p style='color:var(--subtext); margin:0;'>Aucun historique.</p>";
    }
  } catch (e) {
    console.error("Erreur modal employé :", e);
  }
}

async function updateEmployeeDossier() {
  if (!requirePermission("manage_employees", "Tu n'as pas le droit de modifier un employé.")) return;

  const id = document.getElementById("hre_id")?.value;
  if (!id) return;

  try {
    await updateDoc(doc(db, "employees", id), {
      email: document.getElementById("hre_email")?.value.trim() || "",
      status: document.getElementById("hre_status")?.value || "hors_service",
      hrNotes: document.getElementById("hre_notes")?.value || ""
    });

    closeHrEmployeeModal();
  } catch (e) {
    console.error("Erreur update employé :", e);
  }
}

async function deleteEmployeeDossier() {
  if (!requirePermission("manage_employees", "Tu n'as pas le droit de supprimer un employé.")) return;

  const id = document.getElementById("hre_id")?.value;
  if (!id) return;

  if (confirm("Supprimer cet employé ?")) {
    try {
      await deleteDoc(doc(db, "employees", id));
      clearCache("dashboard_stats");
      closeHrEmployeeModal();
    } catch (e) {
      console.error("Erreur suppression employé :", e);
    }
  }
}

function closeHrEmployeeModal() {
  const modal = document.getElementById("hrEmployeeModal");
  if (modal) modal.classList.add("hidden");
}

export {
  openNewEmployeeModal,
  closeNewEmployeeModal,
  saveNewEmployee,
  fetchEmployees,
  openHrEmployeeModal,
  updateEmployeeDossier,
  deleteEmployeeDossier,
  closeHrEmployeeModal
};
