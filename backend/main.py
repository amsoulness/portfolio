"""ASLNS video backend. Use only for videos you have rights to download."""
import asyncio
import os
import re
import shutil
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import yt_dlp
from fastapi import FastAPI, HTTPException
from fastapi.background import BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI(title='ASLNS Media API')
allowed_origins = [
    "http://localhost:5173",
    "https://aslns.online",
    "https://www.aslns.online",
    "https://probable-space-telegram-4jv5x7q47vrg2jjwr-5173.app.github.dev",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

MAX_BYTES = 500 * 1024 * 1024
SEMAPHORE = asyncio.Semaphore(2)

class VideoRequest(BaseModel):
    url: str

class DownloadRequest(VideoRequest):
    format_id: str

def validate_url(url: str) -> str:
    try:
        parsed = urlparse(url.strip())
        host = (parsed.hostname or '').lower()
        if parsed.scheme != 'https' or host not in {'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'}:
            raise ValueError()
        if not re.search(r'(?:[?&]v=|youtu\.be/|/shorts/|/live/)[\w-]{11}', url):
            raise ValueError()
        return url.strip()
    except ValueError:
        raise HTTPException(400, 'Enter a valid HTTPS YouTube video URL.')

def opts():
    return {
        'quiet': True,
        'no_warnings': False,
        'noplaylist': True,
        'skip_download': True,
        'socket_timeout': 15,
        'retries': 1,
        'extractor_retries': 1,
        'ignoreerrors': False,
        'js_runtimes': {'node': {}},
    }

def extract(url):
    with yt_dlp.YoutubeDL(opts()) as ydl:
        return ydl.extract_info(url, download=False)

def get_formats(data):
    formats = []
    seen = set()
    for f in data.get('formats') or []:
        if not f.get('vcodec') or f.get('vcodec') == 'none':
            continue
        height = f.get('height')
        if not height or height > 4320:
            continue
        ext = f.get('ext', 'mp4')
        key = (height, ext)
        if key in seen:
            continue
        seen.add(key)
        # Download the best video stream up to the selected resolution, plus best audio.
        # Do not trust arbitrary format IDs from the client.
        fmt_id = f'{height}:{ext}'
        formats.append({'id': fmt_id, 'label': f'{height}p · {ext.upper()} (video + audio)', 'ext': 'mp4', 'resolution': f'{height}p'})
    return sorted(formats, key=lambda x: int(x['id'].split(':')[0]), reverse=True)

@app.get('/health')
def health():
    return {'ok': True}

@app.post('/api/video/info')
async def info(request: VideoRequest):
    url = validate_url(request.url)
    try:
        data = await asyncio.wait_for(asyncio.to_thread(extract, url), timeout=40)
        if not data or data.get('is_live'):
            raise HTTPException(400, 'Live or unavailable videos are not supported.')
        formats = get_formats(data)
        if not formats:
            raise HTTPException(400, 'No downloadable video formats were found.')
        return {'title': data.get('title', 'YouTube video'), 'thumbnail': data.get('thumbnail', ''), 'duration': data.get('duration'), 'uploader': data.get('uploader', ''), 'formats': formats}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, 'Could not retrieve formats. The video may be restricted or unavailable.')

def make_download(url, selector, destination):
    options = opts()
    options.update({'skip_download': False, 'format': selector, 'outtmpl': str(destination / 'video.%(ext)s'), 'merge_output_format': 'mp4', 'noprogress': True, 'max_filesize': MAX_BYTES, 'postprocessor_args': {'ffmpeg': ['-movflags', '+faststart']}})
    with yt_dlp.YoutubeDL(options) as ydl:
        ydl.download([url])
    files = [p for p in destination.iterdir() if p.is_file() and p.suffix in {'.mp4', '.webm', '.mkv'}]
    if not files:
        raise RuntimeError('No completed video file was produced.')
    file = max(files, key=lambda p: p.stat().st_size)
    if file.stat().st_size > MAX_BYTES:
        raise RuntimeError('Video exceeds the server size limit (500 MB).')
    return file

@app.post('/api/video/download')
async def download(request: DownloadRequest, background: BackgroundTasks):
    url = validate_url(request.url)
    match = re.fullmatch(r'(144|240|360|480|720|1080|1440|2160|4320):(mp4|webm)', request.format_id)
    if not match:
        raise HTTPException(400, 'Invalid quality selection.')
    height, ext = match.groups()
    # Match the chosen resolution and container where available, then merge best audio.
    selector = f'bestvideo[height={height}][ext={ext}]+bestaudio/best[height={height}][ext={ext}]'
    folder = Path(tempfile.mkdtemp(prefix='aslns-media-'))
    try:
        async with SEMAPHORE:
            file = await asyncio.wait_for(asyncio.to_thread(make_download, url, selector, folder), timeout=240)
        background.add_task(shutil.rmtree, folder, ignore_errors=True)
        return FileResponse(file, media_type='video/mp4' if file.suffix == '.mp4' else 'application/octet-stream', filename=f'aslns-video{file.suffix}', background=background)
    except asyncio.TimeoutError:
        raise HTTPException(504, 'Download timed out. Try a smaller quality.')
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            422,
            'This video or quality could not be downloaded.'
        ) from e
    finally:
        # Successful downloads are removed after FileResponse finishes sending.
        if not any(folder.glob('video.*')):
            shutil.rmtree(folder, ignore_errors=True)