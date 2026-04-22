const socket = io("https://watch-together-backend-edll.onrender.com");

let roomId = "";
const video = document.getElementById("video");

function joinRoom() {
  roomId = document.getElementById("roomInput").value;
  socket.emit("join-room", roomId);
}

document.getElementById("fileInput").addEventListener("change", function () {
  const file = this.files[0];
  const url = URL.createObjectURL(file);
  video.src = url;
});

video.onplay = () => {
  socket.emit("play", { roomId, time: video.currentTime });
};

video.onpause = () => {
  socket.emit("pause", roomId);
};

video.onseeked = () => {
  socket.emit("seek", { roomId, time: video.currentTime });
};

socket.on("play", (time) => {
  video.currentTime = time;
  video.play();
});

socket.on("pause", () => {
  video.pause();
});

socket.on("seek", (time) => {
  video.currentTime = time;
});

// Chat
function sendMessage() {
  const input = document.getElementById("messageInput");
  const msg = input.value;

  if (msg.trim() === "") return; // prevent empty messages

  socket.emit("chat-message", { roomId, message: msg });

  addMessage("You: " + msg);

  input.value = ""; // 🔥 clears the box
}

socket.on("chat-message", (msg) => {
  addMessage("Partner: " + msg);
});

function addMessage(msg) {
  const li = document.createElement("li");
  li.textContent = msg;
  document.getElementById("chat").appendChild(li);
}
