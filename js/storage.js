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
