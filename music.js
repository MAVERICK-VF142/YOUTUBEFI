// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAEqwcUIstQqCb-MlLxkPlr-0ZNvhwwxoM",
  authDomain: "youtify-805db.firebaseapp.com",
  projectId: "youtify-805db",
  storageBucket: "youtify-805db.appspot.com",
  messagingSenderId: "703435050654",
  appId: "1:703435050654:web:d97572b99fd5fa9f5af58f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
const apiKey = "AIzaSyDIsC4hA1Q86RIs27-53u7yA66yfhkOEKI";
let currentPlaylist = [];
let currentIndex = -1;
let isPlaying = false;

auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    currentUser = user;
    loadPlaylist();
  }
});

// Play video by index
function playAtIndex(index) {
  if (index >= 0 && index < currentPlaylist.length) {
    const video = currentPlaylist[index];
    const player = document.getElementById('ytFrame');
    player.src = `https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1`;
    currentIndex = index;
    isPlaying = true;
    updateStickyPlayer();
  }
}

function play(videoId) {
  const index = currentPlaylist.findIndex(v => v.videoId === videoId);
  if (index !== -1) {
    playAtIndex(index);
  } else {
    const player = document.getElementById('ytFrame');
    player.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
    isPlaying = true;
  }
}

function playNext() {
  if (currentIndex < currentPlaylist.length - 1) {
    playAtIndex(currentIndex + 1);
  }
}

function playPrevious() {
  if (currentIndex > 0) {
    playAtIndex(currentIndex - 1);
  }
}

function togglePlayPause() {
  const iframe = document.getElementById('ytFrame');
  const src = iframe.src;

  if (!src) return;

  if (isPlaying) {
    iframe.src = src.replace("autoplay=1", "autoplay=0");
    isPlaying = false;
  } else {
    iframe.src = src.replace("autoplay=0", "autoplay=1");
    isPlaying = true;
  }

  updateStickyPlayer();
}

function updateStickyPlayer() {
  const bar = document.getElementById('stickyBar');
  const title = document.getElementById('barTitle');
  const img = document.getElementById('barThumb');
  const btn = document.getElementById('barPlayPause');

  const video = currentPlaylist[currentIndex];
  if (video) {
    title.textContent = video.title;
    img.src = video.thumbnail;
    btn.textContent = isPlaying ? "⏸" : "▶";
    bar.style.display = "flex";
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
      <div class="card-channel">${video.channel}</div>
      <button class="btn" onclick='play("${video.videoId}")'>▶ Play</button>
      <button class="btn" onclick='addToPlaylist(${JSON.stringify(video)})'>➕ Add</button>
    `;
    resultsDiv.appendChild(card);
  });
}

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
      <div class="card-channel">${video.channel}</div>
      <button class="btn" onclick='playAtIndex(${index})'>▶ Play</button>
      <button class="btn" onclick='removeFromPlaylist("${video.videoId}")'>❌ Remove</button>
    `;
    container.appendChild(card);
  });
}

// Sticky Bar Click to Full Player
document.getElementById('stickyBar').addEventListener('click', openFullPlayer);

function openFullPlayer() {
  document.getElementById('fullPlayer').style.display = 'flex';
  updateFullPlayer();
}

function collapseFullPlayer() {
  document.getElementById('fullPlayer').style.display = 'none';
}

function updateFullPlayer() {
  const currentVideo = currentPlaylist[currentIndex];
  if (currentVideo) {
    document.getElementById('fullThumb').src = currentVideo.thumbnail;
    document.getElementById('fullTitle').textContent = currentVideo.title;
    document.getElementById('fullChannel').textContent = currentVideo.channel;
  }
}

// Swipe Controls
let touchStartX = 0;

const swipeArea = document.getElementById('swipeArea');
swipeArea.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
});

swipeArea.addEventListener('touchend', e => {
  const touchEndX = e.changedTouches[0].screenX;
  const diff = touchStartX - touchEndX;

  if (diff > 50) {
    playNext();
    updateFullPlayer();
  } else if (diff < -50) {
    playPrevious();
    updateFullPlayer();
  }
});
