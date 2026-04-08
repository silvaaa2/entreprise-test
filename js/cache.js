const cacheStore = new Map();

function setCache(key, data, ttlMs = 30000) {
  cacheStore.set(key, {
    data,
    expiry: Date.now() + ttlMs
  });
}

function getCache(key) {
  const entry = cacheStore.get(key);

  if (!entry) return null;

  if (Date.now() > entry.expiry) {
    cacheStore.delete(key);
    return null;
  }

  return entry.data;
}

function clearCache(key) {
  cacheStore.delete(key);
}

function clearAllCache() {
  cacheStore.clear();
}

export {
  setCache,
  getCache,
  clearCache,
  clearAllCache
};
