const socket = io("https://watch-together-backend-edll.onrender.com"); // 🔥 replace this

let roomId = "";
const video = document.getElementById("video");

// 🎯 Join Room
function joinRoom() {
  roomId = document.getElementById("roomInput").value;
  if (!roomId) return alert("Enter Room ID");
  socket.emit("join-room", roomId);
}

// 🎬 Load Video
document.getElementById("fileInput").addEventListener("change", function () {
  const file = this.files[0];
  const url = URL.createObjectURL(file);
  video.src = url;
});

// 🔁 Sync Events
video.onplay = () => {
  socket.emit("play", { roomId, time: video.currentTime });
};

video.onpause = () => {
  socket.emit("pause", roomId);
};

video.onseeked = () => {
  socket.emit("seek", { roomId, time: video.currentTime });
};

// 🔁 Receive Sync
socket.on("play", (time) => {
  video.currentTime = time;
  video.play();
  updateSyncStatus(true);
});

socket.on("pause", () => {
  video.pause();
});

socket.on("seek", (time) => {
  video.currentTime = time;
});

// 💬 Send Message
function sendMessage() {
  const input = document.getElementById("messageInput");
  const msg = input.value;

  if (msg.trim() === "") return;

  socket.emit("chat-message", { roomId, message: msg });

  addMessage(msg, true);

  input.value = "";
  input.focus();
}

// 💬 Receive Message
socket.on("chat-message", (msg) => {
  addMessage(msg, false);
});

// 💬 Add Message UI
function addMessage(msg, isYou) {
  const chat = document.getElementById("chat");

  const div = document.createElement("div");

  div.className = `
    p-2 rounded-xl max-w-[70%] text-sm
    ${isYou ? "bg-pink-500 ml-auto" : "bg-gray-700"}
  `;

  div.textContent = msg;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// ⌨️ Enter to send
document.getElementById("messageInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// 🔄 Sync Status
function updateSyncStatus(isSynced) {
  const status = document.getElementById("syncStatus");

  if (isSynced) {
    status.textContent = "In Sync ✅";
    status.classList.remove("text-red-400");
    status.classList.add("text-green-400");
  } else {
    status.textContent = "Out of Sync ❌";
    status.classList.remove("text-green-400");
    status.classList.add("text-red-400");
  }
}
