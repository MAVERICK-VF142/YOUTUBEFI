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
  
  // Check Auth State
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      currentUser = user;
      loadPlaylist();
    }
  });
  
  // Play selected video
  function play(videoId) {
    const player = document.getElementById('ytFrame');
    player.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`;
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
  
  // Render playlist
  async function loadPlaylist() {
    const container = document.getElementById('playlist');
    container.innerHTML = '';
  
    const doc = await db.collection("users").doc(currentUser.uid).get();
    if (!doc.exists) return;
  
    const playlist = doc.data().playlist || [];
    playlist.forEach(video => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${video.thumbnail}" alt="Thumbnail" />
        <div class="card-title">${video.title}</div>
        <div class="card-channel">${video.channel}</div>
        <button class="btn" onclick='play("${video.videoId}")'>▶ Play</button>
        <button class="btn" onclick='removeFromPlaylist("${video.videoId}")'>❌ Remove</button>
      `;
      container.appendChild(card);
    });
  }
  