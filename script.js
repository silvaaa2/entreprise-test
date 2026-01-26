/* FIREBASE CONFIG */
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
const db = firebase.firestore();

/* GOOGLE SHEETS COMPTA */
const COMPTA_SHEET_URL =
"https://docs.google.com/spreadsheets/d/1zCczeHhR5rVWDMbmIgiE5LA4StH2TBYWczMIGPfWDZU/pubhtml?gid=1852400448&single=true";

/* PAGE DE BIENVENUE */
function showCategory(id){
    document.querySelectorAll('.category').forEach(c=>{
        c.style.display='none';
        c.classList.remove("visible");
    });
    const el=document.getElementById(id);
    el.style.display='flex';
    setTimeout(()=>el.classList.add("visible"),50);
}

/* SECTIONS */
function showSection(id){
    document.querySelectorAll('.section').forEach(s=>{
        s.style.display='none';
        s.classList.remove("visible");
    });
    const sec=document.getElementById(id);
    sec.style.display='block';
    setTimeout(()=>sec.classList.add("visible"),50);

    if(id==="compta") loadComptaSheet();
}

/* BURGER */
function toggleMenu(){
    document.querySelector('.sidebar').classList.toggle('open');
}

/* AUTH */
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

/* SESSION */
auth.onAuthStateChanged(user=>{
    if(user){
        document.getElementById("adminLogin").style.display="none";
        document.getElementById("adminPanel").style.display="block";
        loadStats();
        populateSectionSelector();
    }
});

/* STATS */
function loadStats(){
    document.getElementById("stat-users").innerText="128";
    document.getElementById("stat-produits").innerText="24";
    document.getElementById("stat-visites").innerText="4560";
}

/* COMPTA */
function loadComptaSheet(){
    const iframe=document.getElementById("comptaSheet");
    if(iframe && !iframe.src){
        iframe.src=COMPTA_SHEET_URL;
    }
}

/* EDIT CONTENT */
function populateSectionSelector(){
    const select=document.getElementById("section-select");
    select.innerHTML="";
    document.querySelectorAll(".section[data-id]").forEach(s=>{
        const opt=document.createElement("option");
        opt.value=s.dataset.id;
        opt.innerText=s.dataset.id.toUpperCase();
        select.appendChild(opt);
    });
}

function updateContent(){
    const sectionId=document.getElementById("section-select").value;
    const content=document.getElementById("section-content").value;
    const el=document.getElementById("content-"+sectionId);
    el.innerText=content;

    db.collection("sections").doc(sectionId).set({content});
    alert("Contenu mis à jour !");
}
