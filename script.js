function showSection(id) {
  const sections = document.querySelectorAll('.section');

  sections.forEach(section => {
    section.classList.remove('active');
  });

  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
  }
}
