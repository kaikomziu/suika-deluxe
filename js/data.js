// ==========================================================================
// data.js - フルーツ段階・スキン・背景・定数データ定義
// ==========================================================================

// フルーツ段階(すいかの上位も含めて全15段階)
// radius: 物理半径(px) / score: 合体時に得られる基礎スコア
const TIERS = [
  { id: 0, name: "さくらんぼ", radius: 16, score: 1, color: "#e63950", light: "#ff8fa0" },
  { id: 1, name: "いちご", radius: 22, score: 3, color: "#ff4f6d", light: "#ffb0c0" },
  { id: 2, name: "ぶどう", radius: 28, score: 6, color: "#8451d1", light: "#c6a6ff" },
  { id: 3, name: "でこぽん", radius: 36, score: 10, color: "#ff9a1f", light: "#ffd28a" },
  { id: 4, name: "りんご", radius: 44, score: 15, color: "#ff4136", light: "#ff9a90" },
  { id: 5, name: "なし", radius: 52, score: 21, color: "#c3d94a", light: "#ecf8a8" },
  { id: 6, name: "もも", radius: 60, score: 28, color: "#ff9dba", light: "#ffdce8" },
  { id: 7, name: "パイナップル", radius: 70, score: 36, color: "#ffd23d", light: "#fff0a3" },
  { id: 8, name: "ココナッツ", radius: 80, score: 45, color: "#b98a5a", light: "#e6c79a" },
  { id: 9, name: "メロン", radius: 92, score: 55, color: "#8bd94f", light: "#d4f5a8" },
  { id: 10, name: "すいか", radius: 105, score: 66, color: "#2fae5c", light: "#8de3a8" },
  { id: 11, name: "小さな星", radius: 120, score: 80, color: "#6fa8ff", light: "#c6e0ff" },
  { id: 12, name: "月", radius: 136, score: 100, color: "#d7d7e6", light: "#ffffff" },
  { id: 13, name: "太陽", radius: 154, score: 130, color: "#ffb238", light: "#ffe79a" },
  { id: 14, name: "銀河", radius: 175, score: 200, color: "#8a5fe0", light: "#d9c6ff" },
];
const MAX_TIER = TIERS.length - 1; // 14 = 銀河
// 通常ドロップで出現する最大tier(これより上は合体でのみ出現)
const DROP_MAX_TIER = 4; // りんごまで

