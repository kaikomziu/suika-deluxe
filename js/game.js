// ==========================================================================
// game.js - Matter.js を使ったゲーム本体ロジック
// ==========================================================================

const { Engine, World, Bodies, Body, Events, Composite } = Matter;

let stats = loadStats();

// --- キャンバス関連 ---
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const DPR = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = GAME_WIDTH * DPR;
canvas.height = GAME_HEIGHT * DPR;
ctx.scale(DPR, DPR);

// --- Matter.js セットアップ ---
const engine = Engine.create();
engine.gravity.y = 1.1;
const world = engine.world;

const wallOptions = { isStatic: true, friction: 0.05, restitution: 0.1, render: { visible: false } };
const floor = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + WALL_THICKNESS / 2, GAME_WIDTH, WALL_THICKNESS, wallOptions);
const leftWall = Bodies.rectangle(-WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2, wallOptions);
const rightWall = Bodies.rectangle(GAME_WIDTH + WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2, wallOptions);
World.add(world, [floor, leftWall, rightWall]);

// --- ゲーム状態 ---
let score = 0;
let isGameOver = false;
let isPlaying = false;
let dropCooldownUntil = 0;
let previewX = GAME_WIDTH / 2;
let dropQueue = [randomDropTier(), randomDropTier()];
let bodyDangerTimers = new Map(); // body.id -> ms accumulated above danger line
let dangerActive = false;
let lastMergeTime = 0;
let currentChain = 0;
let noMergeStreak = 0;
let gameStartTime = 0;
let dropsThisGame = 0;
let nextBodyExtraId = 1;
let toastQueue = [];
let quickRetryStreak = 0;
let removalSet = new Set(); // このフレームで削除予定のbody.id
let particles = []; // 合体演出パーティクル
let scorePopups = []; // 加算スコアのフロート表示

function randomDropTier() {
  // tier0〜DROP_MAX_TIERの範囲で重み付きランダム
  const weights = [30, 25, 20, 15, 10].slice(0, DROP_MAX_TIER + 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return 0;
}

function currentSkinEmoji() {
  const skin = SKINS.find((s) => s.id === stats.currentSkin) || SKINS[0];
  return skin.emoji;
}

function spawnFruit(tier, x, y, initialVelocity) {
  const t = TIERS[tier];
  const body = Bodies.circle(x, y, t.radius, {
    restitution: 0.15,
    friction: 0.2,
    frictionAir: 0.0008,
    density: 0.0012,
    label: "fruit",
  });
  body.plugin = { tier };
  if (initialVelocity) Body.setVelocity(body, initialVelocity);
  World.add(world, body);
  return body;
}

function dropFruit() {
  if (isGameOver || Date.now() < dropCooldownUntil) return;
  const tier = dropQueue.shift();
  dropQueue.push(randomDropTier());
  const r = TIERS[tier].radius;
  const x = Math.max(WALL_THICKNESS + r, Math.min(GAME_WIDTH - WALL_THICKNESS - r, previewX));
  spawnFruit(tier, x, DANGER_LINE_Y - 10);
  dropCooldownUntil = Date.now() + 380;
  dropsThisGame++;
  stats.totalDrops++;
  noMergeStreak++;
  stats.maxDropsInOneGame = Math.max(stats.maxDropsInOneGame, dropsThisGame);
  stats.maxStackNoMerge = Math.max(stats.maxStackNoMerge, noMergeStreak);
  markTierCreated(tier);
  addDailyProgress("drops", 1);
  evaluateAchievements();
}

// フルーツが(ドロップ or 合体で)作られた時に呼ぶ共通処理
function markTierCreated(tier) {
  stats.tierCreatedCount[tier] = (stats.tierCreatedCount[tier] || 0) + 1;
  if (!stats.tierFirstCreated[tier]) {
    stats.tierFirstCreated[tier] = true;
    showToast(`はじめての「${TIERS[tier].name}」！`);
    if (typeof renderEvolutionRing === "function") renderEvolutionRing();
  }
}

// --- 合体処理 ---
let pendingMerges = [];
Events.on(engine, "collisionStart", (event) => {
  for (const pair of event.pairs) {
    const a = pair.bodyA;
    const b = pair.bodyB;
    if (!a.plugin || !b.plugin) continue;
    if (a.plugin.tier === undefined || b.plugin.tier === undefined) continue;
    if (a.plugin.tier !== b.plugin.tier) continue;
    if (a.plugin.tier >= MAX_TIER) continue;
    if (removalSet.has(a.id) || removalSet.has(b.id)) continue;
    removalSet.add(a.id);
    removalSet.add(b.id);
    pendingMerges.push({ a, b, tier: a.plugin.tier });
  }
});

function processMerges() {
  if (pendingMerges.length === 0) return;
  const merges = pendingMerges;
  pendingMerges = [];
  for (const m of merges) {
    const midX = (m.a.position.x + m.b.position.x) / 2;
    const midY = (m.a.position.y + m.b.position.y) / 2;
    if (m.a._wasDangerLong || m.b._wasDangerLong) {
      stats.dangerEscapes = (stats.dangerEscapes || 0) + 1;
    }
    World.remove(world, m.a);
    World.remove(world, m.b);
    bodyDangerTimers.delete(m.a.id);
    bodyDangerTimers.delete(m.b.id);
    const newTier = m.tier + 1;
    const newBody = spawnFruit(newTier, midX, midY);
    removalSet.delete(m.a.id);
    removalSet.delete(m.b.id);

    const gained = TIERS[newTier].score;
    score += gained;
    if (score > stats.highScore) stats.highScore = score;
    stats.totalMerges++;
    spawnMergeEffects(midX, midY, m.tier, gained);
    markTierCreated(newTier);
    noMergeStreak = 0;

    const now = Date.now();
    if (now - lastMergeTime < 900) {
      currentChain++;
    } else {
      currentChain = 1;
    }
    lastMergeTime = now;
    stats.maxChain = Math.max(stats.maxChain, currentChain);

    addDailyProgress("merges", 1);
    addDailyProgress("chain", currentChain);
    addDailyProgress("score", score);
    addDailyProgress("tier", 1, { tier: newTier });
  }
  evaluateAchievements();
  checkUnlocks();
}

// --- 合体エフェクト(パーティクル・スコアポップアップ) ---
function spawnMergeEffects(x, y, tier, gained) {
  const color = TIERS[tier].light || TIERS[tier].color || "#ffce54";
  const count = 12 + tier * 2;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = 1.5 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 0,
      maxLife: 420 + Math.random() * 200,
      radius: 2 + Math.random() * 3,
      color,
    });
  }
  scorePopups.push({ x, y: y - 10, text: `+${gained}`, life: 0, maxLife: 900 });
}

