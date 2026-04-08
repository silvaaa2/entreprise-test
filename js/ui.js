function setElementText(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function showSection(id) {
  document.querySelectorAll(".section").forEach(section => {
    section.classList.remove("active");
  });

  const target = document.getElementById(id);
  if (target) target.classList.add("active");
}

export { setElementText, formatTime, showSection };
