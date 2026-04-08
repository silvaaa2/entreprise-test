const activeListeners = {};
const activeIntervals = {};

function registerListener(key, unsubscribe) {
  if (activeListeners[key]) {
    try {
      activeListeners[key]();
    } catch (e) {
      console.error(`Erreur fermeture listener ${key} :`, e);
    }
  }

  activeListeners[key] = unsubscribe;
}

function clearAllListeners() {
  Object.keys(activeListeners).forEach((key) => {
    try {
      activeListeners[key]?.();
    } catch (e) {
      console.error(`Erreur clear listener ${key} :`, e);
    }
    delete activeListeners[key];
  });
}

function registerInterval(key, intervalId) {
  if (activeIntervals[key]) {
    clearInterval(activeIntervals[key]);
  }

  activeIntervals[key] = intervalId;
}

function clearIntervals() {
  Object.keys(activeIntervals).forEach((key) => {
    clearInterval(activeIntervals[key]);
    delete activeIntervals[key];
  });
}

export {
  registerListener,
  clearAllListeners,
  registerInterval,
  clearIntervals
};
