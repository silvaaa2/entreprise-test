import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { getCurrentUserName } from "./user.js";

// ================= CREATE =================
async function saveNewEmployee() {
  const name = document.getElementById("ne_name").value;
  const email = document.getElementById("ne_email").value;
  const grade = document.getElementById("ne_grade").value;
  const phone = document.getElementById("ne_phone").value;
  const salary = document.getElementById("ne_salary").value;

  if (!name || !email) return;

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
    hrNotes: ""
  });

  document.getElementById("ne_name").value = "";
  document.getElementById("ne_email").value = "";
}

// ================= FETCH =================
let unsubEmployees = null;

function fetchEmployees() {
  if (unsubEmployees) return;

  unsubEmployees = onSnapshot(collection(db, "employees"), (snap) => {
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
            ${data.name}
          </td>
          <td>${data.grade}</td>
          <td>${data.phone}</td>
        </tr>
      `;
    });

    document.getElementById("employeeListBody").innerHTML = html;
  });
}

// ================= OPEN MODAL =================
async function openHrEmployeeModal(id) {
  const modal = document.getElementById("hrEmployeeModal");
  modal.classList.remove("hidden");

  const snap = await getDoc(doc(db, "employees", id));
  const data = snap.data();

  document.getElementById("hre_id").value = id;
  document.getElementById("hre_name").innerText = data.name;
  document.getElementById("hre_grade").innerText = data.grade;
  document.getElementById("hre_phone").innerText = data.phone;
  document.getElementById("hre_salary").innerText = data.salary;
  document.getElementById("hre_date").innerText = data.hiredDate;

  document.getElementById("hre_email").value = data.email;
  document.getElementById("hre_status").value = data.status;
  document.getElementById("hre_notes").value = data.hrNotes || "";
}

// ================= UPDATE =================
async function updateEmployeeDossier() {
  const id = document.getElementById("hre_id").value;

  await updateDoc(doc(db, "employees", id), {
    email: document.getElementById("hre_email").value,
    status: document.getElementById("hre_status").value,
    hrNotes: document.getElementById("hre_notes").value
  });

  closeHrEmployeeModal();
}

// ================= DELETE =================
async function deleteEmployeeDossier() {
  const id = document.getElementById("hre_id").value;

  if (confirm("Supprimer cet employé ?")) {
    await deleteDoc(doc(db, "employees", id));
    closeHrEmployeeModal();
  }
}

// ================= CLOSE =================
function closeHrEmployeeModal() {
  document.getElementById("hrEmployeeModal").classList.add("hidden");
}

// ================= EXPORT =================
export {
  saveNewEmployee,
  fetchEmployees,
  openHrEmployeeModal,
  updateEmployeeDossier,
  deleteEmployeeDossier,
  closeHrEmployeeModal
};
