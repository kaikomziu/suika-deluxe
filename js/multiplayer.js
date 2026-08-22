// ==========================================================================
// multiplayer.js - リアルタイム1vs1対戦(Supabase Realtimeを使用)
// ==========================================================================

const SUPABASE_URL = "https://jnbohzqmpnknlapjmabq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYm9oenFtcG5rbmxhcGptYWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNTEyNTYsImV4cCI6MjEwMjkyNzI1Nn0.g6QVyHg4MovL7D4s0JDtElctblhsB9_KeXg-MD6Djcs";

const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// --- 対戦状態 ---
let vsRoomCode = null;
let vsRoomName = null;
let vsRole = null; // 'host' | 'guest'
let vsChannel = null;
let vsActive = false; // 実際に対戦中か
let vsCountdownStarted = false;
let vsMatchEnding = false;
let vsResultShown = false;
let vsTargetScore = 10000;
let vsOpponentState = { score: 0, maxTier: -1, alive: true, connected: true };
let vsLastPush = 0;
let vsOpponentLastSeen = 0;
let vsDisconnectCheckTimer = null;

const VS_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 紛らわしい文字(0/O,1/I)を除外

function vsGenerateRoomCode() {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += VS_CODE_CHARS[Math.floor(Math.random() * VS_CODE_CHARS.length)];
  }
  return code;
}

function vsCurrentMaxTier() {
  const bodies = Composite.allBodies(world).filter((b) => b.label === "fruit");
  return bodies.reduce((m, b) => Math.max(m, b.plugin.tier), -1);
}

function vsMyStateSnapshot() {
  return { score, maxTier: vsCurrentMaxTier(), alive: !isGameOver, connected: true };
}

// --- ルーム作成/参加 ---
async function vsCreateRoom(isPublic, roomName) {
  if (!sb) return null;
  const code = vsGenerateRoomCode();
  const name = (roomName || "").trim().slice(0, 20) || null;
  const { error } = await sb
    .from("versus_rooms")
    .insert({ code, status: "waiting", target_score: vsTargetScore, is_public: !!isPublic, room_name: name });
  if (error) {
    showToast("ルーム作成に失敗しました");
    console.warn(error);
    return null;
  }
  vsRole = "host";
  vsRoomCode = code;
  vsRoomName = name;
  vsSubscribeRoom(code);
  return code;
}

// --- パブリックルーム一覧(直近10分・募集中のみ) ---
async function vsListPublicRooms() {
  if (!sb) return [];
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from("versus_rooms")
    .select("code, room_name, created_at")
    .eq("is_public", true)
    .eq("status", "waiting")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    console.warn(error);
    return [];
  }
  return data || [];
}

async function vsJoinRoom(rawCode) {
  if (!sb) return false;
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) return false;
  const { data, error } = await sb.from("versus_rooms").select("*").eq("code", code).maybeSingle();
  if (error || !data) {
    showToast("ルームが見つかりません");
    return false;
  }
  if (data.status !== "waiting") {
    showToast("このルームは開始済みか終了しています");
    return false;
  }
  vsRole = "guest";
  vsRoomCode = code;
  vsRoomName = data.room_name || null;
  vsTargetScore = data.target_score || 10000;
  vsSubscribeRoom(code); // 先に購読してから状態を書き込む(host/guest 双方が同じイベントで開始できるように)
  const { error: updErr } = await sb
    .from("versus_rooms")
    .update({
      guest_state: { score: 0, maxTier: -1, alive: true, connected: true },
      guest_updated_at: new Date().toISOString(),
      status: "playing",
    })
    .eq("code", code)
    .eq("status", "waiting");
  if (updErr) {
    showToast("参加に失敗しました");
    return false;
  }
  return true;
}

function vsSubscribeRoom(code) {
  if (vsChannel && sb) sb.removeChannel(vsChannel);
  vsChannel = sb
    .channel("room-" + code)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "versus_rooms", filter: `code=eq.${code}` },
      (payload) => vsHandleRoomUpdate(payload.new)
    )
    .subscribe();
}

function vsHandleRoomUpdate(row) {
  if (!row || row.code !== vsRoomCode) return;

  if (row.status === "playing" && !vsCountdownStarted) {
    vsTargetScore = row.target_score || vsTargetScore;
    vsStartCountdown();
  }

  if (vsActive) {
    const oppState = vsRole === "host" ? row.guest_state : row.host_state;
    if (oppState) {
      vsOpponentState = oppState;
      vsOpponentLastSeen = Date.now();
    }
    if (typeof renderVersusPanel === "function") renderVersusPanel();
    vsCheckWinConditions();
  }

  if (row.status === "finished" && !vsResultShown) {
    vsHandleFinished(row.winner);
  }
}

