// ===== CH 管理（1〜10） =====
let currentChannel = 1;
const roomInput = document.getElementById("room-id");
const screenCh = document.getElementById("screen-ch");
const screenStatus = document.getElementById("screen-status");

// チャンネル → ルームID 反映
function applyChannel() {
  const chStr = String(currentChannel).padStart(2, "0");
  roomInput.value = "ch" + chStr;   // 例: ch01, ch02…
  screenCh.textContent = chStr;
}

applyChannel(); // 初期は CH01

// CH ボタンイベント
document.getElementById("ch-up").onclick = () => {
  currentChannel++;
  if (currentChannel > 10) currentChannel = 1;
  applyChannel();
};

document.getElementById("ch-down").onclick = () => {
  currentChannel--;
  if (currentChannel < 1) currentChannel = 10;
  applyChannel();
};

// 画面下部の STATUS も更新したいとき用
function setStatus(msg) {
  console.log("[STATUS]", msg);
  screenStatus.textContent = msg;
}
