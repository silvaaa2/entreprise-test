function showCategory(id) {
    document.querySelectorAll('.category').forEach(section => {
        section.style.display = 'none';
        section.classList.remove("visible");
    });

    const section = document.getElementById(id);
    section.style.display = 'block';

    setTimeout(() => {
        section.classList.add("visible");
    }, 50);
}

/* ADMIN LOGIN (DEMO) */
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

/* ANIMATION AU SCROLL */
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
        }
    });
}, { threshold: 0.2 });

document.querySelectorAll(".category").forEach(section => {
    observer.observe(section);
});
