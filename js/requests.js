import { db } from "./firebase.js";
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

// ================= CREATE REQUEST =================
async function submitRequest() {
  const type = document.getElementById("reqType").value;
  const dates = document.getElementById("reqDates").value;
  const motif = document.getElementById("reqMotif").value;
  const msg = document.getElementById("reqMsg");

  if (!dates || !motif) {
    msg.innerText = "Remplis tout !";
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

    msg.innerText = "✅ Demande envoyée !";
    msg.style.color = "var(--success)";

    document.getElementById("reqDates").value = "";
    document.getElementById("reqMotif").value = "";
  } catch (e) {
    msg.innerText = "Erreur";
  }
}

// ================= FETCH =================
let unsubReq = null;

function fetchRequests() {
  if (unsubReq) return;

  unsubReq = onSnapshot(
    query(collection(db, "requests"), orderBy("createdAt", "desc")),
    (snapshot) => {
      let html = "";

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        // filtrage employé
        if (
          getCurrentUserRole() === "employee" &&
          data.employeeEmail !== getCurrentUserEmail()
        ) {
          return;
        }

        const dateStr = new Date(data.createdAt).toLocaleDateString("fr-FR");

        let badge = "⏳ En attente";
        if (data.status === "approved") badge = "✅ Approuvé";
        if (data.status === "rejected") badge = "❌ Refusé";

        let actions = "-";

        if (
          data.status === "pending" &&
          (getCurrentUserRole() === "admin" ||
            getCurrentUserRole() === "rh")
        ) {
          actions = `
            <button onclick="updateRequest('${id}', 'approved', '${data.employeeEmail}', '${data.type}')">✔️</button>
            <button onclick="updateRequest('${id}', 'rejected', '${data.employeeEmail}', '${data.type}')">❌</button>
          `;
        }

        html += `
          <tr>
            <td>${dateStr}</td>
            <td><b>${data.employeeName}</b></td>
            <td>${data.type}<br><small>${data.dates}</small></td>
            <td>${badge}</td>
            ${
              getCurrentUserRole() !== "employee"
                ? `<td>${actions}</td>`
                : ""
            }
          </tr>
        `;
      });

      const tbody = document.getElementById("requestsListBody");
      if (tbody) {
        tbody.innerHTML =
          html || "<tr><td colspan='5'>Aucune demande</td></tr>";
      }
    }
  );
}

// ================= UPDATE =================
async function updateRequest(id, status, email, type) {
  await updateDoc(doc(db, "requests", id), { status });

  // option : mettre en congé automatiquement
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
}

export {
  submitRequest,
  fetchRequests,
  updateRequest
};