function updateEffects(delta) {
  for (const p of particles) {
    p.life += delta;
    p.x += p.vx * (delta / 16.6);
    p.y += p.vy * (delta / 16.6);
    p.vy += 0.05 * (delta / 16.6);
  }
  particles = particles.filter((p) => p.life < p.maxLife);

  for (const s of scorePopups) {
    s.life += delta;
    s.y -= 0.4 * (delta / 16.6);
  }
  scorePopups = scorePopups.filter((s) => s.life < s.maxLife);
}

function drawEffects() {
  for (const p of particles) {
    const t = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (1 - t * 0.4), 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  }
  for (const s of scorePopups) {
    const t = s.life / s.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.font = "bold 22px 'Baloo 2','Zen Maru Gothic',sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffce54";
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 3;
    ctx.strokeText(s.text, s.x, s.y);
    ctx.fillText(s.text, s.x, s.y);
    ctx.restore();
  }
}

// --- コイン・デイリーチャレンジ・ログインボーナス ---
function grantCoins(amount) {
  if (amount <= 0) return;
  stats.coins = (stats.coins || 0) + amount;
  stats.totalCoinsEarned = (stats.totalCoinsEarned || 0) + amount;
}

function ensureDailyChallenge() {
  const today = todayDateStr();
  if (!stats.dailyChallenge || stats.dailyChallenge.date !== today) {
    stats.dailyChallenge = generateDailyChallenge(today);
    saveStats(stats);
  }
}

function addDailyProgress(track, amount, opts) {
  ensureDailyChallenge();
  const c = stats.dailyChallenge;
  if (!c || c.track !== track || c.claimed) return;
  if (track === "score" || track === "chain") {
    c.progress = Math.max(c.progress, amount);
  } else if (track === "tier") {
    if (opts && opts.tier === c.targetTier) c.progress = 1;
  } else {
    c.progress += amount;
  }
  if (typeof renderDailyChallengePanel === "function") renderDailyChallengePanel();
}

