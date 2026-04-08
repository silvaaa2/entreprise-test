// ================= LISTENERS GLOBAL =================
const activeListeners = {};

function registerListener(key, unsubscribe) {
  if (activeListeners[key]) {
    activeListeners[key](); // stop ancien
  }

  activeListeners[key] = unsubscribe;
}

function clearAllListeners() {
  Object.values(activeListeners).forEach(unsub => unsub());
}

// ================= TIMERS =================
let globalIntervals = [];

function registerInterval(interval) {
  globalIntervals.push(interval);
}

function clearIntervals() {
  globalIntervals.forEach(clearInterval);
  globalIntervals = [];
}

export {
  registerListener,
  clearAllListeners,
  registerInterval,
  clearIntervals
};
