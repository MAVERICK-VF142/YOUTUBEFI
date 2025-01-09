// Player controls for play/pause button, progress bar, and volume slider
let audio = document.getElementById('audio-player');
let playPauseBtn = document.getElementById('playPauseBtn');
let progressContainer = document.getElementById('progressContainer');
let progress = document.getElementById('progress');
let volumeSlider = document.getElementById('volumeSlider');
let songTitle = document.getElementById('song-title');
let songThumbnail = document.getElementById('song-thumbnail');

// Play/Pause button functionality
playPauseBtn.addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';  // Change to Pause icon
    } else {
        audio.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';  // Change to Play icon
    }
});

// Update progress bar as the audio plays
audio.addEventListener('timeupdate', () => {
    let progressPercent = (audio.currentTime / audio.duration) * 100;
    progress.style.width = `${progressPercent}%`;
});

// Allow user to click on the progress bar to skip to that position
progressContainer.addEventListener('click', (e) => {
    const offsetX = e.offsetX;
    const width = progressContainer.offsetWidth;
    const newTime = (offsetX / width) * audio.duration;
    audio.currentTime = newTime;
});

// Update volume based on the slider
volumeSlider.addEventListener('input', () => {
    audio.volume = volumeSlider.value / 100;
});

// Play audio and display song info (title, thumbnail)
function playAudio(videoId) {
    fetch(`/play?video_id=${videoId}`)
        .then(response => response.json())
        .then(data => {
            const audioUrl = data.audio_url;
            const title = data.title;
            const thumbnailUrl = data.thumbnail_url;

            // Set audio source and play
            audio.src = audioUrl;
            audio.play();

            // Update song title and thumbnail
            songTitle.textContent = title;
            songThumbnail.src = thumbnailUrl;

            // Update play button to show pause icon
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        })
        .catch(error => console.error('Error:', error));
}

// Download audio based on videoId
function downloadAudio(videoId) {
    fetch(`/download?video_id=${videoId}`)
        .then(response => response.json())
        .then(data => {
            const downloadUrl = data.download_url;
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = ""; // Optional: Specify a filename
            a.click();
        })
        .catch(error => console.error('Error:', error));
}

// Search functionality (YouTube API)
document.getElementById('search-button').addEventListener('click', () => {
    const query = document.getElementById('search-bar').value;
    if (!query) {
        alert("Please enter a search term!");
        return;
    }

    fetch(`/search?query=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = '';

            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'result-item';

                const titleSpan = document.createElement('span');
                titleSpan.textContent = item.title;

                const playButton = document.createElement('button');
                playButton.innerHTML = '<i class="fas fa-play"></i>';
                playButton.onclick = () => playAudio(item.video_id);

                const downloadButton = document.createElement('button');
                downloadButton.innerHTML = '<i class="fas fa-download"></i>';
                downloadButton.onclick = () => downloadAudio(item.video_id);

                const thumbnailImg = document.createElement('img');
                thumbnailImg.src = item.thumbnail_url;
                thumbnailImg.alt = "Cover Image";
                thumbnailImg.className = "thumbnail";

                div.appendChild(thumbnailImg);
                div.appendChild(titleSpan);
                div.appendChild(playButton);
                div.appendChild(downloadButton);

                resultsDiv.appendChild(div);
            });
        })
        .catch(error => console.error('Error:', error));
});
