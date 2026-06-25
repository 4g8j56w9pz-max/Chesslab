const STORAGE_KEYS = Object.freeze({
  bestScore: "lockPopArcade.bestScore",
  muted: "lockPopArcade.muted"
});

function getStorage() {
  try {
    const testKey = "lockPopArcade.storageTest";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadBestScore() {
  const storage = getStorage();
  if (!storage) {
    return 0;
  }

  const value = Number.parseInt(storage.getItem(STORAGE_KEYS.bestScore) || "0", 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function saveBestScore(score) {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  storage.setItem(STORAGE_KEYS.bestScore, String(Math.max(0, Math.floor(score))));
  return true;
}

export function loadMutedPreference() {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  return storage.getItem(STORAGE_KEYS.muted) === "true";
}

export function saveMutedPreference(isMuted) {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  storage.setItem(STORAGE_KEYS.muted, isMuted ? "true" : "false");
  return true;
}
