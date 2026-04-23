const socket = io("https://watch-together-backend-edll.onrender.com");
let ytReady = false;

function onYouTubeIframeAPIReady() {
  ytReady = true;
}
let roomId = "";
const video = document.getElementById("video");

// 🎥 WebRTC
let peer;
let myStream;

// 🎬 YouTube
let player;
let isYouTube = false;

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
  isYouTube = false;
});

// SYNC LOCAL VIDEO
video.onplay = () => {
  if (!isYouTube) socket.emit("play", { roomId, time: video.currentTime });
};
video.onpause = () => {
  if (!isYouTube) socket.emit("pause", roomId);
};
video.onseeked = () => {
  if (!isYouTube) socket.emit("seek", { roomId, time: video.currentTime });
};

socket.on("play", (time) => {
  if (!isYouTube) {
    video.currentTime = time;
    video.play();
  }
});
socket.on("pause", () => !isYouTube && video.pause());
socket.on("seek", (time) => !isYouTube && (video.currentTime = time));

// 💬 CHAT
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

// 🎥 VIDEO CALL (FIXED)
async function startVideoCall() {
  peer = new Peer();

  myStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  document.getElementById("myVideo").srcObject = myStream;

  peer.on("open", (id) => {
    socket.emit("peer-id", { roomId, peerId: id });
  });

  socket.on("all-peer-ids", (peerIds) => {
    peerIds.forEach((id) => {
      if (id === peer.id) return;

      const call = peer.call(id, myStream);

      call.on("stream", (stream) => {
        const vid = document.getElementById("partnerVideo");
        vid.srcObject = stream;
        vid.play().catch(() => {});
      });
    });
  });

  peer.on("call", (call) => {
    call.answer(myStream);

    call.on("stream", (stream) => {
      const vid = document.getElementById("partnerVideo");
      vid.srcObject = stream;
      vid.play().catch(() => {});
    });
  });
}

// 🎤 CONTROLS
function toggleMic() {
  const track = myStream.getAudioTracks()[0];
  track.enabled = !track.enabled;
}

function toggleCamera() {
  const track = myStream.getVideoTracks()[0];
  track.enabled = !track.enabled;
}

// 🎬 YOUTUBE FEATURE
function extractVideoId(url) {
  const regExp = /(?:youtube\.com\/.*v=|youtu\.be\/)([^&]+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

function loadYouTube() {
  if (!ytReady) {
    alert("YouTube not ready yet, try again in 2 sec");
    return;
  }
  document.getElementById("fileInput").style.display = "none";
  const url = document.getElementById("youtubeLink").value;
  const videoId = extractVideoId(url);

  if (!videoId) return alert("Invalid link");

  isYouTube = true;

  // 🔥 HIDE LOCAL VIDEO
  document.getElementById("video").style.display = "none";

  // 🔥 SHOW YOUTUBE PLAYER
  document.getElementById("youtubePlayer").style.display = "block";

  createPlayer(videoId);

  socket.emit("youtube-load", { roomId, videoId });
}

function createPlayer(videoId) {
  if (player) player.destroy();

  player = new YT.Player("youtubePlayer", {
    videoId: videoId,
    events: {
      onStateChange: (event) => {
        const time = player.getCurrentTime();

        if (event.data === YT.PlayerState.PLAYING) {
          socket.emit("youtube-play", { roomId, time });
        }

        if (event.data === YT.PlayerState.PAUSED) {
          socket.emit("youtube-pause", roomId);
        }
      },
    },
  });
}

socket.on("youtube-load", (videoId) => {
  isYouTube = true;
  createPlayer(videoId);
});

socket.on("youtube-play", (time) => {
  player.seekTo(time);
  player.playVideo();
});

socket.on("youtube-pause", () => {
  player.pauseVideo();
});
