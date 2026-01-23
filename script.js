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
function showCategory(id){
    document.querySelectorAll('.category').forEach(c=>c.style.display='none');
    const el = document.getElementById(id);
    el.style.display='flex';
    setTimeout(()=>el.classList.add("visible"),50);
}

/* SECTIONS MENU */
function showSection(id){
    document.querySelectorAll('.section').forEach(s=>{ s.style.display='none'; s.classList.remove("visible"); });
    const sec = document.getElementById(id);
    sec.style.display='block';
    setTimeout(()=>sec.classList.add("visible"),50);
}

/* BURGER */
function toggleMenu(){ document.querySelector('.sidebar').classList.toggle('open'); }

/* ADMIN LOGIN */
function login(){
    const email=document.getElementById("email").value;
    const pass=document.getElementById("password").value;
    auth.signInWithEmailAndPassword(email,pass)
    .then(()=>{
        document.getElementById("adminLogin").style.display="none";
        document.getElementById("adminPanel").style.display="block";
        loadStats();
        populateSectionSelector();
    })
    .catch(err=>alert(err.message));
}
function logout(){
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
        loadStats();
        populateSectionSelector();
    }
});

/* ANIMATIONS AU SCROLL */
const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
        if(entry.isIntersecting){ entry.target.classList.add("visible"); }
    });
},{threshold:0.2});
document.querySelectorAll(".section").forEach(section=>observer.observe(section));

/* STATS FIRESTORE SIMPLIFIÉES */
function loadStats(){
    document.getElementById("stat-users").innerText="128";
    document.getElementById("stat-produits").innerText="24";
    document.getElementById("stat-visites").innerText="4 560";
}

/* EDIT CONTENT */
function populateSectionSelector(){
    const select=document.getElementById("section-select");
    select.innerHTML="";
    document.querySelectorAll(".section[data-id]").forEach(s=>{
        const opt=document.createElement("option");
        opt.value=s.dataset.id;
        opt.innerText=s.dataset.id.charAt(0).toUpperCase()+s.dataset.id.slice(1);
        select.appendChild(opt);
    });
}
function updateContent(){
    const sectionId=document.getElementById("section-select").value;
    const content=document.getElementById("section-content").value;
    const el=document.getElementById("content-"+sectionId);
    el.innerText=content;

    db.collection("sections").doc(sectionId).set({content:content});
    alert("Contenu mis à jour !");
}
