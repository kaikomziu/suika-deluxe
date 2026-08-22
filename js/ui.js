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

// --- マルチプレイ(対戦)UI ---
function setVersusPanelVisible(visible) {
  const panel = document.getElementById("versus-panel");
  if (panel) panel.style.display = visible ? "flex" : "none";
}

function renderVersusPanel() {
  const myEl = document.getElementById("versus-my-score");
  const oppEl = document.getElementById("versus-opp-score");
  const statusEl = document.getElementById("versus-opp-status");
  if (!myEl || !oppEl) return;
  myEl.textContent = score.toLocaleString();
  oppEl.textContent = (vsOpponentState.score || 0).toLocaleString();
  if (statusEl) {
    if (!vsOpponentState.alive) {
      statusEl.textContent = "💀 脱落";
      statusEl.classList.add("dead");
    } else {
      statusEl.textContent = "";
      statusEl.classList.remove("dead");
    }
  }
}

function showVersusCountdown(onDone) {
  const overlay = document.getElementById("versus-countdown-overlay");
  const numberEl = document.getElementById("versus-countdown-number");
  if (!overlay || !numberEl) {
    onDone && onDone();
    return;
  }
  let n = 3;
  overlay.classList.add("visible");
  numberEl.textContent = String(n);
  const tick = () => {
    n--;
    if (n > 0) {
      numberEl.textContent = String(n);
      numberEl.style.animation = "none";
      void numberEl.offsetWidth;
      numberEl.style.animation = "";
      setTimeout(tick, 800);
    } else {
      numberEl.textContent = "START!";
      numberEl.style.animation = "none";
      void numberEl.offsetWidth;
      numberEl.style.animation = "";
      setTimeout(() => {
        overlay.classList.remove("visible");
        onDone && onDone();
      }, 700);
    }
  };
  setTimeout(tick, 800);
}

function showVersusResult(outcome, myScore, oppScore) {
  const title = document.getElementById("versus-result-title");
  const scoresEl = document.getElementById("versus-result-scores");
  if (outcome === "win") {
    title.textContent = "🏆 WIN!";
  } else if (outcome === "lose") {
    title.textContent = "😢 LOSE";
  } else {
    title.textContent = "🤝 DRAW";
  }
  scoresEl.textContent = `あなた: ${myScore.toLocaleString()}点 / 相手: ${oppScore.toLocaleString()}点`;
  openModal("modal-versus-result");
}

function showVersusLobbyMenu() {
  document.getElementById("versus-lobby-menu").style.display = "";
  document.getElementById("versus-lobby-waiting").style.display = "none";
  const input = document.getElementById("versus-code-input");
  if (input) input.value = "";
  ["versus-room-name-private", "versus-room-name-public"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  vsStopPublicListPolling();
  // 開くたびにプライベートタブへ戻す
  const lobbyPanel = document.getElementById("versus-lobby-menu");
  lobbyPanel.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  lobbyPanel.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
  const privateTabBtn = lobbyPanel.querySelector('[data-tab="tab-versus-private"]');
  if (privateTabBtn) privateTabBtn.classList.add("active");
  const privateTabContent = document.getElementById("tab-versus-private");
  if (privateTabContent) privateTabContent.classList.add("active");
}

function showVersusLobbyWaiting(code) {
  document.getElementById("versus-lobby-menu").style.display = "none";
  document.getElementById("versus-lobby-waiting").style.display = "";
  document.getElementById("versus-room-code-display").textContent = code;
  document.getElementById("versus-room-name-display").textContent = vsRoomName || "";
  document.getElementById("versus-waiting-text").textContent = "対戦相手を待っています…";
  vsStopPublicListPolling();
}

// --- パブリックルーム一覧 ---
let vsPublicListTimer = null;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function vsFormatElapsed(createdAt) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
  if (sec < 60) return `${sec}秒前`;
  return `${Math.floor(sec / 60)}分前`;
}