function claimDailyChallenge() {
  ensureDailyChallenge();
  const c = stats.dailyChallenge;
  if (!c || c.claimed || c.progress < c.target) return false;
  c.claimed = true;
  stats.dailyChallengesCompleted = (stats.dailyChallengesCompleted || 0) + 1;
  grantCoins(c.reward);
  showToast(`🎯 デイリーチャレンジ達成！+${c.reward}コイン`);
  evaluateAchievements();
  saveStats(stats);
  renderHud();
  return true;
}

// 前回ログイン日の翌日以降に開いていればログインボーナスを付与する
function checkLoginBonus() {
  const today = todayDateStr();
  if (stats.lastLoginDate === today) return null;
  const yesterday = todayDateStr(-1);
  stats.loginStreak = stats.lastLoginDate === yesterday ? (stats.loginStreak || 0) + 1 : 1;
  const reward = LOGIN_BONUS_TABLE[(stats.loginStreak - 1) % LOGIN_BONUS_TABLE.length];
  stats.lastLoginDate = today;
  grantCoins(reward);
  evaluateAchievements();
  saveStats(stats);
  return { streak: stats.loginStreak, reward };
}

// --- スキンのコイン購入 ---
function purchaseSkin(skinId) {
  const skin = SKINS.find((s) => s.id === skinId);
  if (!skin || skin.unlock.type !== "coins") return false;
  if (stats.unlockedSkins.includes(skinId)) return false;
  if ((stats.coins || 0) < skin.unlock.value) return false;
  stats.coins -= skin.unlock.value;
  stats.unlockedSkins.push(skinId);
  saveStats(stats);
  return true;
}

// --- 危険ラインとゲームオーバー判定 ---
function updateDangerAndGameOver() {
  const bodies = Composite.allBodies(world).filter((b) => b.label === "fruit");
  let anyDanger = false;
  const aliveIds = new Set();
  for (const b of bodies) {
    aliveIds.add(b.id);
    const r = b.circleRadius;
    const speed = Math.hypot(b.velocity.x, b.velocity.y);
    const top = b.position.y - r;
    if (top < DANGER_LINE_Y && speed < 0.8) {
      anyDanger = true;
      const prev = bodyDangerTimers.get(b.id) || 0;
      const next = prev + 16.6;
      bodyDangerTimers.set(b.id, next);
      if (prev < 1000 && next >= 1000) {
        // 1秒以上危険状態が続いた実績用フラグは合体時に判定
        b._wasDangerLong = true;
      }
      if (next > GAME_OVER_HOLD_MS) {
        triggerGameOver();
        return;
      }
    } else {
      bodyDangerTimers.delete(b.id);
    }
  }
  // 消えたbody(合体で消えた)が長時間危険状態だった場合はdangerEscapes実績
  for (const id of Array.from(bodyDangerTimers.keys())) {
    if (!aliveIds.has(id)) bodyDangerTimers.delete(id);
  }
  dangerActive = anyDanger;
}

function triggerGameOver() {
  if (isGameOver) return;
  isGameOver = true;
  isPlaying = false;
  const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
  stats.longestGameSec = Math.max(stats.longestGameSec, elapsed);
  stats.highScore = Math.max(stats.highScore, score);
  stats.gamesPlayed++;
  stats.lastGameOverTime = Date.now();
  clearAutosave();
  const coinsEarned = Math.floor(score / 50);
  if (coinsEarned > 0) {
    grantCoins(coinsEarned);
    showToast(`🪙 +${coinsEarned}コイン獲得！`);
  }
  if (typeof vsActive !== "undefined" && vsActive) {
    vsPushState(true);
    vsCheckWinConditions();
  }
  evaluateAchievements();
  checkUnlocks();
  saveStats(stats);
  renderHud();
  if (!(typeof vsActive !== "undefined" && vsActive)) {
    showGameOverPanel();
  }
}

// --- セーブ/ロード(スナップショット) ---
function captureSnapshot() {
  const bodies = Composite.allBodies(world).filter((b) => b.label === "fruit");
  return {
    score,
    dropQueue: dropQueue.slice(),
    dropsThisGame,
    noMergeStreak,
    elapsedSec: gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0,
    fruits: bodies.map((b) => ({ tier: b.plugin.tier, x: b.position.x, y: b.position.y, angle: b.angle })),
    savedAt: Date.now(),
  };
}

