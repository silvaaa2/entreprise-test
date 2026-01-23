/* FIREBASE CONFIG — REMPLACE PAR LA TIENNE */
const firebaseConfig = {
    apiKey: "TA_CLE_API",
    authDomain: "TON_PROJET.firebaseapp.com",
    projectId: "TON_PROJET",
    appId: "TON_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

/* NAV */
function showCategory(id) {
    document.querySelectorAll('.category').forEach(s => {
        s.style.display = 'none';
        s.classList.remove("visible");
    });
    const section = document.getElementById(id);
    section.style.display = 'block';
    setTimeout(() => section.classList.add("visible"), 50);
}

/* LOGIN */
function login() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
            document.getElementById("adminLogin").style.display = "none";
            document.getElementById("adminPanel").style.display = "block";
        })
        .catch(err => alert(err.message));
}

/* LOGOUT */
function logout() {
    auth.signOut().then(() => {
        document.getElementById("adminPanel").style.display = "none";
        document.getElementById("adminLogin").style.display = "block";
    });
}

/* SESSION */
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById("adminLogin").style.display = "none";
        document.getElementById("adminPanel").style.display = "block";
    }
});
