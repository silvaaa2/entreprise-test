/* FIREBASE CONFIG — REMPLACE PAR LA TIENNE */
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
const db = firebase.firestore();

/* PAGE DE BIENVENUE → MAIN */
function showCategory(id) {
    document.querySelectorAll('.category').forEach(c => c.style.display='none');
    const el = document.getElementById(id);
    el.style.display='flex';
    setTimeout(()=>el.classList.add("visible"),50);
}

/* SECTIONS DU MENU */
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => { s.style.display='none'; s.classList.remove("visible"); });
    const sec = document.getElementById(id);
    sec.style.display='block';
    setTimeout(()=>sec.classList.add("visible"),50);
}

/* BURGER */
function toggleMenu() { document.querySelector('.sidebar').classList.toggle('open'); }

/* ADMIN LOGIN */
function login() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;
    auth.signInWithEmailAndPassword(email, pass)
        .then(() => { 
            document.getElementById("adminLogin").style.display="none";
            document.getElementById("adminPanel").style.display="block";
