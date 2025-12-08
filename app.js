// ===============================
// Firebase 設定（ここだけあればOK）
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyAZUO2DGeY48yk3EY4Fx3OYYCsLfcR7XqQ",
  authDomain: "web-phone-73c14.firebaseapp.com",
  databaseURL: "https://web-phone-73c14-default-rtdb.firebaseio.com",
  projectId: "web-phone-73c14",
  storageBucket: "web-phone-73c14.firebasestorage.app",
  messagingSenderId: "517151603146",
  appId: "1:517151603146:web:c9624b2ca0b6e1e0a53733",
  measurementId: "G-1E4JLHS3DP"
};

// Firebase 初期化（v8 用）
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ===============================
// 変数
// ===============================
let localStream = null;
let remoteStream = null;
let pc = null;
let roomRef = null;

const servers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// ===============================
// UI 要素
// ===============================
const startBtn = document.getElementById("start-btn");
const createBtn = document.getElementById("create-btn");
const joinBtn = document.getElementById("join-btn");
const hangupBtn = document.getElementById("hangup-btn");
const roomInput = document.getElementById("room-id");
const statusEl = document.getElementById("status");

// ===============================
// ステータス表示
// ===============================
function setStatus(msg) {
  statusEl.textContent = "ステータス: " + msg;
  console.log("[STATUS]", msg);
}

// ===============================
// マイク ON
// ===============================
startBtn.onclick = async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setStatus("マイク取得 OK");

    createBtn.disabled = false;
    joinBtn.disabled = false;
    startBtn.disabled = true;
  } catch (e) {
    alert("マイクが使えません：" + e);
    setStatus("マイク取得失敗");
  }
};

// ===============================
// PeerConnection 作成
// ===============================
function createPeer() {
  pc = new RTCPeerConnection(servers);

  remoteStream = new MediaStream();

  pc.ontrack = (event) => {
    remoteStream.addTrack(event.track);
    // 音声を再生
    const audio = new Audio();
    audio.srcObject = remoteStream;
    audio.play();
  };

  // ローカル音声追加
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
}

// ===============================
// ルーム作成（ホスト）
// ===============================
createBtn.onclick = async () => {
  const roomId = roomInput.value.trim();
  if (!roomId) return alert("ルームIDを入力してね");

  startBtn.disabled = true;
  createBtn.disabled = true;
  joinBtn.disabled = true;

  setStatus("ルーム作成中…");

  createPeer();

  roomRef = database.ref("rooms/" + roomId);
  await roomRef.remove();

  const callerCandidates = roomRef.child("callerCandidates");
  pc.onicecandidate = (e) => {
    if (e.candidate) callerCandidates.push(e.candidate.toJSON());
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await roomRef.child("offer").set(offer);

  setStatus("ルーム作成完了。相手を待っています…");

  roomRef.child("answer").on("value", async (snapshot) => {
    const answer = snapshot.val();
    if (!answer || pc.currentRemoteDescription) return;

    await pc.setRemoteDescription(new RTCSessionDescription(answer));
    setStatus("相手が参加しました！");
  });

  roomRef.child("calleeCandidates").on("child_added", (snapshot) => {
    const candidate = new RTCIceCandidate(snapshot.val());
    pc.addIceCandidate(candidate);
  });

  hangupBtn.disabled = false;
};

// ===============================
// ルーム参加（ゲスト）
// ===============================
joinBtn.onclick = async () => {
  const roomId = roomInput.value.trim();
  if (!roomId) return alert("ルームIDを入力してね");

  startBtn.disabled = true;
  createBtn.disabled = true;
  joinBtn.disabled = true;

  setStatus("参加中…");

  createPeer();

  roomRef = database.ref("rooms/" + roomId);
  const snapshot = await roomRef.once("value");
  const data = snapshot.val();

  if (!data || !data.offer) {
    setStatus("ルームが存在しません");
    createBtn.disabled = false;
    joinBtn.disabled = false;
    return;
  }

  const offer = data.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  await roomRef.child("answer").set(answer);

  roomRef.child("callerCandidates").on("child_added", (snapshot) => {
    const candidate = new RTCIceCandidate(snapshot.val());
    pc.addIceCandidate(candidate);
  });

  setStatus("接続完了！通話できます");

  hangupBtn.disabled = false;
};

// ===============================
// 切断
// ===============================
hangupBtn.onclick = async () => {
  if (pc) pc.close();
  pc = null;

  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
  }

  if (roomRef) {
    await roomRef.remove();
  }

  setStatus("切断しました");

  startBtn.disabled = false;
  createBtn.disabled = false;
  joinBtn.disabled = false;
  hangupBtn.disabled = true;
};