function restoreSnapshot(snap) {
  if (!snap) return;
  const bodies = Composite.allBodies(world).filter((b) => b.label === "fruit");
  World.remove(world, bodies);
  bodyDangerTimers.clear();
  removalSet.clear();
  pendingMerges = [];
  particles = [];
  scorePopups = [];
  (snap.fruits || []).forEach((f) => {
    const b = spawnFruit(f.tier, f.x, f.y);
    Body.setAngle(b, f.angle || 0);
  });
  score = snap.score || 0;
  dropQueue = snap.dropQueue && snap.dropQueue.length === 2 ? snap.dropQueue.slice() : [randomDropTier(), randomDropTier()];
  dropsThisGame = snap.dropsThisGame || 0;
  noMergeStreak = snap.noMergeStreak || 0;
  currentChain = 0;
  lastMergeTime = 0;
  gameStartTime = Date.now() - (snap.elapsedSec || 0) * 1000;
  isGameOver = false;
  isPlaying = true;
  dropCooldownUntil = 0;
  hideGameOverPanel();
  renderHud();
}

// --- 手動セーブ(5スロット)操作 ---
function manualSaveToSlot(index) {
  const saves = loadManualSaves();
  const snap = captureSnapshot();
  snap.maxTier = snap.fruits.reduce((m, f) => Math.max(m, f.tier), -1);
  saves[index] = snap;
  saveManualSaves(saves);
  return snap;
}
function manualLoadFromSlot(index) {
  const saves = loadManualSaves();
  const snap = saves[index];
  if (!snap) return false;
  restoreSnapshot(snap);
  return true;
}
function manualDeleteSlot(index) {
  const saves = loadManualSaves();
  saves[index] = null;
  saveManualSaves(saves);
}

// --- オートセーブ(2秒ごと + 離脱時。対戦中は対象外) ---
function vsIsActiveNow() {
  return typeof vsActive !== "undefined" && vsActive;
}
setInterval(() => {
  if (isPlaying && !isGameOver && !vsIsActiveNow()) {
    saveAutosave(captureSnapshot());
  }
}, 2000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && isPlaying && !isGameOver && !vsIsActiveNow()) {
    saveAutosave(captureSnapshot());
  }
});
window.addEventListener("beforeunload", () => {
  if (isPlaying && !isGameOver && !vsIsActiveNow()) {
    saveAutosave(captureSnapshot());
  }
});

function startNewGame() {
  // 既存のfruitを全部削除
  const bodies = Composite.allBodies(world).filter((b) => b.label === "fruit");
  World.remove(world, bodies);
  bodyDangerTimers.clear();
  removalSet.clear();
  pendingMerges = [];
  clearAutosave();

  // クイックリトライ判定(直前のゲームオーバーから5秒以内の再スタートが連続した回数)
  const now = Date.now();
  if (gameStartTime !== 0 && stats.lastGameOverTime && now - stats.lastGameOverTime < 5000) {
    quickRetryStreak++;
    stats.quickRetries = Math.max(stats.quickRetries, quickRetryStreak);
  } else {
    quickRetryStreak = 0;
  }

  const hour = new Date().getHours();
  if (hour >= 0 && hour < 4) stats.playedLateNight = true;

  score = 0;
  isGameOver = false;
  isPlaying = true;
  dropsThisGame = 0;
  noMergeStreak = 0;
  currentChain = 0;
  lastMergeTime = 0;
  dropQueue = [randomDropTier(), randomDropTier()];
  gameStartTime = Date.now();
  hideGameOverPanel();
  evaluateAchievements();
  saveStats(stats);
  renderHud();
}

// --- 実績評価 ---
function evaluateAchievements() {
  let unlockedNew = false;
  for (const ach of ACHIEVEMENTS) {
    if (stats.achievementsUnlocked[ach.id]) continue;
    try {
      if (ach.check(stats)) {
        stats.achievementsUnlocked[ach.id] = Date.now();
        unlockedNew = true;
        showToast(`実績解除: ${ach.icon} ${ach.name}`);
      }
    } catch (e) {
      /* ignore */
    }
  }
  if (unlockedNew) {
    saveStats(stats);
    if (typeof renderAchievementsPanel === "function") renderAchievementsPanel();
  }
}

