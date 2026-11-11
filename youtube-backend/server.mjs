import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ytdlp from 'yt-dlp-exec';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

const app = express();
app.disable('x-powered-by');
app.use(express.json({limit:'12kb'}));
const origins=(process.env.ALLOWED_ORIGINS||'https://aslns.online,http://localhost:5173').split(',').map(x=>x.trim());
app.use(cors({origin:(origin,cb)=>cb(null,!origin||origins.includes(origin)),methods:['GET','POST']}));
const PORT=Number(process.env.PORT||8080);
const BASE=(process.env.MEDIA_PROVIDER_BASE_URL||'').replace(/\/$/,'');
const KEY=process.env.MEDIA_PROVIDER_API_KEY||'';
const TIMEOUT=Number(process.env.PROVIDER_TIMEOUT_MS||30000);
const MAX_BYTES=Number(process.env.MAX_DOWNLOAD_BYTES||524288000);
const requests=new Map();
function validateYouTube(value){
  if(typeof value!=='string'||value.length>2048)throw Object.assign(new Error('Invalid YouTube URL'),{status:400});
  let u;try{u=new URL(value)}catch{throw Object.assign(new Error('Invalid YouTube URL'),{status:400})}
  if(u.protocol!=='https:'||!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtu.be'].includes(u.hostname))throw Object.assign(new Error('Only HTTPS YouTube URLs are accepted'),{status:400});
  const id=u.hostname.includes('youtu.be')?u.pathname.split('/')[1]:u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|live)\/([^/]+)/)?.[1];
  if(!/^[\w-]{11}$/.test(id||''))throw Object.assign(new Error('Invalid video ID'),{status:400});
  return `https://www.youtube.com/watch?v=${id}`;
}
function configured(){if(!BASE)throw Object.assign(new Error('Media provider not configured: set MEDIA_PROVIDER_BASE_URL'),{status:503});const u=new URL(BASE);if(u.protocol!=='https:')throw Object.assign(new Error('Provider must use HTTPS'),{status:503});return u;}
function providerPath(name){const p=process.env[name];if(!p||!p.startsWith('/')||p.startsWith('//'))throw Object.assign(new Error(`Configure ${name} for your provider`),{status:503});return p;}
async function providerPost(path,body){const base=configured();const target=new URL(path,base);if(target.origin!==base.origin)throw new Error('Invalid provider endpoint');const response=await fetch(target,{method:'POST',headers:{'content-type':'application/json',...(KEY?{'authorization':`Bearer ${KEY}`}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(TIMEOUT),redirect:'error'});if(!response.ok)throw Object.assign(new Error(`Provider returned HTTP ${response.status}`),{status:502});return response;}
function normalizeInfo(raw){
 const info=raw?.data||raw;const candidates=Array.isArray(info?.formats)?info.formats:[...(info?.video||[]),...(info?.audio||[])];
 const formats=candidates.filter(f=>f&&((f.type==='video')||(f.type==='audio')||f.quality==='audio')).map(f=>{const audio=f.type==='audio'||f.quality==='audio';const quality=audio?'audio':String(f.quality||f.resolution||'');if(!audio&&!/^\d{2,4}p$/.test(quality))return null;return {id:audio?'audio':quality,label:audio?'Audio · M4A':`${quality} · MP4`,ext:audio?'m4a':'mp4',resolution:quality,size:typeof f.size==='number'?f.size:null};}).filter(Boolean);
 const unique=[...new Map(formats.map(f=>[f.id,f])).values()];if(!unique.length)throw Object.assign(new Error('Provider did not return usable formats'),{status:502});
 return {title:String(info.title||'YouTube video'),thumbnail:String(info.thumbnail||''),duration:Number.isFinite(Number(info.duration))?Number(info.duration):null,uploader:String(info.uploader||info.channel?.name||''),formats:unique};
}
const errorHandler = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    const message = String(error.message || '');

    const blocked = /sign in to confirm you're not a bot/i.test(message);

    console.error(
      'Media request failed:',
      blocked ? 'YouTube access restricted' : message
    );

    if (!res.headersSent) {
      res.status(blocked ? 503 : (error.status || 502)).json({
        detail: blocked
          ? 'YouTube is temporarily restricting requests from this server. Please try again later.'
          : error.status && error.status < 500
            ? message
            : 'Unable to process this video right now.'
      });
    } else {
      res.destroy();
    }
  }
};
app.get('/health',(req,res)=>res.json({ok:true,providerConfigured:!!BASE}));
app.post('/api/video/info', errorHandler(async (req, res) => {
  const url = validateYouTube(req.body?.url);

  const info = await ytdlp(url, {
    dumpSingleJson: true,
    skipDownload: true,
    noPlaylist: true,
    noWarnings: true,
  });

  const heights = [...new Set(
    (info.formats || [])
      .filter(f => f.vcodec && f.vcodec !== 'none' && f.height)
      .map(f => f.height)
  )].sort((a, b) => a - b);

  const formats = [
    ...heights.map(height => ({
      id: `${height}p`,
      label: `${height}p · MP4`,
      ext: 'mp4',
      resolution: `${height}p`,
      size: null,
    })),
    {
      id: 'audio',
      label: 'Audio · M4A',
      ext: 'm4a',
      resolution: 'audio',
      size: null,
    },
  ];

  res.json({
    title: info.title || 'YouTube video',
    thumbnail: info.thumbnail || '',
    duration: info.duration ?? null,
    uploader: info.uploader || info.channel || '',
    formats,
  });
}));