// スキン定義: 各tierに対応する絵文字を15個ずつ用意
const SKINS = [
  {
    id: "default",
    name: "デフォルト(フルーツ)",
    unlock: { type: "always" },
    emoji: ["🍒", "🍓", "🍇", "🍊", "🍎", "🍐", "🍑", "🍍", "🥥", "🍈", "🍉", "🌍", "🌙", "☀️", "🌌"],
  },
  {
    id: "animals",
    name: "どうぶつ",
    unlock: { type: "coins", value: 120, label: "120コインで購入" },
    emoji: ["🐭", "🐹", "🐰", "🐱", "🐶", "🐷", "🐵", "🦁", "🐮", "🐸", "🐻", "🐼", "🐨", "🦄", "🐲"],
  },
  {
    id: "gems",
    name: "ジェム",
    unlock: { type: "highScore", value: 10000, label: "1ゲームで10,000点獲得で解放" },
    emoji: ["🔸", "🔶", "🟠", "🟡", "💛", "🟢", "🔵", "🟣", "⚪", "⚫", "💠", "🔷", "💎", "⭐", "🌟"],
  },
  {
    id: "sushi",
    name: "スイーツ&お寿司",
    unlock: { type: "gamesPlayed", value: 50, label: "累計プレイ回数50回で解放" },
    emoji: ["🍙", "🍘", "🍥", "🍡", "🍢", "🍧", "🍨", "🍦", "🍰", "🎂", "🍩", "🍪", "🧁", "🥮", "🍮"],
  },
  {
    id: "space",
    name: "スペース",
    unlock: { type: "tierReached", value: 12, label: "「月」を作成すると解放" },
    emoji: ["☄️", "🛰️", "🌑", "🌒", "🌓", "🌔", "🌕", "🪐", "🌎", "🌏", "🌞", "✨", "🌠", "🌌", "🕳️"],
  },
  {
    id: "cats",
    name: "ねこ",
    unlock: { type: "coins", value: 150, label: "150コインで購入" },
    emoji: ["🐱", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🐈", "🐈‍⬛", "🦁", "🐯", "🐆"],
  },
  {
    id: "farm",
    name: "のうじょう",
    unlock: { type: "coins", value: 150, label: "150コインで購入" },
    emoji: ["🐣", "🐤", "🐥", "🐓", "🐔", "🦆", "🦢", "🐇", "🐐", "🐑", "🐖", "🐄", "🐂", "🦃", "🐎"],
  },
  {
    id: "flowers",
    name: "きせつの花",
    unlock: { type: "coins", value: 250, label: "250コインで購入" },
    emoji: ["🌱", "🌿", "🍀", "🌾", "🌻", "🌼", "🌸", "🌺", "🌹", "🥀", "💐", "🏵️", "🌷", "🌵", "🎍"],
  },
  {
    id: "vehicles",
    name: "のりもの",
    unlock: { type: "coins", value: 350, label: "350コインで購入" },
    emoji: ["🚲", "🛵", "🏍️", "🚗", "🚕", "🚙", "🚓", "🚑", "🚒", "🚐", "🚚", "🚛", "🚜", "🚌", "🚀"],
  },
  {
    id: "sea",
    name: "うみのなかま",
    unlock: { type: "highScore", value: 25000, label: "1ゲームで25,000点獲得で解放" },
    emoji: ["🐠", "🐡", "🦐", "🦑", "🐙", "🦀", "🦞", "🐢", "🐬", "🦈", "🐳", "🐋", "🌊", "🧜‍♀️", "🔱"],
  },
  {
    id: "reptiles",
    name: "きょうりゅう&は虫類",
    unlock: { type: "tierReached", value: 9, label: "「メロン」を作成すると解放" },
    emoji: ["🦎", "🐍", "🐢", "🐊", "🦂", "🕸️", "🕷️", "🦗", "🐌", "🦖", "🦕", "🐲", "🐉", "🌋", "👑"],
  },
  {
    id: "robots",
    name: "エイリアン&ロボット",
    unlock: { type: "tierReached", value: 13, label: "「太陽」を作成すると解放" },
    emoji: ["🔧", "⚙️", "🔩", "🛠️", "🔋", "💡", "🔌", "📡", "🤖", "👾", "👽", "🛸", "🚀", "🌌", "🪐"],
  },
  {
    id: "treasure",
    name: "おかね&おたから",
    unlock: { type: "highScore", value: 100000, label: "1ゲームで100,000点獲得で解放" },
    emoji: ["🪙", "💵", "💴", "💶", "💷", "💳", "🧧", "🎟️", "💎", "🏅", "🥉", "🥈", "🥇", "👑", "💰"],
  },
  {
    id: "instruments",
    name: "がっき",
    unlock: { type: "merges", value: 1000, label: "累計マージ数1,000回で解放" },
    emoji: ["🎵", "🎶", "🥁", "🎷", "🎺", "🎸", "🪕", "🎻", "🎹", "🎤", "🎧", "📯", "🪗", "🔔", "🎼"],
  },
  {
    id: "halloween",
    name: "ハロウィン",
    unlock: { type: "playtimeSec", value: 3600, label: "累計プレイ時間1時間で解放" },
    emoji: ["🍬", "🕸️", "🕷️", "🦇", "🌙", "🔮", "👻", "🧛", "🧟", "🧙", "💀", "☠️", "⚰️", "🪦", "🎃"],
  },
  {
    id: "christmas",
    name: "クリスマス",
    unlock: { type: "gamesPlayed", value: 250, label: "累計プレイ回数250回で解放" },
    emoji: ["🍪", "🧦", "🕯️", "✨", "⭐", "🔔", "🎁", "🛷", "🦌", "🤶", "🎅", "⛄", "❄️", "🎄", "🌟"],
  },
  {
    id: "weather",
    name: "おてんき",
    unlock: { type: "coins", value: 350, label: "350コインで購入" },
    emoji: ["☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "❄️", "🌪️", "🌈", "🌊", "💧", "☔"],
  },
];

// 背景定義: CSS上のクラス名で切り替え
const BACKGROUNDS = [
  {
    id: "classic",
    name: "クラシック",
    unlock: { type: "always" },
    css: "bg-classic",
  },
  {
    id: "night",
    name: "夜空",
    unlock: { type: "always" },
    css: "bg-night",
  },
  {
    id: "beach",
    name: "浜辺",
    unlock: { type: "highScore", value: 5000, label: "1ゲームで5,000点獲得で解放" },
    css: "bg-beach",
  },
  {
    id: "forest",
    name: "森",
    unlock: { type: "merges", value: 100, label: "累計マージ数100回で解放" },
    css: "bg-forest",
  },
  {
    id: "retro",
    name: "レトロ",
    unlock: { type: "gamesPlayed", value: 30, label: "累計プレイ回数30回で解放" },
    css: "bg-retro",
  },
  {
    id: "space",
    name: "宇宙",
    unlock: { type: "tierReached", value: 14, label: "「銀河」を作成すると解放" },
    css: "bg-space",
  },
  {
    id: "sakura",
    name: "さくら",
    unlock: { type: "highScore", value: 500000, label: "1ゲームで500,000点獲得で解放" },
    css: "bg-sakura",
  },
  {
    id: "candy",
    name: "キャンディ",
    unlock: { type: "allSkins", label: "全てのスキンを解放すると解放" },
    css: "bg-candy",
  },
];

// キャンバス基準サイズ
const GAME_WIDTH = 640;
const GAME_HEIGHT = 820;
const WALL_THICKNESS = 24;
const DANGER_LINE_Y = 120; // このラインより上に静止すると危険
const GAME_OVER_HOLD_MS = 2000; // 危険ラインに何ms居座るとゲームオーバーか
