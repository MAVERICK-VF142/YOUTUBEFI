from flask import Flask, request, jsonify, render_template
import yt_dlp
from googleapiclient.discovery import build
import os
import urllib.request

app = Flask(__name__)

# Replace with your YouTube API key
YOUTUBE_API_KEY = "AIzaSyDIsC4hA1Q86RIs27-53u7yA66yfhkOEKI"

# YouTube Search Function
def search_youtube(query):
    youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
    search_response = youtube.search().list(
        q=query,
        part="id,snippet",
        maxResults=10,
        type="video"
    ).execute()

    results = []
    for item in search_response['items']:
        video_id = item['id']['videoId']
        title = item['snippet']['title']
        thumbnail_url = item['snippet']['thumbnails']['high']['url']  # Get the high-quality thumbnail
        results.append({"title": title, "video_id": video_id, "thumbnail_url": thumbnail_url})
    return results

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('query', '')
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400

    results = search_youtube(query)
    return jsonify(results)

@app.route('/play', methods=['GET'])
def play():
    video_id = request.args.get('video_id', '')
    if not video_id:
        return jsonify({"error": "Video ID is required"}), 400

    video_url = f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info_dict = ydl.extract_info(video_url, download=False)
        audio_url = info_dict['url']
    return jsonify({"audio_url": audio_url})

@app.route('/download', methods=['GET'])
def download():
    video_id = request.args.get('video_id', '')
    if not video_id:
        return jsonify({"error": "Video ID is required"}), 400

    video_url = f"https://www.youtube.com/watch?v={video_id}"
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'outtmpl': f'static/{video_id}.mp3',  # Save audio to the static folder with the video ID as the filename
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info_dict = ydl.extract_info(video_url, download=True)

        # Extract the title for file naming and thumbnail for the cover image
        title = info_dict.get('title', video_id)
        thumbnail_url = info_dict.get('thumbnail', '')

        # Save the thumbnail image to static folder
        if thumbnail_url:
            thumbnail_path = f'static/{video_id}.jpg'
            urllib.request.urlretrieve(thumbnail_url, thumbnail_path)
        else:
            thumbnail_path = ''

        # Rename the audio file to the title name
        os.rename(f'static/{video_id}.mp3', f'static/{title}.mp3')

    return jsonify({"download_url": f"/static/{title}.mp3", "thumbnail_url": f"/static/{video_id}.jpg"})

if __name__ == '__main__':
    app.run(debug=True)
