import { db } from "./firebase.js";
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

// ================= DROPDOWN =================
async function populateSanctionDropdown() {
  const select = document.getElementById("sancEmployee");
  if (!select) return;

  const snap = await getDocs(collection(db, "employees"));

  let html = `<option value="">-- Sélectionner --</option>`;

  snap.forEach((d) => {
    const data = d.data();
    html += `<option value="${data.email}|${data.name}">
      ${data.name} (${data.email})
    </option>`;
  });

  select.innerHTML = html;
}

// ================= CREATE =================
async function submitSanction() {
  const empData = document.getElementById("sancEmployee").value;
  const type = document.getElementById("sancType").value;
  const motif = document.getElementById("sancMotif").value;
  const msg = document.getElementById("sancMsg");

  if (!empData || !motif) {
    msg.innerText = "Remplis tout";
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

    msg.innerText = "✅ Sanction ajoutée";
    msg.style.color = "var(--success)";

    document.getElementById("sancMotif").value = "";
    document.getElementById("sancEmployee").value = "";

  } catch (e) {
    msg.innerText = "Erreur";
  }
}

// ================= DELETE =================
async function deleteSanction(id) {
  if (confirm("Supprimer cette sanction ?")) {
    await deleteDoc(doc(db, "sanctions", id));
  }
}

// ================= FETCH =================
let unsubSanctions = null;

function fetchSanctions() {
  if (unsubSanctions) return;

  unsubSanctions = onSnapshot(
    query(collection(db, "sanctions"), orderBy("createdAt", "desc")),
    (snapshot) => {
      let html = "";

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        // filtre employé
        if (
          getCurrentUserRole() === "employee" &&
          data.employeeEmail !== getCurrentUserEmail()
        ) {
          return;
        }

        const dateStr = new Date(data.createdAt).toLocaleDateString("fr-FR");

        let actions = "-";

        if (
          getCurrentUserRole() === "admin" ||
          getCurrentUserRole() === "rh"
        ) {
          actions = `<button onclick="deleteSanction('${id}')">🗑️</button>`;
        }

        html += `
          <tr>
            <td>${dateStr}</td>
            <td><b>${data.employeeName}</b></td>
            <td>${data.type}</td>
            <td>${data.motif}</td>
            ${
              getCurrentUserRole() !== "employee"
                ? `<td>${actions}</td>`
                : ""
            }
          </tr>
        `;
      });

      const tbody = document.getElementById("sanctionsListBody");
      if (tbody) {
        tbody.innerHTML =
          html || "<tr><td colspan='5'>Aucune sanction</td></tr>";
      }
    }
  );
}

export {
  populateSanctionDropdown,
  submitSanction,
  fetchSanctions,
  deleteSanction
};
