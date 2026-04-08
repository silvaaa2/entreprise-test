import { db } from "./firebase.js";
import { registerListener } from "./core.js";

import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  query,
  orderBy,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import {
  getCurrentUserName,
  getCurrentUserEmail,
  getCurrentUserRole
} from "./user.js";

async function submitRequest() {
  const type = document.getElementById("reqType")?.value;
  const dates = document.getElementById("reqDates")?.value.trim();
  const motif = document.getElementById("reqMotif")?.value.trim();
  const msg = document.getElementById("reqMsg");

  if (!dates || !motif) {
    if (msg) {
      msg.innerText = "Remplis tout !";
      msg.style.color = "var(--warning)";
    }
    return;
  }

  try {
    await addDoc(collection(db, "requests"), {
      employeeName: getCurrentUserName(),
      employeeEmail: getCurrentUserEmail(),
      type,
      dates,
      motif,
      status: "pending",
      createdAt: new Date().toISOString()
    });

    if (msg) {
      msg.innerText = "✅ Demande envoyée !";
      msg.style.color = "var(--success)";
    }

    const datesInput = document.getElementById("reqDates");
    const motifInput = document.getElementById("reqMotif");
    if (datesInput) datesInput.value = "";
    if (motifInput) motifInput.value = "";
  } catch (e) {
    console.error("Erreur demande :", e);
    if (msg) {
      msg.innerText = "Erreur";
      msg.style.color = "var(--error)";
    }
  }
}

function fetchRequests() {
  const tbody = document.getElementById("requestsListBody");
  if (!tbody) return;

  const unsubscribe = onSnapshot(
    query(collection(db, "requests"), orderBy("createdAt", "desc")),
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

        let badge = `<span class="status-badge status-pending">⏳ En attente</span>`;
        if (data.status === "approved") {
          badge = `<span class="status-badge status-en_service">✅ Approuvé</span>`;
        } else if (data.status === "rejected") {
          badge = `<span class="status-badge status-absent">❌ Refusé</span>`;
        }

        let actions = "-";

        if (
          data.status === "pending" &&
          (getCurrentUserRole() === "admin" || getCurrentUserRole() === "rh")
        ) {
          actions = `
            <button onclick="updateRequest('${id}', 'approved', '${data.employeeEmail}', '${data.type}')" style="background:var(--success); padding:5px; width:auto; font-size:0.8em; margin-right:5px; color:white; border:none; border-radius:3px;">✔️</button>
            <button onclick="updateRequest('${id}', 'rejected', '${data.employeeEmail}', '${data.type}')" style="background:var(--error); padding:5px; width:auto; font-size:0.8em; color:white; border:none; border-radius:3px;">❌</button>
          `;
        }

        html += `
          <tr>
            <td>${dateStr}</td>
            <td><b>${data.employeeName || ""}</b></td>
            <td>
              <span style="color:var(--accent); font-weight:bold;">${data.type || ""}</span><br>
              <small>${data.dates || ""}</small><br>
              <i>"${data.motif || ""}"</i>
            </td>
            <td>${badge}</td>
            ${getCurrentUserRole() !== "employee" ? `<td>${actions}</td>` : ""}
          </tr>
        `;
      });

      tbody.innerHTML = html || "<tr><td colspan='5'>Aucune demande</td></tr>";
    }
  );

  registerListener("requests", unsubscribe);
}

async function updateRequest(id, status, email, type) {
  try {
    await updateDoc(doc(db, "requests", id), { status });

    if (status === "approved" && type === "Vacances") {
      const snap = await getDocs(
        query(collection(db, "employees"), where("email", "==", email))
      );

      if (!snap.empty) {
        await updateDoc(doc(db, "employees", snap.docs[0].id), {
          status: "vacation"
        });
      }
    }
  } catch (e) {
    console.error("Erreur update request :", e);
  }
}

export {
  submitRequest,
  fetchRequests,
  updateRequest
};
