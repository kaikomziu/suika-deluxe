// ==========================================================================
// ui.js - モーダル・設定・実績パネルのDOM制御
// ==========================================================================

function openModal(id) {
  document.getElementById(id).classList.add("visible");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("visible");
}

function applyBackground() {
  const bg = BACKGROUNDS.find((b) => b.id === stats.currentBackground) || BACKGROUNDS[0];
  BACKGROUNDS.forEach((b) => document.body.classList.remove(b.css));
  document.body.classList.add(bg.css);
}

function renderAchievementsPanel() {
  const container = document.getElementById("achievements-list");
  if (!container) return;
  container.innerHTML = "";

  const unlockedCount = ACHIEVEMENTS.filter((a) => stats.achievementsUnlocked[a.id]).length;
  document.getElementById(
    "achievements-summary"
  ).textContent = `解放済み: ${unlockedCount} / ${ACHIEVEMENTS.length}`;

  const categories = {};
  ACHIEVEMENTS.forEach((a) => {
    if (!categories[a.category]) categories[a.category] = [];
    categories[a.category].push(a);
  });

  Object.keys(categories).forEach((cat) => {
    const group = document.createElement("div");
    group.className = "ach-group";
    const title = document.createElement("h3");
    const catUnlocked = categories[cat].filter((a) => stats.achievementsUnlocked[a.id]).length;
    title.textContent = `${cat} (${catUnlocked}/${categories[cat].length})`;
    group.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "ach-grid";
    categories[cat].forEach((a) => {
      const unlocked = !!stats.achievementsUnlocked[a.id];
      const card = document.createElement("div");
      card.className = "ach-card" + (unlocked ? " unlocked" : "");
      const [cur, max] = a.progress ? a.progress(stats) : [unlocked ? 1 : 0, 1];
      const pct = max > 0 ? Math.min(100, Math.round((cur / max) * 100)) : 0;
      card.innerHTML = `
        <div class="ach-icon">${unlocked ? a.icon : "🔒"}</div>
        <div class="ach-body">
          <div class="ach-name">${a.name}</div>
          <div class="ach-desc">${a.desc}</div>
          ${
            !unlocked
              ? `<div class="ach-progress"><div class="ach-progress-bar" style="width:${pct}%"></div></div>
                 <div class="ach-progress-label">${cur.toLocaleString ? cur.toLocaleString() : cur} / ${max.toLocaleString ? max.toLocaleString() : max}</div>`
              : `<div class="ach-progress-label">達成済み</div>`
          }
        </div>`;
      grid.appendChild(card);
    });
    group.appendChild(grid);
    container.appendChild(group);
  });
}

function renderSettingsPanel() {
  renderSkinGrid();
  renderBackgroundGrid();
}

function renderSkinGrid() {
  const grid = document.getElementById("skins-grid");
  if (!grid) return;
  grid.innerHTML = "";
  SKINS.forEach((skin) => {
    const unlocked = stats.unlockedSkins.includes(skin.id);
    const selected = stats.currentSkin === skin.id;
    const card = document.createElement("div");
    card.className = "option-card" + (unlocked ? "" : " locked") + (selected ? " selected" : "");
    const preview = skin.emoji.slice(0, 5).join(" ");
    card.innerHTML = `
      <div class="option-preview">${unlocked ? preview : "🔒"}</div>
      <div class="option-name">${skin.name}</div>
      <div class="option-sub">${unlocked ? (selected ? "選択中" : "選択する") : skin.unlock.label || ""}</div>
    `;
    if (unlocked) {
      card.addEventListener("click", () => {
        stats.currentSkin = skin.id;
        saveStats(stats);
        renderSkinGrid();
      });
    }
    grid.appendChild(card);
  });
}

function renderBackgroundGrid() {
  const grid = document.getElementById("backgrounds-grid");
  if (!grid) return;
  grid.innerHTML = "";
  BACKGROUNDS.forEach((bg) => {
    const unlocked = stats.unlockedBackgrounds.includes(bg.id);
    const selected = stats.currentBackground === bg.id;
    const card = document.createElement("div");
    card.className = "option-card bg-swatch " + bg.css + (unlocked ? "" : " locked") + (selected ? " selected" : "");
    card.innerHTML = `
      <div class="option-preview">${unlocked ? "" : "🔒"}</div>
      <div class="option-name">${bg.name}</div>
      <div class="option-sub">${unlocked ? (selected ? "選択中" : "選択する") : bg.unlock.label || ""}</div>
    `;
    if (unlocked) {
      card.addEventListener("click", () => {
        stats.currentBackground = bg.id;
        saveStats(stats);
        applyBackground();
        renderBackgroundGrid();
      });
    }
    grid.appendChild(card);
  });
}

function renderChangelog() {
  const container = document.getElementById("changelog-list");
  if (!container) return;
  container.innerHTML = "";
  CHANGELOG.forEach((entry) => {
    const block = document.createElement("div");
    block.className = "changelog-entry";
    block.innerHTML = `<h3>v${entry.version} <span class="changelog-date">${entry.date}</span></h3>
      <ul>${entry.notes.map((n) => `<li>${n}</li>`).join("")}</ul>`;
    container.appendChild(block);
  });
}

function renderStatsPanel() {
  const el = document.getElementById("stats-list");
  if (!el) return;
  el.innerHTML = `
    <div class="stat-row"><span>自己ベストスコア</span><span>${stats.highScore.toLocaleString()}</span></div>
    <div class="stat-row"><span>累計マージ回数</span><span>${stats.totalMerges.toLocaleString()}</span></div>
    <div class="stat-row"><span>累計プレイ回数</span><span>${stats.gamesPlayed.toLocaleString()}</span></div>
    <div class="stat-row"><span>累計プレイ時間</span><span>${formatDuration(stats.totalPlaytimeSec)}</span></div>
    <div class="stat-row"><span>累計ドロップ数</span><span>${stats.totalDrops.toLocaleString()}</span></div>
    <div class="stat-row"><span>最大連鎖数</span><span>${stats.maxChain}連鎖</span></div>
  `;
}

function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}時間${m}分`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

// --- ボタン・モーダルのイベント配線 ---
document.addEventListener("DOMContentLoaded", () => {
  applyBackground();
  renderAchievementsPanel();
  renderSettingsPanel();
  renderChangelog();
  renderStatsPanel();

  document.getElementById("btn-restart").addEventListener("click", () => startNewGame());
  document.getElementById("btn-gameover-restart").addEventListener("click", () => startNewGame());

  document.getElementById("btn-achievements").addEventListener("click", () => {
    renderAchievementsPanel();
    openModal("modal-achievements");
  });
  document.getElementById("btn-settings").addEventListener("click", () => {
    renderSettingsPanel();
    openModal("modal-settings");
  });
  document.getElementById("btn-changelog").addEventListener("click", () => {
    renderStatsPanel();
    openModal("modal-changelog");
  });

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", (e) => closeModal(btn.getAttribute("data-close-modal")));
  });
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("visible");
    });
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabGroup = btn.closest(".modal-panel");
      tabGroup.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      tabGroup.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });

  startNewGame();
});
