import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  addDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let myPersonalTimer = null;
let myEmployeeDocId = null;
let unsubMyService = null;

function getIsoWeek() {
  const date = new Date();
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return d.getUTCFullYear() + "-W" + weekNo;
}

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function setElementText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

async function loadMyService() {
  const user = auth.currentUser;
  if (!user) return;

  const container = document.getElementById("myServiceContainer");
  if (!container) return;

  const snap = await getDocs(
    query(collection(db, "employees"), where("email", "==", user.email))
  );

  if (snap.empty) {
    container.innerHTML = `
      <div class="pointage-card">
        <h3 style="color:var(--error);">⚠️ Dossier introuvable</h3>
        <p>Aucun dossier RH relié à <b>${user.email}</b>.</p>
      </div>
    `;
    return;
  }

  myEmployeeDocId = snap.docs[0].id;

  if (unsubMyService) unsubMyService();

  unsubMyService = onSnapshot(doc(db, "employees", myEmployeeDocId), (docSnap) => {
    if (docSnap.exists()) {
      renderMyServiceUI(docSnap.data());
    }
  });
}

function renderMyServiceUI(data) {
  if (myPersonalTimer) clearInterval(myPersonalTimer);

  const isEnService = data.status === "en_service";

  const statusText = isEnService
    ? `<span class="status-badge status-en_service" style="font-size:1em;">🟢 EN SERVICE</span>`
    : `<span class="status-badge status-hors_service" style="font-size:1em;">⚪ HORS SERVICE</span>`;

  const buttonHtml = isEnService
    ? `<button class="btn-clock-out" onclick="toggleMyService('hors_service')">🔴 Terminer mon service</button>`
    : `<button class="btn-clock-in" onclick="toggleMyService('en_service')">🟢 Prendre mon service</button>`;

  const currentWeekStr = getIsoWeek();
  const baseWeekly =
    data.currentWeek === currentWeekStr ? (data.weeklyServiceSeconds || 0) : 0;

  const lastSession = data.lastSessionSeconds || 0;
  const topLabel = isEnService ? "Temps de la session actuelle :" : "Dernière session :";

  const container = document.getElementById("myServiceContainer");
  if (container) {
    container.innerHTML = `
      <div class="pointage-card">
        <h2 style="margin-top:0;">${data.name || "Employé"}</h2>
        <p style="color:var(--subtext); margin-bottom:20px;">${data.grade || ""}</p>

        <div style="margin-bottom:30px;">${statusText}</div>

        <p style="color:var(--subtext); margin:0;">${topLabel}</p>
        <div id="my_session_clock" class="live-clock" style="font-size:2.5em; margin:10px 0;">
          ${isEnService ? "0h 0m" : formatTime(lastSession)}
        </div>

        <div style="margin:20px 0; padding-top:20px; border-top:1px solid var(--glass-border);">
          <p style="color:var(--subtext); margin:0; font-size:0.9em;">⏱️ Service total de la semaine :</p>
          <div id="my_weekly_clock" style="font-size:1.5em; color:var(--text); font-weight:bold; font-family:monospace;">
            0h 0m
          </div>
        </div>

        ${buttonHtml}
      </div>
    `;
  }

  const updateMyTimer = () => {
    let sessionSecs = 0;
    let weeklySecs = baseWeekly;

    if (isEnService && data.currentServiceStart) {
      sessionSecs = Math.floor((Date.now() - data.currentServiceStart) / 1000);
      weeklySecs += sessionSecs;
    }

    setElementText("my_session_clock", formatTime(sessionSecs));
    setElementText("my_weekly_clock", formatTime(weeklySecs));
  };

  updateMyTimer();

  if (isEnService) {
    myPersonalTimer = setInterval(updateMyTimer, 60000);
  }
}

async function toggleMyService(newStatus) {
  if (!myEmployeeDocId) return;

  const docRef = doc(db, "employees", myEmployeeDocId);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data();

  const currentWeekStr = getIsoWeek();
  const currentWeekly =
    data.currentWeek === currentWeekStr ? (data.weeklyServiceSeconds || 0) : 0;

  const updates = {
    status: newStatus,
    currentWeek: currentWeekStr
  };

  if (data.status !== "en_service" && newStatus === "en_service") {
    updates.currentServiceStart = Date.now();
    updates.weeklyServiceSeconds = currentWeekly;
  } else if (data.status === "en_service" && newStatus !== "en_service") {
    const durationSecs = Math.floor((Date.now() - data.currentServiceStart) / 1000);

    updates.weeklyServiceSeconds = currentWeekly + durationSecs;
    updates.lastSessionSeconds = durationSecs;
    updates.currentServiceStart = null;

    await addDoc(collection(db, "timelogs"), {
      employeeId: myEmployeeDocId,
      date: new Date().toLocaleDateString("fr-FR"),
      startTime: data.currentServiceStart,
      endTime: Date.now(),
      durationText: formatTime(durationSecs)
    });
  }

  await updateDoc(docRef, updates);
}

export {
  loadMyService,
  toggleMyService
};
