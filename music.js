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
let playlist = [];
let currentIndex = -1;
let player;

const apiKey = "AIzaSyDIsC4hA1Q86RIs27-53u7yA66yfhkOEKI";

// Auth State
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
    height: '220',
    width: '100%',
    videoId: '',
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      rel: 0
    },
    events: {
      onStateChange: handlePlayerStateChange
    }
  });
}

function handlePlayerStateChange(event) {
  const icon = document.getElementById('barPlayIcon');
  if (!icon) return;

  if (event.data === YT.PlayerState.PLAYING) {
    icon.textContent = '⏸';
  } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    icon.textContent = '▶';

    if (event.data === YT.PlayerState.ENDED) {
      playNext(); // auto play next on end
    }
  }
}

// Play video by ID
function play(videoId, index = null) {
  if (player && player.loadVideoById) {
    player.loadVideoById(videoId);
  }

  if (index !== null) {
    currentIndex = index;
    updateBarUI();
  }
}

// Toggle play/pause
function togglePlayback() {
  if (!player || typeof player.getPlayerState !== 'function') return;

  const state = player.getPlayerState();
  const icon = document.getElementById('barPlayIcon');

  if (state === YT.PlayerState.PLAYING) {
    player.pauseVideo();
    icon.textContent = '▶';
  } else {
    player.playVideo();
    icon.textContent = '⏸';
  }
}

// Next/Previous
function playNext() {
  if (currentIndex + 1 < playlist.length) {
    currentIndex++;
    play(playlist[currentIndex].videoId, currentIndex);
  }
}

function playPrevious() {
  if (currentIndex > 0) {
    currentIndex--;
    play(playlist[currentIndex].videoId, currentIndex);
  }
}

// Update sticky bar
function updateBarUI() {
  if (currentIndex < 0 || currentIndex >= playlist.length) return;

  const video = playlist[currentIndex];
  document.getElementById('barTitle').textContent = video.title;
  document.getElementById('barChannel').textContent = video.channel;
  document.getElementById('barThumb').src = video.thumbnail;
}

// Add to playlist
async function addToPlaylist(video) {
  const userRef = db.collection("users").doc(currentUser.uid);
  const doc = await userRef.get();
  let userPlaylist = doc.exists ? doc.data().playlist || [] : [];

  if (!userPlaylist.find(item => item.videoId === video.videoId)) {
    userPlaylist.push(video);
    await userRef.set({ playlist: userPlaylist });
    loadPlaylist();
  }
}

// Remove from playlist
async function removeFromPlaylist(videoId) {
  const userRef = db.collection("users").doc(currentUser.uid);
  const doc = await userRef.get();
  let userPlaylist = doc.exists ? doc.data().playlist || [] : [];

  userPlaylist = userPlaylist.filter(video => video.videoId !== videoId);
  await userRef.set({ playlist: userPlaylist });
  loadPlaylist();
}

// Load playlist and render
async function loadPlaylist() {
  const container = document.getElementById('playlist');
  container.innerHTML = '';

  const doc = await db.collection("users").doc(currentUser.uid).get();
  if (!doc.exists) return;

  playlist = doc.data().playlist || [];
  playlist.forEach((video, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${video.thumbnail}" alt="Thumbnail" />
      <div class="card-title">${video.title}</div>
      <div class="card-channel">${video.channel}</div>
      <button class="btn" onclick='play("${video.videoId}", ${index})'>▶ Play</button>
      <button class="btn" onclick='removeFromPlaylist("${video.videoId}")'>❌ Remove</button>
    `;
    container.appendChild(card);
  });
}

// Search YouTube
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
      <button class="btn" onclick='play("${video.videoId}")'>▶ Play</button>
      <button class="btn" onclick='addToPlaylist(${JSON.stringify(video)})'>➕ Add to Playlist</button>
    `;
    resultsDiv.appendChild(card);
  });
}

// Load YouTube API
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(tag);
