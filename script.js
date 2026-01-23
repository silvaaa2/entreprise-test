/* FIREBASE CONFIG — REMPLACE PAR LA TIENNE */
const firebaseConfig = {
    apiKey: "TA_CLE_API",
    authDomain: "TON_PROJET.firebaseapp.com",
    projectId: "TON_PROJET",
    storageBucket: "TON_PROJET.appspot.com",
    messagingSenderId: "123456",
    appId: "1:123:web:abc"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

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
        })
        .catch(err=>alert(err.message));
}

function logout() {
    auth.signOut().then(()=>{
        document.getElementById("adminPanel").style.display="none";
        document.getElementById("adminLogin").style.display="block";
    });
}

/* SESSION FIREBASE */
auth.onAuthStateChanged(user=>{
    if(user){
        document.getElementById("adminLogin").style.display="none";
        document.getElementById("adminPanel").style.display="block";
    }
});

/* ANIMATIONS AU SCROLL */
const observer = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
        if(entry.isIntersecting){ entry.target.classList.add("visible"); }
    });
},{threshold:0.2});

document.querySelectorAll(".section").forEach(section=>observer.observe(section));
