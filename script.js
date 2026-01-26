/* ================= FIREBASE CONFIG ================= */
const firebaseConfig = {
    apiKey: "AIzaSyA5Ec_JPneE1Pwx53MmCwUDrgw0vfeFfDo",
    authDomain: "entreprise-test-admin.firebaseapp.com",
    projectId: "entreprise-test-admin",
    storageBucket: "entreprise-test-admin.firebasestorage.app",
    messagingSenderId: "785617328418",
    appId: "1:785617328418:web:2edc96ea5062bede2e2d7b"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

/* ================= GOOGLE SHEETS COMPTA ================= */
const COMPTA_SHEET_URL =
"https://docs.google.com/spreadsheets/d/1zCczeHhR5rVWDMbmIgiE5LA4StH2TBYWczMIGPfWDZU/pubhtml?gid=1852400448&single=true";

/* ================= NAVIGATION ================= */
function showCategory(id) {
    document.querySelectorAll('.category').forEach(c => {
        c.style.display = "none";
        c.classList.remove("visible");
    });

    const el = document.getElementById(id);
    el.style.display = "block";
    setTimeout(() => el.classList.add("visible"), 50);

    if (id === "compta") loadComptaSheet();
}

/* ================= MENU ================= */
function toggleMenu() {
    document.querySelector('.sidebar').classList.toggle('open');
}

/* ================= AUTH ================= */
function login() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(email, pass)
        .catch(err => alert(err.message));
}

function logout() {
    auth.signOut();
}

/* ================= SESSION ================= */
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById("adminLogin").style.display = "none";
        document.getElementById("adminPanel").style.display = "block";
        showCategory("welcome");
        loadStats();
    } else {
        document.getElementById("adminLogin").style.display = "flex";
        document.getElementById("adminPanel").style.display = "none";
    }
});

/* ================= STATS ================= */
function loadStats() {
    document.getElementById("stat-users").innerText = "128";
    document.getElementById("stat-produits").innerText = "24";
    document.getElementById("stat-visites").innerText = "4560";
}

/* ================= COMPTA ================= */
function loadComptaSheet() {
    const iframe = document.getElementById("comptaSheet");
    if (iframe && !iframe.src) {
        iframe.src = COMPTA_SHEET_URL;
    }
}
