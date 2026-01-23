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
