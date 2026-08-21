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
        renderEvolutionRing();
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

// --- しんかの輪(進化系統の一覧。すいかより上は初生成まで「？」表示) ---
function renderEvolutionRing() {
  const strip = document.getElementById("evo-ring");
  if (!strip) return;
  strip.innerHTML = "";
  const emoji = currentSkinEmoji();
  const WATERMELON_TIER = 10;
  TIERS.forEach((t, i) => {
    const discovered = i <= WATERMELON_TIER || (stats.tierFirstCreated && stats.tierFirstCreated[i]);
    const item = document.createElement("div");
    item.className = "evo-item" + (discovered ? "" : " locked") + (i === WATERMELON_TIER ? " evo-milestone" : "");
    item.title = discovered ? t.name : "???(すいかの先の未知のフルーツ)";
    item.innerHTML = `<span class="evo-emoji">${discovered ? emoji[i] : "❓"}</span>`;
    strip.appendChild(item);
    if (i === WATERMELON_TIER) {
      const badge = document.createElement("div");
      badge.className = "evo-badge";
      badge.textContent = "SUIKAの先へ→";
      strip.appendChild(badge);
    } else if (i < TIERS.length - 1) {
      const arrow = document.createElement("span");
      arrow.className = "evo-arrow";
      arrow.textContent = "→";
      strip.appendChild(arrow);
    }
  });
}

// --- 手動セーブ/ロード(5スロット) ---
function renderSaveSlotsPanel() {
  const grid = document.getElementById("saveslots-grid");
  if (!grid) return;
  grid.innerHTML = "";
  const saves = loadManualSaves();
  const emoji = currentSkinEmoji();
  saves.forEach((slot, i) => {
    const card = document.createElement("div");
    card.className = "save-slot-card" + (slot ? " filled" : "");
    if (slot) {
      const d = new Date(slot.savedAt);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes()
      ).padStart(2, "0")}`;
      const tierName = slot.maxTier >= 0 ? TIERS[slot.maxTier].name : "-";
      const tierEmoji = slot.maxTier >= 0 ? emoji[slot.maxTier] : "";
      card.innerHTML = `
        <div class="slot-title">スロット ${i + 1}</div>
        <div class="slot-info">${dateStr}</div>
        <div class="slot-info">スコア: ${slot.score.toLocaleString()}</div>
        <div class="slot-info">${tierEmoji} ${tierName}</div>
        <div class="slot-actions">
          <button class="btn btn-sm btn-load" data-slot="${i}">読み込む</button>
          <button class="btn btn-sm btn-save" data-slot="${i}">上書き保存</button>
          <button class="btn btn-sm btn-delete" data-slot="${i}">削除</button>
        </div>`;
    } else {
      card.innerHTML = `
        <div class="slot-title">スロット ${i + 1}</div>
        <div class="slot-info empty">空きスロット</div>
        <div class="slot-actions">
          <button class="btn btn-sm btn-save" data-slot="${i}">ここに保存</button>
        </div>`;
    }
    grid.appendChild(card);
  });

  grid.querySelectorAll(".btn-save").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.slot);
      manualSaveToSlot(i);
      showToast(`スロット${i + 1}に保存しました`);
      renderSaveSlotsPanel();
    });
  });
  grid.querySelectorAll(".btn-load").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.slot);
      if (confirm(`現在プレイ中の内容は失われます。スロット${i + 1}を読み込みますか？`)) {
        manualLoadFromSlot(i);
        closeModal("modal-saveslots");
        showToast(`スロット${i + 1}を読み込みました`);
      }
    });
  });
  grid.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.slot);
      if (confirm(`スロット${i + 1}を削除しますか？`)) {
        manualDeleteSlot(i);
        renderSaveSlotsPanel();
      }
    });
  });
}

// --- 続きから再開ダイアログ ---
function showResumeDialog(snap) {
  const info = document.getElementById("resume-info");
  const d = new Date(snap.savedAt);
  const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
  info.textContent = `${dateStr} 時点のプレイデータがあります(スコア: ${snap.score.toLocaleString()})。続きから再開しますか？`;
  openModal("modal-resume");
}

function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}時間${m}分`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

// --- TASモード(管理者パスワードで解放)関連のUI ---
function renderTasButton() {
  const btn = document.getElementById("btn-tas");
  if (!btn) return;
  btn.style.display = stats.tasUnlocked ? "" : "none";
  btn.textContent = tasModeOn ? "🤖 TAS: ON" : "🤖 TAS: OFF";
  btn.classList.toggle("btn-primary", tasModeOn);
}

// --- ボタン・モーダルのイベント配線 ---
document.addEventListener("DOMContentLoaded", () => {
  applyBackground();
  renderAchievementsPanel();
  renderSettingsPanel();
  renderChangelog();
  renderStatsPanel();
  renderEvolutionRing();
  renderTasButton();

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
  document.getElementById("btn-saveslots").addEventListener("click", () => {
    renderSaveSlotsPanel();
    openModal("modal-saveslots");
  });

  document.getElementById("btn-tas").addEventListener("click", () => {
    tasModeOn = !tasModeOn;
    renderTasButton();
    showToast(tasModeOn ? "🤖 TASモード開始(自動プレイ)" : "TASモード停止");
  });

  // 管理者パスワードでTASモードを解放する隠しトリガー(ロゴを連打)
  let logoClickCount = 0;
  let logoClickResetTimer = null;
  const logoEmoji = document.querySelector(".logo-emoji");
  if (logoEmoji) {
    logoEmoji.addEventListener("click", () => {
      logoClickCount++;
      clearTimeout(logoClickResetTimer);
      logoClickResetTimer = setTimeout(() => {
        logoClickCount = 0;
      }, 2500);
      if (logoClickCount >= 5) {
        logoClickCount = 0;
        const pw = prompt("管理者パスワードを入力してください:");
        if (pw === null) return;
        if (pw === TAS_ADMIN_PASSWORD) {
          stats.tasUnlocked = true;
          saveStats(stats);
          renderTasButton();
          showToast("🤖 TASモード(自動テストプレイ)を解放しました！");
        } else {
          showToast("パスワードが違います");
        }
      }
    });
  }

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", (e) => closeModal(btn.getAttribute("data-close-modal")));
  });
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    if (overlay.id === "modal-resume") return; // 再開ダイアログは選択必須(外側クリックで閉じない)
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

  // 前回の続きがあれば再開ダイアログ、無ければ新規ゲーム開始
  const pendingAutosave = loadAutosave();
  if (pendingAutosave && pendingAutosave.dropsThisGame > 0) {
    showResumeDialog(pendingAutosave);
    document.getElementById("btn-resume-continue").addEventListener("click", () => {
      closeModal("modal-resume");
      restoreSnapshot(pendingAutosave);
      renderEvolutionRing();
    });
    document.getElementById("btn-resume-fresh").addEventListener("click", () => {
      closeModal("modal-resume");
      clearAutosave();
      startNewGame();
    });
  } else {
    startNewGame();
  }
});
