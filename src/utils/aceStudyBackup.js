/**
 * Full AceIt study backup: flashcards + SRS + streaks + local-only app data.
 * Does not include auth tokens (security).
 */

export const ACE_STUDY_BACKUP_VERSION = 2;

export const FLASHCARDS_STORAGE_KEY = "ace-it-flashcards";
export const REVIEW_DATA_STORAGE_KEY = "ace-it-review-data";

const NEVER_EXPORT_KEYS = new Set([
  "firebase_token",
  "aceit_auth_token",
  "aceit_current_user",
  "aceit_login_flash",
  "aceit_skip_backend_flashcard_merge_until",
]);

/** Keys we never apply from a file (never clobber session auth). */
const NEVER_IMPORT_KEYS = NEVER_EXPORT_KEYS;

function getExportedFirebaseUid() {
  try {
    const raw = localStorage.getItem("aceit_current_user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u?.uid ?? null;
  } catch {
    return null;
  }
}

function shouldIncludeStorageKey(key) {
  if (!key || NEVER_EXPORT_KEYS.has(key)) return false;
  if (key === FLASHCARDS_STORAGE_KEY || key === REVIEW_DATA_STORAGE_KEY) return false;
  return key.startsWith("ace-it-") || key.startsWith("aceit_");
}

/**
 * Build backup payload (v2) from current localStorage.
 */
export function buildAceItStudyBackup() {
  let cards = [];
  let review = {};
  try {
    const rawC = localStorage.getItem(FLASHCARDS_STORAGE_KEY);
    if (rawC) cards = JSON.parse(rawC);
    if (!Array.isArray(cards)) cards = [];
  } catch {
    cards = [];
  }
  try {
    const rawR = localStorage.getItem(REVIEW_DATA_STORAGE_KEY);
    if (rawR) review = JSON.parse(rawR);
    if (!review || typeof review !== "object") review = {};
  } catch {
    review = {};
  }

  const localStorageSnapshot = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !shouldIncludeStorageKey(key)) continue;
      const value = localStorage.getItem(key);
      if (value != null) localStorageSnapshot[key] = value;
    }
  } catch {
    /* ignore quota / access errors */
  }

  return {
    version: ACE_STUDY_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    firebaseUid: getExportedFirebaseUid(),
    aceItFlashcards: cards,
    aceItReviewData: review,
    localStorageSnapshot,
  };
}

function remapKey(key, fromUid, toUid) {
  if (!fromUid || !toUid || fromUid === toUid) return key;
  if (!key.includes(fromUid)) return key;
  return key.split(fromUid).join(toUid);
}

function getCurrentFirebaseUid() {
  return getExportedFirebaseUid();
}

/**
 * Apply backup to localStorage. Returns { cardCount, extraKeysApplied }.
 */
export function applyAceItStudyBackup(rawData, options = {}) {
  const { currentUid = getCurrentFirebaseUid() } = options;

  let data = rawData;
  if (typeof data === "string") data = JSON.parse(data);

  let cards;
  let review = {};
  let snapshot = {};
  let exportUid = null;

  if (data && typeof data === "object") {
    if (data.version === ACE_STUDY_BACKUP_VERSION) {
      if (!Array.isArray(data.aceItFlashcards)) {
        throw new Error("Backup has no flashcard list.");
      }
      cards = data.aceItFlashcards;
      review =
        data.aceItReviewData && typeof data.aceItReviewData === "object"
          ? data.aceItReviewData
          : {};
      snapshot =
        data.localStorageSnapshot && typeof data.localStorageSnapshot === "object"
          ? data.localStorageSnapshot
          : {};
      exportUid = data.firebaseUid || null;
    } else if (data.version === 1 && data.aceItFlashcards != null) {
      if (!Array.isArray(data.aceItFlashcards)) {
        throw new Error("Backup has no flashcard list.");
      }
      cards = data.aceItFlashcards;
      review =
        data.aceItReviewData && typeof data.aceItReviewData === "object"
          ? data.aceItReviewData
          : {};
    } else if (Array.isArray(data)) {
      cards = data;
    } else {
      throw new Error("Unrecognized backup file.");
    }
  } else {
    throw new Error("Unrecognized backup file.");
  }

  const toUid = currentUid || exportUid;

  localStorage.setItem(FLASHCARDS_STORAGE_KEY, JSON.stringify(cards));
  localStorage.setItem(REVIEW_DATA_STORAGE_KEY, JSON.stringify(review));

  const canApplyKey = (storageKey) => {
    if (!storageKey || NEVER_IMPORT_KEYS.has(storageKey)) return false;
    if (storageKey === FLASHCARDS_STORAGE_KEY || storageKey === REVIEW_DATA_STORAGE_KEY)
      return false;
    return storageKey.startsWith("ace-it-") || storageKey.startsWith("aceit_");
  };

  let extraKeysApplied = 0;
  for (const [key, value] of Object.entries(snapshot)) {
    if (value == null || typeof value !== "string") continue;
    if (NEVER_IMPORT_KEYS.has(key)) continue;
    const mapped = remapKey(key, exportUid, toUid);
    if (!canApplyKey(mapped)) continue;
    localStorage.setItem(mapped, value);
    extraKeysApplied++;
  }

  // After restore, avoid merging server flashcards on top of imported deck (24h).
  try {
    localStorage.setItem(
      "aceit_skip_backend_flashcard_merge_until",
      String(Date.now() + 86400000)
    );
  } catch {
    /* ignore */
  }

  return { cardCount: cards.length, extraKeysApplied };
}
