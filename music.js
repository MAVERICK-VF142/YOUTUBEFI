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
const apiKey = "AIzaSyDIsC4hA1Q86RIs27-53u7yA66yfhkOEKI";

let currentIndex = 0;
let currentPlaylist = [];
let isPlaying = false;

// Auth check
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    currentUser = user;
    loadPlaylist();
  }
});

// --- PLAYBACK FUNCTIONS ---
function play(videoId, index = null) {
  const player = document.getElementById('ytFrame');
  player.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
  isPlaying = true;

  if (index !== null) {
    currentIndex = index;
    updateStickyBar(currentPlaylist[currentIndex]);
    updateFullScreenPlayer(currentPlaylist[currentIndex]);
  }
  updatePlayPauseButtons();
}

function togglePlayback() {
  const player = document.getElementById('ytFrame');
  const src = player.src;

  if (isPlaying) {
    player.src = src.replace("autoplay=1", "autoplay=0");
    isPlaying = false;
  } else {
    player.src = src.replace("autoplay=0", "autoplay=1");
    isPlaying = true;
  }

  updatePlayPauseButtons();
}

function playNext() {
  if (currentIndex < currentPlaylist.length - 1) {
    currentIndex++;
    const video = currentPlaylist[currentIndex];
    play(video.videoId, currentIndex);
  }
}

function playPrevious() {
  if (currentIndex > 0) {
    currentIndex--;
    const video = currentPlaylist[currentIndex];
    play(video.videoId, currentIndex);
  }
}

function updatePlayPauseButtons() {
  const icon = document.getElementById("fsPlayIcon");
  if (icon) icon.textContent = isPlaying ? "⏸" : "▶";
}

// --- STICKY BAR ---
function updateStickyBar(video) {
  const bar = document.getElementById("stickyBar");
  if (!bar) return;
  bar.style.display = "flex";
  document.getElementById("stickyThumb").src = video.thumbnail;
  document.getElementById("stickyTitle").textContent = video.title;
}

// --- FULLSCREEN PLAYER ---
function updateFullScreenPlayer(video) {
  document.getElementById("fsThumb").src = video.thumbnail;
  document.getElementById("fsTitle").textContent = video.title;
  document.getElementById("fsChannel").textContent = video.channel;
}

function collapsePlayer() {
  document.getElementById('fullScreenPlayer').style.display = 'none';
}

// --- SWIPE CONTROLS ---
let touchStartX = 0;

document.getElementById('fsSwipeArea').addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
});

document.getElementById('fsSwipeArea').addEventListener('touchend', (e) => {
  const touchEndX = e.changedTouches[0].clientX;
  const deltaX = touchEndX - touchStartX;

  if (deltaX > 50) playPrevious();
  else if (deltaX < -50) playNext();
});

// --- SEARCH ---
async function searchYouTube() {
  const query = document.getElementById('searchInput').value;
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=10&type=video`;

  const res = await fetch(url);
  const data = await res.json();
  renderResults(data.items);
}

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
      <div class="card-subtitle">${video.channel}</div>
      <button class="btn" onclick='addToPlaylist(${JSON.stringify(video)})'>➕</button>
    `;
    card.addEventListener('click', () => {
      const index = currentPlaylist.findIndex(v => v.videoId === video.videoId);
      play(video.videoId, index);
    });
    resultsDiv.appendChild(card);
  });
}

// --- PLAYLIST ---
async function loadPlaylist() {
  const container = document.getElementById('playlist');
  container.innerHTML = '';

  const doc = await db.collection("users").doc(currentUser.uid).get();
  if (!doc.exists) return;

  currentPlaylist = doc.data().playlist || [];

  currentPlaylist.forEach((video, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${video.thumbnail}" alt="Thumbnail" />
      <div class="card-title">${video.title}</div>
      <div class="card-subtitle">${video.channel}</div>
      <button class="btn" onclick='removeFromPlaylist("${video.videoId}")'>❌</button>
    `;
    card.addEventListener('click', () => play(video.videoId, index));
    container.appendChild(card);
  });

  if (currentPlaylist.length > 0) {
    updateStickyBar(currentPlaylist[0]);
  }
}

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

async function removeFromPlaylist(videoId) {
  const userRef = db.collection("users").doc(currentUser.uid);
  const doc = await userRef.get();
  let playlist = doc.exists ? doc.data().playlist || [] : [];

  playlist = playlist.filter(video => video.videoId !== videoId);
  await userRef.set({ playlist });
  loadPlaylist();
}