async function renderPublicRoomList() {
  const list = document.getElementById("versus-public-list");
  if (!list) return;
  const rooms = await vsListPublicRooms();
  list.innerHTML = "";
  if (rooms.length === 0) {
    list.innerHTML = `<div class="versus-public-empty">現在募集中のルームはありません</div>`;
    return;
  }
  rooms.forEach((r) => {
    const row = document.createElement("div");
    row.className = "versus-room-row";
    const safeName = escapeHtml(r.room_name || "");
    const safeCode = escapeHtml(r.code);
    const label = safeName ? `${safeName} <span class="versus-room-row-code">(${safeCode})</span>` : `<span class="versus-room-row-code">${safeCode}</span>`;
    row.innerHTML = `
      <span>${label}<span class="versus-room-row-time">${vsFormatElapsed(r.created_at)}</span></span>
      <button class="btn btn-sm btn-join-public" data-code="${safeCode}">参加する</button>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll(".btn-join-public").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = btn.dataset.code;
      btn.disabled = true;
      const ok = await vsJoinRoom(code);
      if (ok) {
        showVersusLobbyWaiting(code);
        document.getElementById("versus-waiting-text").textContent = "まもなく開始します…";
      } else {
        btn.disabled = false;
        renderPublicRoomList();
      }
    });
  });
}

function vsStartPublicListPolling() {
  vsStopPublicListPolling();
  renderPublicRoomList();
  vsPublicListTimer = setInterval(renderPublicRoomList, 4000);
}
function vsStopPublicListPolling() {
  if (vsPublicListTimer) {
    clearInterval(vsPublicListTimer);
    vsPublicListTimer = null;
  }
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
    const isCoinSkin = skin.unlock.type === "coins";
    const card = document.createElement("div");
    card.className =
      "option-card" + (unlocked ? "" : " locked") + (isCoinSkin && !unlocked ? " buyable" : "") + (selected ? " selected" : "");
    const preview = skin.emoji.slice(0, 5).join(" ");
    let subHtml;
    if (unlocked) {
      subHtml = selected ? "選択中" : "選択する";
    } else if (isCoinSkin) {
      const afford = (stats.coins || 0) >= skin.unlock.value;
      subHtml = `<button class="btn btn-sm btn-buy-skin" data-skin="${skin.id}" ${afford ? "" : "disabled"}>🪙${skin.unlock.value}で購入</button>`;
    } else {
      subHtml = skin.unlock.label || "";
    }
    card.innerHTML = `
      <div class="option-preview">${unlocked ? preview : "🔒"}</div>
      <div class="option-name">${skin.name}</div>
      <div class="option-sub">${subHtml}</div>
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

  grid.querySelectorAll(".btn-buy-skin").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.skin;
      if (purchaseSkin(id)) {
        showToast("スキンを購入しました！");
        renderSkinGrid();
        renderHud();
      } else {
        showToast("コインが足りません");
      }
    });
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

// --- デイリーチャレンジ ---
function renderDailyChallengePanel() {
  ensureDailyChallenge();
  const box = document.getElementById("daily-challenge-box");
  if (!box) return;
  const c = stats.dailyChallenge;
  const pct = c.target > 0 ? Math.min(100, Math.round((Math.min(c.progress, c.target) / c.target) * 100)) : 0;
  const done = c.progress >= c.target;
  box.innerHTML = `
    <div class="daily-label">${c.label}</div>
    <div class="ach-progress"><div class="ach-progress-bar" style="width:${pct}%"></div></div>
    <div class="ach-progress-label">${Math.min(c.progress, c.target).toLocaleString()} / ${c.target.toLocaleString()}</div>
    <div class="daily-reward">報酬: 🪙${c.reward}コイン</div>
    <button id="btn-claim-daily" class="btn btn-primary" ${c.claimed || !done ? "disabled" : ""}>
      ${c.claimed ? "受け取り済み" : done ? "受け取る" : "挑戦中…"}
    </button>
  `;
  const claimBtn = document.getElementById("btn-claim-daily");
  if (claimBtn) {
    claimBtn.addEventListener("click", () => {
      if (claimDailyChallenge()) {
        renderDailyChallengePanel();
      }
    });
  }
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

// --- 一時停止 ---
function showPausePanel() {
  document.getElementById("pause-panel").classList.add("visible");
}
function hidePausePanel() {
  document.getElementById("pause-panel").classList.remove("visible");
}
function renderPauseButton() {
  const btn = document.getElementById("btn-pause");
  if (!btn) return;
  btn.textContent = isPaused ? "▶️ 再開する" : "⏸️ 一時停止";
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
  renderPauseButton();

  document.getElementById("btn-restart").addEventListener("click", () => startNewGame());
  document.getElementById("btn-gameover-restart").addEventListener("click", () => startNewGame());
  document.getElementById("btn-pause").addEventListener("click", () => togglePause());
  document.getElementById("btn-pause-resume").addEventListener("click", () => togglePause());

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
  document.getElementById("btn-daily").addEventListener("click", () => {
    renderDailyChallengePanel();
    openModal("modal-daily");
  });

  document.getElementById("btn-versus").addEventListener("click", () => {
    if (!sb) {
      showToast("マルチプレイ機能を読み込めませんでした");
      return;
    }
    showVersusLobbyMenu();
    openModal("modal-versus-lobby");
  });
  document.getElementById("btn-versus-create-private").addEventListener("click", async () => {
    const name = document.getElementById("versus-room-name-private").value;
    const code = await vsCreateRoom(false, name);
    if (code) showVersusLobbyWaiting(code);
  });
  document.getElementById("btn-versus-create-public").addEventListener("click", async () => {
    const name = document.getElementById("versus-room-name-public").value;
    const code = await vsCreateRoom(true, name);
    if (code) showVersusLobbyWaiting(code);
  });
  document.getElementById("btn-versus-refresh-public").addEventListener("click", () => {
    renderPublicRoomList();
  });
  document.getElementById("btn-versus-join").addEventListener("click", async () => {
    const input = document.getElementById("versus-code-input");
    const ok = await vsJoinRoom(input.value);
    if (ok) {
      document.getElementById("versus-waiting-text").textContent = "対戦相手を待っています…";
      showVersusLobbyWaiting(input.value.trim().toUpperCase());
      document.getElementById("versus-waiting-text").textContent = "まもなく開始します…";
    }
  });
  document.getElementById("btn-versus-cancel").addEventListener("click", () => {
    vsCancelRoom();
    closeModal("modal-versus-lobby");
  });
  document.getElementById("btn-versus-rematch").addEventListener("click", () => {
    closeModal("modal-versus-result");
    vsLeaveMatch();
    startNewGame();
    showVersusLobbyMenu();
    openModal("modal-versus-lobby");
  });
  document.getElementById("btn-versus-leave").addEventListener("click", () => {
    closeModal("modal-versus-result");
    vsLeaveMatch();
    startNewGame();
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
    btn.addEventListener("click", (e) => {
      const id = btn.getAttribute("data-close-modal");
      if (id === "modal-versus-lobby") vsStopPublicListPolling();
      closeModal(id);
    });
  });
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    if (overlay.id === "modal-resume" || overlay.id === "modal-loginbonus") return; // 選択必須ダイアログは外側クリックで閉じない
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        if (overlay.id === "modal-versus-lobby") vsStopPublicListPolling();
        overlay.classList.remove("visible");
      }
    });
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabGroup = btn.closest(".modal-panel");
      tabGroup.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      tabGroup.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "tab-versus-public") {
        vsStartPublicListPolling();
      } else if (btn.dataset.tab === "tab-versus-private") {
        vsStopPublicListPolling();
      }
    });
  });

  // 前回の続きがあれば再開ダイアログ、無ければ新規ゲーム開始
  function proceedToResumeOrStart() {
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
  }

  // まずログインボーナスを判定・表示してから、再開/新規ゲームの流れに入る
  const bonus = checkLoginBonus();
  renderHud();
  if (bonus) {
    document.getElementById("loginbonus-info").textContent = `${bonus.streak}日連続ログイン！ 🪙+${bonus.reward}コインを獲得しました。`;
    openModal("modal-loginbonus");
    document.getElementById("btn-loginbonus-ok").addEventListener("click", () => {
      closeModal("modal-loginbonus");
      renderHud();
      proceedToResumeOrStart();
    });
  } else {
    proceedToResumeOrStart();
  }
});