// --- 状態送信(スロットル付き、メインループから毎フレーム呼ばれる) ---
function vsPushState(force) {
  if (!vsActive || !vsRoomCode || !sb) return;
  const now = Date.now();
  if (!force && now - vsLastPush < 700) return;
  vsLastPush = now;
  const myState = vsMyStateSnapshot();
  const field =
    vsRole === "host"
      ? { host_state: myState, host_updated_at: new Date().toISOString() }
      : { guest_state: myState, guest_updated_at: new Date().toISOString() };
  sb.from("versus_rooms").update(field).eq("code", vsRoomCode).then(() => {}, () => {});
}

// --- 勝敗判定 ---
function vsCheckWinConditions() {
  if (!vsActive || vsMatchEnding) return;
  const myAlive = !isGameOver;
  const oppAlive = vsOpponentState.alive;
  let winner = null;
  if (score >= vsTargetScore) winner = vsRole;
  else if (vsOpponentState.score >= vsTargetScore) winner = vsRole === "host" ? "guest" : "host";
  else if (!myAlive && oppAlive) winner = vsRole === "host" ? "guest" : "host";
  else if (myAlive && !oppAlive) winner = vsRole;
  else if (!myAlive && !oppAlive) winner = "draw";
  if (winner) vsFinalizeMatch(winner);
}

async function vsFinalizeMatch(winner) {
  if (vsMatchEnding) return;
  vsMatchEnding = true;
  vsPushState(true);
  if (sb && vsRoomCode) {
    await sb.from("versus_rooms").update({ status: "finished", winner }).eq("code", vsRoomCode).eq("status", "playing");
  }
  vsHandleFinished(winner);
}

function vsHandleFinished(winner) {
  if (vsResultShown) return;
  vsResultShown = true;
  vsActive = false;
  if (vsDisconnectCheckTimer) {
    clearInterval(vsDisconnectCheckTimer);
    vsDisconnectCheckTimer = null;
  }

  stats.versusPlayed = (stats.versusPlayed || 0) + 1;
  const iWon = winner === vsRole;
  const isDraw = winner === "draw";
  if (iWon) {
    stats.versusWins = (stats.versusWins || 0) + 1;
    stats.versusWinStreak = (stats.versusWinStreak || 0) + 1;
    stats.versusBestWinStreak = Math.max(stats.versusBestWinStreak || 0, stats.versusWinStreak);
  } else if (!isDraw) {
    stats.versusWinStreak = 0;
  }
  evaluateAchievements();
  saveStats(stats);

  if (typeof showVersusResult === "function") {
    showVersusResult(isDraw ? "draw" : iWon ? "win" : "lose", score, vsOpponentState.score);
  }
}

// --- 切断検知(15秒間相手の更新がなければ相手切断扱いで勝利) ---
function vsStartDisconnectWatch() {
  if (vsDisconnectCheckTimer) clearInterval(vsDisconnectCheckTimer);
  vsOpponentLastSeen = Date.now();
  vsDisconnectCheckTimer = setInterval(() => {
    if (!vsActive || vsMatchEnding) return;
    if (Date.now() - vsOpponentLastSeen > 15000) {
      vsFinalizeMatch(vsRole); // 相手切断 → 自分の勝ち
    }
  }, 3000);
}

// --- カウントダウン ---
function vsStartCountdown() {
  if (vsCountdownStarted) return;
  vsCountdownStarted = true;
  if (typeof closeModal === "function") closeModal("modal-versus-lobby");
  if (typeof showVersusCountdown === "function") {
    showVersusCountdown(() => {
      vsMatchEnding = false;
      vsResultShown = false;
      startNewGame();
      vsActive = true;
      vsStartDisconnectWatch();
      if (typeof renderVersusPanel === "function") renderVersusPanel();
      if (typeof setVersusPanelVisible === "function") setVersusPanelVisible(true);
    });
  }
}

// --- ロビー待機中のキャンセル(部屋がまだ始まっていなければ削除) ---
async function vsCancelRoom() {
  if (sb && vsRoomCode && vsRole === "host" && !vsCountdownStarted) {
    try {
      await sb.from("versus_rooms").delete().eq("code", vsRoomCode).eq("status", "waiting");
    } catch (e) {
      /* ignore */
    }
  }
  vsLeaveMatch();
}

// --- 対戦を抜ける ---
function vsLeaveMatch() {
  vsActive = false;
  vsRoomCode = null;
  vsRoomName = null;
  vsRole = null;
  vsCountdownStarted = false;
  vsMatchEnding = false;
  vsResultShown = false;
  if (vsChannel && sb) {
    sb.removeChannel(vsChannel);
    vsChannel = null;
  }
  if (vsDisconnectCheckTimer) {
    clearInterval(vsDisconnectCheckTimer);
    vsDisconnectCheckTimer = null;
  }
  if (typeof setVersusPanelVisible === "function") setVersusPanelVisible(false);
}
