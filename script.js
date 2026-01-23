function showCategory(id) {
    document.querySelectorAll('.category').forEach(section => {
        section.style.display = 'none';
    });

    const section = document.getElementById(id);
    section.style.display = 'block';
}

/* ZONE ADMIN */
function loginAdmin() {
    const user = document.getElementById("adminUser").value;
    const pass = document.getElementById("adminPass").value;

    if (user === "admin" && pass === "1234") {
        document.getElementById("adminLogin").style.display = "none";
        document.getElementById("adminPanel").style.display = "block";
    } else {
        alert("Accès refusé ❌");
    }
}
