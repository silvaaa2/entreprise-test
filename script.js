/* NAVIGATION */
function showSection(id) {
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });

  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

/* EFFET 3D TILT */
document.querySelectorAll('.tilt').forEach(el => {

  el.addEventListener('mousemove', e => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateX = ((y / rect.height) - 0.5) * -12;
    const rotateY = ((x / rect.width) - 0.5) * 12;

    el.style.transform = `
      perspective(800px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      scale(1.03)
    `;

    el.style.setProperty('--x', `${(x / rect.width) * 100}%`);
    el.style.setProperty('--y', `${(y / rect.height) * 100}%`);
  });

  el.addEventListener('mouseleave', () => {
    el.style.transform = `
      perspective(800px)
      rotateX(0deg)
      rotateY(0deg)
      scale(1)
    `;
  });

});
