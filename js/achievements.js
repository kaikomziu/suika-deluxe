// ==========================================================================
// achievements.js - 実績定義(100種類以上)
// 各実績: { id, category, name, desc, icon, check(stats)->bool, progress(stats)->[cur,max] }
// ==========================================================================

function generateAchievements() {
  const list = [];

  const add = (a) => list.push(a);

  // --- スコア実績(自己ベストスコア基準) ---
  const scoreMilestones = [
    100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000,
    250000, 500000, 1000000, 2500000, 5000000, 10000000,
  ];
  scoreMilestones.forEach((v, i) => {
    add({
      id: `score_${v}`,
      category: "スコア",
      name: `スコア${v.toLocaleString()}達成`,
      desc: `1ゲームで${v.toLocaleString()}点以上を獲得する`,
      icon: "💯",
      check: (s) => s.highScore >= v,
      progress: (s) => [Math.min(s.highScore, v), v],
    });
  });

  // --- 累計マージ数実績 ---
  const mergeMilestones = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
  mergeMilestones.forEach((v) => {
    add({
      id: `merges_${v}`,
      category: "マージ回数",
      name: `マージ${v.toLocaleString()}回`,
      desc: `累計で${v.toLocaleString()}回フルーツを合体させる`,
      icon: "🔀",
      check: (s) => s.totalMerges >= v,
      progress: (s) => [Math.min(s.totalMerges, v), v],
    });
  });

  // --- 累計プレイ回数実績 ---
  const playMilestones = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
  playMilestones.forEach((v) => {
    add({
      id: `games_${v}`,
      category: "プレイ回数",
      name: `プレイ${v.toLocaleString()}回`,
      desc: `累計で${v.toLocaleString()}回プレイする`,
      icon: "🎮",
      check: (s) => s.gamesPlayed >= v,
      progress: (s) => [Math.min(s.gamesPlayed, v), v],
    });
  });

  // --- 累計プレイ時間実績 ---
  const timeMilestones = [
    { sec: 600, label: "10分" },
    { sec: 1800, label: "30分" },
    { sec: 3600, label: "1時間" },
    { sec: 10800, label: "3時間" },
    { sec: 36000, label: "10時間" },
    { sec: 86400, label: "24時間" },
    { sec: 180000, label: "50時間" },
  ];
  timeMilestones.forEach((t) => {
    add({
      id: `playtime_${t.sec}`,
      category: "プレイ時間",
      name: `累計プレイ時間${t.label}`,
      desc: `合計${t.label}以上プレイする`,
      icon: "⏱️",
      check: (s) => s.totalPlaytimeSec >= t.sec,
      progress: (s) => [Math.min(s.totalPlaytimeSec, t.sec), t.sec],
    });
  });

  // --- 各フルーツ初生成実績(全15段階) ---
  TIERS.forEach((t) => {
    add({
      id: `first_${t.id}`,
      category: "はじめての生成",
      name: `はじめての${t.name}`,
      desc: `「${t.name}」を初めて作る`,
      icon: "✨",
      check: (s) => s.tierFirstCreated[t.id] === true,
      progress: (s) => [s.tierFirstCreated[t.id] ? 1 : 0, 1],
    });
  });

  // --- 上位フルーツ累計生成数実績(ココナッツ以上) ---
  const countThresholds = [10, 50, 200];
  TIERS.filter((t) => t.id >= 7).forEach((t) => {
    countThresholds.forEach((v) => {
      add({
        id: `count_${t.id}_${v}`,
        category: "累計生成数",
        name: `${t.name}を${v}回生成`,
        desc: `「${t.name}」を累計${v}回作る`,
        icon: "📦",
        check: (s) => (s.tierCreatedCount[t.id] || 0) >= v,
        progress: (s) => [Math.min(s.tierCreatedCount[t.id] || 0, v), v],
      });
    });
  });

  // --- 連鎖(チェイン)実績 ---
  [2, 3, 4, 5, 6].forEach((v) => {
    add({
      id: `chain_${v}`,
      category: "連鎖",
      name: `${v}連鎖`,
      desc: `1回のドロップで${v}連続で合体を起こす`,
      icon: "⚡",
      check: (s) => s.maxChain >= v,
      progress: (s) => [Math.min(s.maxChain, v), v],
    });
  });

  // --- やりこみ・特殊実績 ---
  add({
    id: "special_first_drop",
    category: "スペシャル",
    name: "最初の一手",
    desc: "はじめてフルーツを落とす",
    icon: "👆",
    check: (s) => s.totalDrops >= 1,
    progress: (s) => [Math.min(s.totalDrops, 1), 1],
  });
  add({
    id: "special_drops_100_1game",
    category: "スペシャル",
    name: "せっかちプレイヤー",
    desc: "1ゲームで100個以上フルーツを落とす",
    icon: "🏃",
    check: (s) => s.maxDropsInOneGame >= 100,
    progress: (s) => [Math.min(s.maxDropsInOneGame, 100), 100],
  });
  add({
    id: "special_long_game",
    category: "スペシャル",
    name: "スローライフ",
    desc: "1ゲームを10分以上プレイする",
    icon: "🐢",
    check: (s) => s.longestGameSec >= 600,
    progress: (s) => [Math.min(s.longestGameSec, 600), 600],
  });
  add({
    id: "special_earth",
    category: "スペシャル",
    name: "地球誕生",
    desc: "「小さな星」を作る",
    icon: "🌍",
    check: (s) => s.tierFirstCreated[11] === true,
    progress: (s) => [s.tierFirstCreated[11] ? 1 : 0, 1],
  });
  add({
    id: "special_sun",
    category: "スペシャル",
    name: "恒星到達",
    desc: "「太陽」を作る",
    icon: "☀️",
    check: (s) => s.tierFirstCreated[13] === true,
    progress: (s) => [s.tierFirstCreated[13] ? 1 : 0, 1],
  });
  add({
    id: "special_galaxy",
    category: "スペシャル",
    name: "宇宙の覇者",
    desc: "最上位フルーツ「銀河」を作る",
    icon: "🌌",
    check: (s) => s.tierFirstCreated[MAX_TIER] === true,
    progress: (s) => [s.tierFirstCreated[MAX_TIER] ? 1 : 0, 1],
  });
  add({
    id: "special_galaxy_5",
    category: "スペシャル",
    name: "銀河量産",
    desc: "「銀河」を累計5回作る",
    icon: "🌠",
    check: (s) => (s.tierCreatedCount[MAX_TIER] || 0) >= 5,
    progress: (s) => [Math.min(s.tierCreatedCount[MAX_TIER] || 0, 5), 5],
  });
  add({
    id: "special_all_skins",
    category: "スペシャル",
    name: "コレクター(スキン)",
    desc: "全てのスキンを解放する",
    icon: "🎨",
    check: (s) => SKINS.every((sk) => s.unlockedSkins.includes(sk.id)),
    progress: (s) => [s.unlockedSkins.length, SKINS.length],
  });
  add({
    id: "special_all_bg",
    category: "スペシャル",
    name: "コレクター(背景)",
    desc: "全ての背景を解放する",
    icon: "🖼️",
    check: (s) => BACKGROUNDS.every((b) => s.unlockedBackgrounds.includes(b.id)),
    progress: (s) => [s.unlockedBackgrounds.length, BACKGROUNDS.length],
  });
  add({
    id: "special_survivor",
    category: "スペシャル",
    name: "危機一髪",
    desc: "危険ラインぎりぎりから合体で盛り返す",
    icon: "😅",
    check: (s) => s.dangerEscapes >= 1,
    progress: (s) => [Math.min(s.dangerEscapes, 1), 1],
  });
  add({
    id: "special_survivor_10",
    category: "スペシャル",
    name: "冷静沈着",
    desc: "危険ラインからの盛り返しを10回達成する",
    icon: "🧊",
    check: (s) => s.dangerEscapes >= 10,
    progress: (s) => [Math.min(s.dangerEscapes, 10), 10],
  });
  add({
    id: "special_retry_5",
    category: "スペシャル",
    name: "リベンジャー",
    desc: "ゲームオーバー直後(5秒以内)に5回リトライする",
    icon: "🔁",
    check: (s) => s.quickRetries >= 5,
    progress: (s) => [Math.min(s.quickRetries, 5), 5],
  });
  add({
    id: "special_no_merge_survive",
    category: "スペシャル",
    name: "我慢比べ",
    desc: "合体なしで30個フルーツを積み上げる",
    icon: "🗼",
    check: (s) => s.maxStackNoMerge >= 30,
    progress: (s) => [Math.min(s.maxStackNoMerge, 30), 30],
  });
  add({
    id: "special_night_owl",
    category: "スペシャル",
    name: "夜更かし",
    desc: "深夜0時〜4時にプレイする",
    icon: "🦉",
    check: (s) => s.playedLateNight === true,
    progress: (s) => [s.playedLateNight ? 1 : 0, 1],
  });
  add({
    id: "special_complete_50",
    category: "スペシャル",
    name: "実績ハンター",
    desc: "実績を50個解放する",
    icon: "🏅",
    check: (s) => Object.keys(s.achievementsUnlocked || {}).length >= 50,
    progress: (s) => [Object.keys(s.achievementsUnlocked || {}).length, 50],
  });
  add({
    id: "special_complete_all",
    category: "スペシャル",
    name: "パーフェクトコンプリート",
    desc: "この実績を除く全ての実績を解放する",
    icon: "👑",
    check: (s) => {
      const total = list.length; // 実行時にはlist全体長がすでに確定後に呼ばれる
      const unlocked = Object.keys(s.achievementsUnlocked || {}).filter((id) => id !== "special_complete_all").length;
      return total > 0 && unlocked >= total - 1;
    },
    progress: (s) => {
      const total = list.length;
      const unlocked = Object.keys(s.achievementsUnlocked || {}).filter((id) => id !== "special_complete_all").length;
      return [unlocked, Math.max(total - 1, 0)];
    },
  });

  return list;
}

const ACHIEVEMENTS = generateAchievements();
