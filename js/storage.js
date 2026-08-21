// ==========================================================================
// storage.js - localStorage への保存・読み込み
// ==========================================================================

const STORAGE_KEY = "suika_deluxe_save_v1";

function defaultStats() {
  return {
    highScore: 0,
    totalMerges: 0,
    gamesPlayed: 0,
    totalPlaytimeSec: 0,
    totalDrops: 0,
    maxDropsInOneGame: 0,
    longestGameSec: 0,
    maxChain: 0,
    dangerEscapes: 0,
    quickRetries: 0,
    maxStackNoMerge: 0,
    playedLateNight: false,
    tierFirstCreated: new Array(TIERS.length).fill(false),
    tierCreatedCount: new Array(TIERS.length).fill(0),
    unlockedSkins: ["default"],
    unlockedBackgrounds: ["classic", "night"],
    currentSkin: "default",
    currentBackground: "classic",
    achievementsUnlocked: {},
    lastGameOverTime: 0,
    tasUnlocked: false,
    coins: 0,
    totalCoinsEarned: 0,
    lastLoginDate: null,
    loginStreak: 0,
    dailyChallenge: null,
    dailyChallengesCompleted: 0,
  };
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw);
    const d = defaultStats();
    // 欠けているフィールドはデフォルトで補完(将来のフィールド追加に対応)
    const merged = Object.assign({}, d, parsed);
    merged.tierFirstCreated = d.tierFirstCreated.map((v, i) =>
      parsed.tierFirstCreated && parsed.tierFirstCreated[i] !== undefined ? parsed.tierFirstCreated[i] : false
    );
    merged.tierCreatedCount = d.tierCreatedCount.map((v, i) =>
      parsed.tierCreatedCount && parsed.tierCreatedCount[i] !== undefined ? parsed.tierCreatedCount[i] : 0
    );
    merged.achievementsUnlocked = parsed.achievementsUnlocked || {};
    merged.unlockedSkins = parsed.unlockedSkins || ["default"];
    merged.unlockedBackgrounds = parsed.unlockedBackgrounds || ["classic", "night"];
    return merged;
  } catch (e) {
    console.warn("save data load failed, resetting", e);
    return defaultStats();
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn("save failed", e);
  }
}

// --- プレイ中データの自動保存(閉じても続きから再開できるように) ---
const AUTOSAVE_KEY = "suika_deluxe_autosave_v1";

function loadAutosave() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
function saveAutosave(snapshot) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn("autosave failed", e);
  }
}
function clearAutosave() {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch (e) {
    /* ignore */
  }
}

// --- 手動セーブ(5スロット) ---
const MANUAL_SAVES_KEY = "suika_deluxe_manual_saves_v1";
const MANUAL_SAVE_SLOTS = 5;

function loadManualSaves() {
  try {
    const raw = localStorage.getItem(MANUAL_SAVES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    while (arr.length < MANUAL_SAVE_SLOTS) arr.push(null);
    return arr.slice(0, MANUAL_SAVE_SLOTS);
  } catch (e) {
    return new Array(MANUAL_SAVE_SLOTS).fill(null);
  }
}
function saveManualSaves(arr) {
  try {
    localStorage.setItem(MANUAL_SAVES_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("manual save failed", e);
  }
}
