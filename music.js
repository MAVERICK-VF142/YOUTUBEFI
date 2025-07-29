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
let player;

// Check Auth State
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    currentUser = user;
    loadPlaylist();
  }
});

// Load YouTube IFrame API
let tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
document.body.appendChild(tag);

function onYouTubeIframeAPIReady() {
  player = new YT.Player('ytFrameContainer', {
    height: '220',
    width: '100%',
    videoId: '',
    playerVars: { autoplay: 1 },
    events: {
      onReady: () => {},
      onStateChange: onPlayerStateChange
    }
  });
}

function onPlayerStateChange(event) {
  const playIcon = document.getElementById('barPlayIcon');
  if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    playIcon.textContent = '▶';
  } else if (event.data === YT.PlayerState.PLAYING) {
    playIcon.textContent = '⏸';
  }
}

function play(videoId) {
  const index = currentPlaylist.findIndex(v => v.videoId === videoId);
  if (index !== -1) {
    currentIndex = index;
  }

  if (player && player.loadVideoById) {
    player.loadVideoById(videoId);
    document.getElementById('barPlayIcon').textContent = '⏸';
    document.getElementById('stickyBar').style.display = 'flex';
    updateStickyBar(currentPlaylist[currentIndex]);
  }
}

function togglePlayback() {
  if (!player || typeof player.getPlayerState !== 'function') return;
  const state = player.getPlayerState();
  const playIcon = document.getElementById('barPlayIcon');

  if (state === YT.PlayerState.PLAYING) {
    player.pauseVideo();
    playIcon.textContent = '▶';
  } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
    player.playVideo();
    playIcon.textContent = '⏸';
  }
}

function playNext() {
  if (currentIndex < currentPlaylist.length - 1) {
    currentIndex++;
    const video = currentPlaylist[currentIndex];
    play(video.videoId);
  }
}

function playPrevious() {
  if (currentIndex > 0) {
    currentIndex--;
    const video = currentPlaylist[currentIndex];
    play(video.videoId);
  }
}

function updateStickyBar(video) {
  if (!video) return;
  document.getElementById('barThumb').src = video.thumbnail;
  document.getElementById('barTitle').textContent = video.title;
  document.getElementById('barChannel').textContent = video.channel;
}

// Add video to playlist
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

// Remove video from playlist
async function removeFromPlaylist(videoId) {
  const userRef = db.collection("users").doc(currentUser.uid);
  const doc = await userRef.get();
  let playlist = doc.exists ? doc.data().playlist || [] : [];

  playlist = playlist.filter(video => video.videoId !== videoId);
  await userRef.set({ playlist });
  loadPlaylist();
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

  const videos = items.map(item => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails.medium.url
  }));

  currentPlaylist = videos;

  videos.forEach(video => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${video.thumbnail}" alt="Thumbnail" />
      <div class="card-title">${video.title}</div>
      <div class="card-subtitle">${video.channel}</div>
      <button class="btn" onclick='play("${video.videoId}")'>▶</button>
      <button class="btn" onclick='addToPlaylist(${JSON.stringify(video)})'>➕</button>
    `;
    resultsDiv.appendChild(card);
  });
}

// Render playlist
async function loadPlaylist() {
  const container = document.getElementById('playlist');
  container.innerHTML = '';

  const doc = await db.collection("users").doc(currentUser.uid).get();
  if (!doc.exists) return;

  const playlist = doc.data().playlist || [];
  currentPlaylist = playlist;

  playlist.forEach(video => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${video.thumbnail}" alt="Thumbnail" />
      <div class="card-title">${video.title}</div>
      <div class="card-subtitle">${video.channel}</div>
      <button class="btn" onclick='play("${video.videoId}")'>▶</button>
      <button class="btn" onclick='removeFromPlaylist("${video.videoId}")'>❌</button>
    `;
    container.appendChild(card);
  });

  document.getElementById('stickyBar').addEventListener('click', openFullPlayer);

function openFullPlayer() {
  document.getElementById('fullPlayer').style.display = 'flex';
  const currentVideo = currentPlaylist[currentIndex];
  if (currentVideo) {
    document.getElementById('fullThumb').src = currentVideo.thumbnail;
    document.getElementById('fullTitle').textContent = currentVideo.title;
    document.getElementById('fullChannel').textContent = currentVideo.channel;
  }
}

function collapseFullPlayer() {
  document.getElementById('fullPlayer').style.display = 'none';
}

let touchStartX = 0;

const swipeArea = document.getElementById('swipeArea');

swipeArea.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
});

swipeArea.addEventListener('touchend', e => {
  const touchEndX = e.changedTouches[0].screenX;
  const diff = touchStartX - touchEndX;

  if (diff > 50) {
    // Swipe Left
    playNext();
    updateFullPlayer();
  } else if (diff < -50) {
    // Swipe Right
    playPrevious();
    updateFullPlayer();
  }
});

function updateFullPlayer() {
  const currentVideo = currentPlaylist[currentIndex];
  if (currentVideo) {
    document.getElementById('fullThumb').src = currentVideo.thumbnail;
    document.getElementById('fullTitle').textContent = currentVideo.title;
    document.getElementById('fullChannel').textContent = currentVideo.channel;
  }
}

}
