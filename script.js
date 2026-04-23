const socket = io("https://watch-together-backend-edll.onrender.com");

let roomId = "";
const video = document.getElementById("video");

// 🎥 WebRTC
let peer;
let myStream;

// JOIN
function joinRoom() {
  roomId = document.getElementById("roomInput").value;
  if (!roomId) return alert("Enter Room ID");

  socket.emit("join-room", roomId);
  startVideoCall();
}

// VIDEO LOAD
document.getElementById("fileInput").addEventListener("change", function () {
  const file = this.files[0];
  video.src = URL.createObjectURL(file);
});

// SYNC
video.onplay = () => socket.emit("play", { roomId, time: video.currentTime });
video.onpause = () => socket.emit("pause", roomId);
video.onseeked = () => socket.emit("seek", { roomId, time: video.currentTime });

socket.on("play", (time) => {
  video.currentTime = time;
  video.play();
});
socket.on("pause", () => video.pause());
socket.on("seek", (time) => video.currentTime = time);

// CHAT
function sendMessage() {
  const input = document.getElementById("messageInput");
  const msg = input.value;

  if (!msg.trim()) return;

  socket.emit("chat-message", { roomId, message: msg });
  addMessage(msg, true);

  input.value = "";
}

socket.on("chat-message", (msg) => addMessage(msg, false));

function addMessage(msg, isYou) {
  const chat = document.getElementById("chat");

  const div = document.createElement("div");
  div.className = `p-2 rounded-xl max-w-[70%] ${isYou ? "bg-pink-500 ml-auto" : "bg-gray-700"}`;
  div.textContent = msg;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

document.getElementById("messageInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// 🎥 VIDEO CALL
async function startVideoCall() {
  peer = new Peer();

  myStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });

  document.getElementById("myVideo").srcObject = myStream;

  peer.on("open", (id) => {
    socket.emit("peer-id", { roomId, peerId: id });
  });

  // ✅ CALL EVERYONE
socket.on("all-peer-ids", (peerIds) => {
  peerIds.forEach((id) => {
    if (id === peer.id) return;

    console.log("Calling peer:", id);

    const call = peer.call(id, myStream);

    call.on("stream", (stream) => {
      console.log("Received stream");
      document.getElementById("partnerVideo").srcObject = stream;
    });

    call.on("error", (err) => {
      console.log("Call error:", err);
    });
  });
});

  // ✅ RECEIVE CALL
  peer.on("call", (call) => {
    call.answer(myStream);

    call.on("stream", (stream) => {
      document.getElementById("partnerVideo").srcObject = stream;
    });
  });
}
// CONTROLS
function toggleMic() {
  const track = myStream.getAudioTracks()[0];
  track.enabled = !track.enabled;
}

function toggleCamera() {
  const track = myStream.getVideoTracks()[0];
  track.enabled = !track.enabled;
}