// --- スキン/背景の自動解放判定 ---
function checkUnlocks() {
  let changed = false;
  SKINS.forEach((skin) => {
    if (stats.unlockedSkins.includes(skin.id)) return;
    if (skin.unlock.type === "coins") return; // コイン購入制は自動解放しない
    if (isUnlocked(skin.unlock)) {
      stats.unlockedSkins.push(skin.id);
      showToast(`新しいスキン解放: ${skin.name}`);
      changed = true;
    }
  });
  BACKGROUNDS.forEach((bg) => {
    if (stats.unlockedBackgrounds.includes(bg.id)) return;
    if (isUnlocked(bg.unlock)) {
      stats.unlockedBackgrounds.push(bg.id);
      showToast(`新しい背景解放: ${bg.name}`);
      changed = true;
    }
  });
  if (changed) {
    saveStats(stats);
    if (typeof renderSettingsPanel === "function") renderSettingsPanel();
  }
}

function isUnlocked(unlock) {
  switch (unlock.type) {
    case "always":
      return true;
    case "merges":
      return stats.totalMerges >= unlock.value;
    case "highScore":
      return stats.highScore >= unlock.value || score >= unlock.value;
    case "gamesPlayed":
      return stats.gamesPlayed >= unlock.value;
    case "tierReached":
      return stats.tierFirstCreated[unlock.value] === true;
    case "playtimeSec":
      return stats.totalPlaytimeSec >= unlock.value;
    case "achievementCount":
      return Object.keys(stats.achievementsUnlocked || {}).length >= unlock.value;
    case "coins":
      return false; // 自動解放せず、購入操作でのみ解放する
    case "allSkins":
      return SKINS.filter((s) => s.id !== "candy").every((s) => stats.unlockedSkins.includes(s.id));
    default:
      return false;
  }
}

// --- トースト通知 ---
function showToast(msg) {
  toastQueue.push(msg);
}

function processToastQueue() {
  const container = document.getElementById("toast-container");
  if (!container) return;
  while (toastQueue.length > 0) {
    const msg = toastQueue.shift();
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.classList.add("show"), 10);
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 400);
    }, 3200);
  }
}

// --- 入力処理 ---
function clientToGameX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const ratio = GAME_WIDTH / rect.width;
  return (clientX - rect.left) * ratio;
}

canvas.addEventListener("mousemove", (e) => {
  previewX = clientToGameX(e.clientX);
});
canvas.addEventListener("mousedown", () => dropFruit());
canvas.addEventListener(
  "touchmove",
  (e) => {
    previewX = clientToGameX(e.touches[0].clientX);
    e.preventDefault();
  },
  { passive: false }
);
canvas.addEventListener(
  "touchstart",
  (e) => {
    previewX = clientToGameX(e.touches[0].clientX);
  },
  { passive: false }
);
canvas.addEventListener(
  "touchend",
  (e) => {
    dropFruit();
    e.preventDefault();
  },
  { passive: false }
);
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    dropFruit();
    e.preventDefault();
  }
});

// --- 描画 ---
function draw() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // 危険ライン
  ctx.save();
  ctx.strokeStyle = dangerActive ? "rgba(255,80,80,0.85)" : "rgba(255,255,255,0.35)";
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, DANGER_LINE_Y);
  ctx.lineTo(GAME_WIDTH, DANGER_LINE_Y);
  ctx.stroke();
  ctx.restore();

  // フルーツ描画
  const emoji = currentSkinEmoji();
  const bodies = Composite.allBodies(world).filter((b) => b.label === "fruit");
  for (const b of bodies) {
    drawFruit(b.position.x, b.position.y, b.circleRadius, b.plugin.tier, b.angle, emoji);
  }

  drawEffects();

  // プレビュー(落下予定地点)
  if (!isGameOver) {
    const tier = dropQueue[0];
    const r = TIERS[tier].radius;
    const x = Math.max(WALL_THICKNESS + r, Math.min(GAME_WIDTH - WALL_THICKNESS - r, previewX));
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.moveTo(x, DANGER_LINE_Y - 10);
    ctx.lineTo(x, GAME_HEIGHT);
    ctx.stroke();
    ctx.restore();
    drawFruit(x, DANGER_LINE_Y - 10, r, tier, 0, emoji);
  }
}

