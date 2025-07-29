// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAEqwcUIstQqCb-MlLxkPlr-0ZNvhwwxoM",
  authDomain: "youtify-805db.firebaseapp.com",
  projectId: "youtify-805db",
  storageBucket: "youtify-805db.appspot.com",
  messagingSenderId: "703435050654",
  appId: "1:703435050654:web:d97572b99fd5fa9f5af58f"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let player;
let currentPlaylist = [];
let currentIndex = -1;
let isPlaying = true;

const apiKey = "AIzaSyDIsC4hA1Q86RIs27-53u7yA66yfhkOEKI";

auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    currentUser = user;
    loadPlaylist();
  }
});

// YouTube Player API
function onYouTubeIframeAPIReady() {
  player = new YT.Player('ytFrameContainer', {
    height: '0',
    width: '0',
    videoId: '',
    events: {
      'onReady': () => {},
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.ENDED) {
    playNext();
  }
}

function play(videoId, meta = null) {
  if (player && player.loadVideoById) {
    player.loadVideoById(videoId);
    isPlaying = true;
    document.getElementById('barPlayIcon').textContent = "⏸";
  }
  if (meta) updateStickyBar(meta);
}

function pauseVideo() {
  if (player) {
    player.pauseVideo();
    isPlaying = false;
    document.getElementById('barPlayIcon').textContent = "▶";
  }
}

function resumeVideo() {
  if (player) {
    player.playVideo();
    isPlaying = true;
    document.getElementById('barPlayIcon').textContent = "⏸";
  }
}

function togglePlayback() {
  if (isPlaying) {
    pauseVideo();
  } else {
    resumeVideo();
  }
}

function playByIndex(index) {
  if (index >= 0 && index < currentPlaylist.length) {
    const video = currentPlaylist[index];
    currentIndex = index;
    play(video.videoId, video);
  }
}

function playNext() {
  if (currentIndex < currentPlaylist.length - 1) {
    playByIndex(currentIndex + 1);
  }
}

function playPrev() {
  if (currentIndex > 0) {
    playByIndex(currentIndex - 1);
  }
}

function updateStickyBar(video) {
  document.getElementById("barThumb").src = video.thumbnail;
  document.getElementById("barTitle").textContent = video.title;
  document.getElementById("barChannel").textContent = video.channel;
}

// Add to playlist
async function addToPlaylist(video) {
  const userRef = db.collection("users").doc(currentUser.uid);
  const doc = await userRef.get();
  let playlist = doc.exists ? doc.data().playlist || [] : [];

  if (!playlist.find(item => item.videoId === video.videoId)) {
    playlist.push(video);
    await userRef.set({ playlist });
    loadPlaylist();
  }
}

// Remove from playlist
async function removeFromPlaylist(videoId) {
  const userRef = db.collection("users").doc(currentUser.uid);
  const doc = await userRef.get();
  let playlist = doc.exists ? doc.data().playlist || [] : [];

  playlist = playlist.filter(video => video.videoId !== videoId);
  await userRef.set({ playlist });
  loadPlaylist();
}

// Search
async function searchYouTube() {
  const query = document.getElementById('searchInput').value;
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=10&type=video`;

  const res = await fetch(url);
  const data = await res.json();
  renderResults(data.items);
}

// Render search results
function renderResults(items) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  items.forEach(item => {
    const video = {
      videoId: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url
    };

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${video.thumbnail}" alt="Thumbnail" />
      <div class="card-title">${video.title}</div>
      <div class="card-channel">${video.channel}</div>
      <button class="btn" onclick='play("${video.videoId}", ${JSON.stringify(video)})'>▶ Play</button>
      <button class="btn" onclick='addToPlaylist(${JSON.stringify(video)})'>➕ Add to Playlist</button>
    `;
    resultsDiv.appendChild(card);
  });
}

// Render and load playlist
async function loadPlaylist() {
  const container = document.getElementById('playlist');
  container.innerHTML = '';

  const doc = await db.collection("users").doc(currentUser.uid).get();
  if (!doc.exists) return;

  currentPlaylist = doc.data().playlist || [];

  currentPlaylist.forEach((video, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${video.thumbnail}" alt="Thumbnail" />
      <div class="card-title">${video.title}</div>
      <div class="card-channel">${video.channel}</div>
      <button class="btn" onclick='playByIndex(${idx})'>▶ Play</button>
      <button class="btn" onclick='removeFromPlaylist("${video.videoId}")'>❌ Remove</button>
    `;
    container.appendChild(card);
  });
}
