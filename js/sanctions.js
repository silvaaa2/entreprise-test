import { db } from "./firebase.js";
import { registerListener } from "./core.js";

import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import {
  getCurrentUserName,
  getCurrentUserEmail,
  getCurrentUserRole
} from "./user.js";

async function populateSanctionDropdown() {
  const select = document.getElementById("sancEmployee");
  if (!select) return;

  try {
    const snap = await getDocs(collection(db, "employees"));

    let html = `<option value="">-- Sélectionner --</option>`;

    snap.forEach((d) => {
      const data = d.data();
      if (data.email) {
        html += `<option value="${data.email}|${data.name}">${data.name} (${data.email})</option>`;
      }
    });

    select.innerHTML = html;
  } catch (e) {
    console.error("Erreur dropdown sanctions :", e);
  }
}

async function submitSanction() {
  const empData = document.getElementById("sancEmployee")?.value;
  const type = document.getElementById("sancType")?.value;
  const motif = document.getElementById("sancMotif")?.value.trim();
  const msg = document.getElementById("sancMsg");

  if (!empData || !motif) {
    if (msg) {
      msg.innerText = "Remplis tout";
      msg.style.color = "var(--warning)";
    }
    return;
  }

  const [email, name] = empData.split("|");

  try {
    await addDoc(collection(db, "sanctions"), {
      employeeEmail: email,
      employeeName: name,
      type,
      motif,
      issuedBy: getCurrentUserName(),
      createdAt: new Date().toISOString()
    });

    if (msg) {
      msg.innerText = "✅ Sanction ajoutée";
      msg.style.color = "var(--success)";
    }

    const motifInput = document.getElementById("sancMotif");
    const empInput = document.getElementById("sancEmployee");

    if (motifInput) motifInput.value = "";
    if (empInput) empInput.value = "";
  } catch (e) {
    console.error("Erreur sanction :", e);
    if (msg) {
      msg.innerText = "Erreur";
      msg.style.color = "var(--error)";
    }
  }
}

async function deleteSanction(id) {
  if (confirm("Supprimer cette sanction ?")) {
    try {
      await deleteDoc(doc(db, "sanctions", id));
    } catch (e) {
      console.error("Erreur suppression sanction :", e);
    }
  }
}

function fetchSanctions() {
  const tbody = document.getElementById("sanctionsListBody");
  if (!tbody) return;

  const unsubscribe = onSnapshot(
    query(collection(db, "sanctions"), orderBy("createdAt", "desc")),
    (snapshot) => {
      let html = "";

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        if (
          getCurrentUserRole() === "employee" &&
          data.employeeEmail !== getCurrentUserEmail()
        ) {
          return;
        }

        const dateStr = data.createdAt
          ? new Date(data.createdAt).toLocaleDateString("fr-FR")
          : "-";

        let actions = "-";
        if (getCurrentUserRole() === "admin" || getCurrentUserRole() === "rh") {
          actions = `<button onclick="deleteSanction('${id}')" style="background:var(--error); padding:5px; width:auto; font-size:0.8em; color:white; border:none; border-radius:3px;">🗑️</button>`;
        }

        html += `
          <tr>
            <td>${dateStr}</td>
            <td><b>${data.employeeName || ""}</b></td>
            <td>${data.type || ""}</td>
            <td>${data.motif || ""}</td>
            ${
              getCurrentUserRole() !== "employee"
                ? `<td>${actions}</td>`
                : ""
            }
          </tr>
        `;
      });

      tbody.innerHTML = html || "<tr><td colspan='5'>Aucune sanction</td></tr>";
    }
  );

  registerListener("sanctions", unsubscribe);
}

export {
  populateSanctionDropdown,
  submitSanction,
  fetchSanctions,
  deleteSanction
};