app.post('/api/video/download', errorHandler(async (req, res) => {
  const url = validateYouTube(req.body?.url);
  const format = req.body?.format_id;

  if (typeof format !== 'string' ||
      !/^(?:\d{2,4}p|audio)$/.test(format)) {
    throw Object.assign(new Error('Invalid format'), { status: 400 });
  }

  // Each request gets its own temporary directory.
  const workDir = await mkdtemp(path.join(tmpdir(), 'aslns-'));
  const output = path.join(workDir, 'media.%(ext)s');

  try {
    const isAudio = format === 'audio';

    const options = {
      output,
      noPlaylist: true,
      noWarnings: true,
      noProgress: true,
      maxFilesize: MAX_BYTES,
      socketTimeout: 30,
    };

    if (isAudio) {
      options.format = 'bestaudio[ext=m4a]/bestaudio';
      options.extractAudio = true;
      options.audioFormat = 'm4a';
    } else {
      const height = Number.parseInt(format, 10);

      if (height < 144 || height > 4320) {
        throw Object.assign(new Error('Unsupported quality'), {
          status: 400,
        });
      }

      options.format =
        `bestvideo[height<=${height}]+bestaudio/` +
        `best[height<=${height}]`;

      options.mergeOutputFormat = 'mp4';
      options.recodeVideo = 'mp4';
    }

    // Download and process the requested media.
    await ytdlp(url, options);

    const files = await readdir(workDir);
    const extension = isAudio ? '.m4a' : '.mp4';

    const filename = files.find(file =>
      file.toLowerCase().endsWith(extension)
    );

    if (!filename) {
      throw Object.assign(
        new Error('The requested media format was not produced'),
        { status: 502 }
      );
    }

    const filePath = path.join(workDir, filename);
    const fileInfo = await stat(filePath);

    if (fileInfo.size > MAX_BYTES) {
      throw Object.assign(new Error('File exceeds size limit'), {
        status: 413,
      });
    }

    res.setHeader(
      'Content-Type',
      isAudio ? 'audio/mp4' : 'video/mp4'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="aslns-${randomUUID()}${extension}"`
    );

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', fileInfo.size);

    // Send the file and wait until the transfer completes.
    await new Promise((resolve, reject) => {
      res.download(filePath, undefined, err => {
        if (err) reject(err);
        else resolve();
      });
    });

  } finally {
    // Delete temporary files after success or failure.
    await rm(workDir, { recursive: true, force: true });
  }
}));

app.listen(PORT,()=>console.log(`ASLNS media adapter listening on ${PORT}`));