function drawFruit(x, y, r, tier, angle, emoji) {
  const t = TIERS[tier];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 落下影
  ctx.beginPath();
  ctx.arc(0, r * 0.12, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fill();

  // 本体(グラデーションで艶っぽく)
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.15, 0, 0, r * 1.05);
  grad.addColorStop(0, t.light || "#ffffff");
  grad.addColorStop(1, t.color || "#ffce54");
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.045);
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.stroke();

  // ハイライト(つや)
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.38, r * 0.32, r * 0.18, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fill();

  ctx.font = `${r * 1.5}px "Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji[tier] || "❓", 0, r * 0.05);
  ctx.restore();
}

// --- TASモード(管理者パスワードで解放するテストプレイ用の自動操作AI) ---
const TAS_ADMIN_PASSWORD = "QirEdfGGedaOOpeD";
let tasModeOn = false;
let tasRestartScheduled = false;

function tasDecideAndAct() {
  if (!isPlaying || isGameOver) return;
  if (Date.now() < dropCooldownUntil) return;
  const tier = dropQueue[0];
  const r = TIERS[tier].radius;
  const bodies = Composite.allBodies(world).filter((b) => b.label === "fruit");
  let targetX;

  // 同じtierのフルーツがあれば、その一番高い位置(y最小)を狙って合体を優先する
  const sameTier = bodies.filter((b) => b.plugin.tier === tier);
  if (sameTier.length > 0) {
    sameTier.sort((a, b) => a.position.y - b.position.y);
    targetX = sameTier[0].position.x;
  } else {
    // 無ければ、盤面を列に分けて一番低く積まれている(空いている)列を狙う
    const cols = 8;
    const innerLeft = WALL_THICKNESS;
    const innerWidth = GAME_WIDTH - WALL_THICKNESS * 2;
    const colWidth = innerWidth / cols;
    let bestCol = 0;
    let bestTopY = -Infinity;
    for (let c = 0; c < cols; c++) {
      const cx0 = innerLeft + c * colWidth;
      const cx1 = cx0 + colWidth;
      const inCol = bodies.filter((b) => b.position.x >= cx0 && b.position.x < cx1);
      const topY = inCol.length > 0 ? Math.min(...inCol.map((b) => b.position.y - b.circleRadius)) : GAME_HEIGHT;
      if (topY > bestTopY) {
        bestTopY = topY;
        bestCol = c;
      }
    }
    targetX = innerLeft + bestCol * colWidth + colWidth / 2;
  }

  previewX = Math.max(WALL_THICKNESS + r, Math.min(GAME_WIDTH - WALL_THICKNESS - r, targetX));
  dropFruit();
}

// --- HUD ---
function renderHud() {
  document.getElementById("hud-score").textContent = score.toLocaleString();
  document.getElementById("hud-best").textContent = stats.highScore.toLocaleString();
  document.getElementById("hud-next-emoji").textContent = currentSkinEmoji()[dropQueue[1]] || "";
  const coinsEl = document.getElementById("hud-coins");
  if (coinsEl) coinsEl.textContent = "🪙" + (stats.coins || 0).toLocaleString();
}

function showGameOverPanel() {
  const panel = document.getElementById("gameover-panel");
  panel.classList.add("visible");
  document.getElementById("final-score").textContent = score.toLocaleString();
}
function hideGameOverPanel() {
  document.getElementById("gameover-panel").classList.remove("visible");
}

// --- メインループ ---
let lastTime = performance.now();
function loop(now) {
  const delta = Math.min(now - lastTime, 33);
  lastTime = now;
  if (isPlaying && !isGameOver) {
    Engine.update(engine, delta);
    processMerges();
    updateDangerAndGameOver();
  }
  if (typeof vsActive !== "undefined" && vsActive) {
    vsPushState();
    vsCheckWinConditions();
  }
  if (tasModeOn) {
    if (isPlaying && !isGameOver) {
      tasDecideAndAct();
    } else if (isGameOver && !tasRestartScheduled) {
      tasRestartScheduled = true;
      setTimeout(() => {
        tasRestartScheduled = false;
        if (tasModeOn) startNewGame();
      }, 700);
    }
  }
  updateEffects(delta);
  draw();
  renderHud();
  processToastQueue();
  requestAnimationFrame(loop);
}

// --- プレイ時間計測(5秒ごと) ---
setInterval(() => {
  if (isPlaying && !isGameOver) {
    stats.totalPlaytimeSec += 5;
    saveStats(stats);
    evaluateAchievements();
  }
}, 5000);

requestAnimationFrame(loop);
