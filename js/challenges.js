// ==========================================================================
// challenges.js - デイリーチャレンジ・ログインボーナスの定義
// ==========================================================================

// ログインボーナス: 連続ログイン日数に応じたコイン報酬(7日周期でループ)
const LOGIN_BONUS_TABLE = [20, 30, 45, 60, 80, 110, 200];

// デイリーチャレンジのテンプレート
// track: "score"(1ゲームの最高スコア) / "merges"(本日の合計マージ数) /
//        "drops"(本日の合計ドロップ数) / "chain"(本日の最大連鎖数) / "tier"(指定フルーツを作る)
const CHALLENGE_TEMPLATES = [
  {
    id: "score",
    track: "score",
    targets: [3000, 6000, 10000, 20000, 50000],
    reward: 150,
    label: (t) => `1ゲームで${t.toLocaleString()}点以上を獲得する`,
  },
  {
    id: "merges",
    track: "merges",
    targets: [20, 40, 80, 150],
    reward: 120,
    label: (t) => `本日中に合計${t}回フルーツを合体させる`,
  },
  {
    id: "drops",
    track: "drops",
    targets: [30, 60, 100, 150],
    reward: 100,
    label: (t) => `本日中に合計${t}個のフルーツを落とす`,
  },
  {
    id: "chain",
    track: "chain",
    targets: [2, 3, 4, 5],
    reward: 200,
    label: (t) => `1回のドロップで${t}連鎖を起こす`,
  },
  {
    id: "tier",
    track: "tier",
    targets: [7, 8, 9, 10, 11],
    reward: 220,
    label: (t) => `「${TIERS[t].name}」を作る`,
  },
];

function todayDateStr(offsetDays) {
  const d = new Date();
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 日付文字列から決定的な擬似乱数を作る(同じ日は誰が開いても同じチャレンジになる)
function seededRandom(seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  return function () {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return seed / 4294967296;
  };
}

function generateDailyChallenge(dateStr) {
  const rand = seededRandom(dateStr);
  const tpl = CHALLENGE_TEMPLATES[Math.floor(rand() * CHALLENGE_TEMPLATES.length)];
  const targetValue = tpl.targets[Math.floor(rand() * tpl.targets.length)];
  return {
    date: dateStr,
    track: tpl.track,
    target: tpl.track === "tier" ? 1 : targetValue,
    targetTier: tpl.track === "tier" ? targetValue : null,
    label: tpl.label(targetValue),
    reward: tpl.reward,
    progress: 0,
    claimed: false,
  };
}
