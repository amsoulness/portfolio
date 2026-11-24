import { useMemo, useState } from 'react'
import { AlertTriangle, Download, ExternalLink, Film, LoaderCircle, Search, ShieldCheck, Trash2 } from 'lucide-react'

type Video = { id: string; media_type: string; media_url?: string; thumbnail_url?: string; permalink?: string; caption?: string; timestamp?: string }
type ApiPayload = { data?: Video[]; paging?: { next?: string }; error?: { message?: string } }
type Inspection = { canonicalUrl: string; shortcode: string }
const GRAPH = 'https://graph.instagram.com/v27.0'
const FIELDS = 'id,media_type,media_url,thumbnail_url,permalink,timestamp,caption'

function safeNextPage(value?: string) {
  if (!value) return null
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'graph.instagram.com' ? url.toString() : null } catch { return null }
}

function inspectInstagramUrl(value: string): Inspection | null {
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.hostname.toLowerCase().replace(/^www\./, '') !== 'instagram.com') return null
    const match = url.pathname.match(/^\/(reel|reels|p|tv)\/([\w-]+)\/?$/i)
    return match ? { canonicalUrl: `https://www.instagram.com/${match[1]}/${match[2]}/`, shortcode: match[2] } : null
  } catch { return null }
}

export default function InstagramReelDownloader() {
  const [token, setToken] = useState('')
  const [videos, setVideos] = useState<Video[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('')
  const [url, setUrl] = useState('')
  const [inspection, setInspection] = useState<Inspection | null>(null)

  const visibleVideos = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return videos.filter(item => !q || `${item.caption || ''} ${item.permalink || ''} ${item.id}`.toLowerCase().includes(q))
  }, [videos, filter])

  async function loadVideos(pageUrl?: string) {
    if (!token.trim() || busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      let apiUrl: URL
      if (pageUrl) {
        const safe = safeNextPage(pageUrl)
        if (!safe) throw new Error('Meta returned an unexpected page link. Reload your videos and try again.')
        apiUrl = new URL(safe)
      } else {
        apiUrl = new URL(`${GRAPH}/me/media`)
        apiUrl.searchParams.set('fields', FIELDS)
        apiUrl.searchParams.set('limit', '50')
        apiUrl.searchParams.set('access_token', token.trim())
      }
      const response = await fetch(apiUrl, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(25000) })
      const payload = await response.json() as ApiPayload
      if (!response.ok || payload.error) throw new Error(payload.error?.message || 'Meta could not return your account media. Check the token and instagram_business_basic permission.')
      const items = (Array.isArray(payload.data) ? payload.data : []).filter(item => item.media_type === 'VIDEO' && typeof item.media_url === 'string' && /^https:\/\//i.test(item.media_url))
      setVideos(previous => pageUrl ? [...previous, ...items.filter(item => !previous.some(existing => existing.id === item.id))] : items)
      setNext(safeNextPage(payload.paging?.next))
      setNotice(items.length ? `${items.length} video${items.length === 1 ? '' : 's'} returned for your authorized account.` : 'No video media URLs were returned. Meta may withhold some media links.')
    } catch (cause) {
      setError(cause instanceof Error && cause.name === 'TimeoutError' ? 'Meta took too long to respond. Try again.' : cause instanceof Error ? cause.message : 'Could not load your videos.')
    } finally { setBusy(false) }
  }

  async function downloadVideo(video: Video, index: number) {
    if (!video.media_url) return
    setNotice('Preparing your video download…')
    try {
      const response = await fetch(video.media_url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(30000) })
      if (!response.ok) throw new Error('The video server did not allow a browser download.')
      const blob = await response.blob()
      if (!blob.size) throw new Error('The video file was empty.')
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `instagram-video-${index + 1}.mp4`
      document.body.appendChild(anchor); anchor.click(); anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
      setNotice('Download started. Check your browser downloads.')
    } catch {
      window.open(video.media_url, '_blank', 'noopener,noreferrer')
      setNotice('Opened the video from Meta. If it plays in a new tab, use the browser video menu to save it.')
    }
  }

  function runInspection() {
    const result = inspectInstagramUrl(url)
    setInspection(result)
    setError(result ? '' : 'For the source demo, paste a full Instagram Reel, post, or video URL.')
    setNotice('')
  }

  function clear() { setToken(''); setVideos([]); setNext(null); setError(''); setNotice(''); setFilter('') }

  return <section className="ig-tool" aria-label="Instagram video downloader and source inspector">
    <style>{`
      .ig-tool{--ig-ink:#f5f0ff;--ig-muted:#aaa2b8;--ig-line:rgba(190,166,235,.22);--ig-accent:#c2a4ff;color:var(--ig-ink);display:grid;gap:20px}
      .ig-tool *{box-sizing:border-box}.ig-card{min-width:0;padding:22px;border:1px solid var(--ig-line);border-radius:19px;background:rgba(12,10,22,.76);box-shadow:0 16px 36px rgba(0,0,0,.14)}.ig-tool h3{margin:0 0 8px;font-size:16px}.ig-tool p{color:var(--ig-muted);font-size:13px;line-height:1.7;margin:8px 0 0}.ig-lead{display:flex;align-items:flex-start;gap:13px}.ig-mark{flex:0 0 42px;width:42px;height:42px;border-radius:13px;display:grid;place-items:center;color:#f4e8ff;background:linear-gradient(145deg,#a342d5,#593ce0 58%,#f58d6d);box-shadow:0 7px 25px #893ee537}.ig-field{display:grid;gap:8px;margin-top:17px}.ig-field label{font-size:12px;font-weight:700;color:var(--ig-ink)}.ig-field input{min-width:0;width:100%;min-height:48px;padding:12px 14px;border:1px solid var(--ig-line);border-radius:12px;background:rgba(4,4,12,.55);color:var(--ig-ink);font:inherit;font-size:14px}.ig-field input:focus{outline:2px solid #a78bfa;outline-offset:2px}.ig-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.ig-button{min-height:44px;padding:10px 15px;border:1px solid var(--ig-line);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;gap:8px;background:rgba(167,139,250,.12);color:var(--ig-ink);font:inherit;font-size:12px;font-weight:750;text-decoration:none;cursor:pointer}.ig-button.primary{background:linear-gradient(110deg,#c3a5ff,#9d82ef);color:#1b1230;border:0}.ig-button:disabled{opacity:.55;cursor:not-allowed}.ig-spin{animation:igspin .8s linear infinite}@keyframes igspin{to{transform:rotate(360deg)}}.ig-note{display:flex;gap:10px;align-items:flex-start;padding:13px 14px;border-radius:12px;background:rgba(167,139,250,.08);color:var(--ig-muted);font-size:12px;line-height:1.65}.ig-note svg{flex:none;color:var(--ig-accent);margin-top:1px}.ig-status{font-size:12px;line-height:1.6}.ig-error{color:#ffb9c3}.ig-good{color:#b8efd1}.ig-results-head{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}.ig-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;margin-top:16px}.ig-video{overflow:hidden;border:1px solid var(--ig-line);border-radius:15px;background:rgba(255,255,255,.025)}.ig-thumb{width:100%;height:245px;display:grid;place-items:center;background:linear-gradient(145deg,#241835,#101321);overflow:hidden}.ig-thumb img{width:100%;height:100%;object-fit:cover}.ig-video-body{padding:14px}.ig-caption{margin:0!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:42px}.ig-meta{font-size:11px!important}.ig-help{color:var(--ig-accent);text-decoration:underline;text-underline-offset:3px}.ig-trace{display:grid;gap:10px;margin:17px 0;padding-left:25px;color:var(--ig-muted);font-size:13px;line-height:1.65}.ig-code{display:block;overflow-wrap:anywhere;padding:13px;border-radius:10px;background:rgba(4,4,12,.65);color:var(--ig-ink);font:12px/1.7 ui-monospace,Consolas,monospace}
      html[data-theme='light'] .ig-tool{--ig-ink:#251b35;--ig-muted:#665d74;--ig-line:rgba(91,66,132,.2);--ig-accent:#7043b8}html[data-theme='light'] .ig-card{background:rgba(255,255,255,.96);box-shadow:0 14px 38px rgba(59,39,91,.07)}html[data-theme='light'] .ig-field input{background:#fff}html[data-theme='light'] .ig-button{background:#f2ecfa;color:#392951;border-color:#d7c8eb}html[data-theme='light'] .ig-button.primary{background:linear-gradient(110deg,#c4a6f6,#a98add);color:#241432;border:0}html[data-theme='light'] .ig-note{background:#f5f0fb}html[data-theme='light'] .ig-video{background:#fff}html[data-theme='light'] .ig-thumb{background:linear-gradient(145deg,#e8dff3,#d9deea)}html[data-theme='light'] .ig-code{background:#f1edf6}
      @media(max-width:600px){.ig-card{padding:17px}.ig-grid{grid-template-columns:1fr}.ig-thumb{height:260px}.ig-actions .ig-button{flex:1}}@media(prefers-reduced-motion:reduce){.ig-spin{animation:none}}
    `}</style>

    <div className="ig-card">
      <div className="ig-lead"><span className="ig-mark"><Film size={22}/></span><div><h3>Download videos from your Instagram account</h3><p>Connect with a Meta-issued token to list videos owned by your professional account, then download one to your device.</p></div></div>
      <div className="ig-note" style={{marginTop:18}}><ShieldCheck size={17}/><span>This follows Meta’s supported account API. It does not fetch media from arbitrary public Reel links. Your token stays in this tab’s memory and is cleared when you press the clear button or leave the page.</span></div>
      <div className="ig-field"><label htmlFor="ig-access-token">Instagram User access token</label><input id="ig-access-token" type="password" autoComplete="off" spellCheck={false} value={token} onChange={event=>setToken(event.target.value)} placeholder="Paste your Meta-issued token"/></div>
      <div className="ig-actions"><button className="ig-button primary" type="button" onClick={()=>{void loadVideos()}} disabled={!token.trim()||busy}>{busy?<LoaderCircle size={16} className="ig-spin"/>:<Search size={16}/>}Load my videos</button><button className="ig-button" type="button" onClick={clear} disabled={busy}><Trash2 size={15}/>Clear token and videos</button><a className="ig-button" href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer"><ExternalLink size={15}/>Meta API Explorer</a><a className="ig-button" href="https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started/" target="_blank" rel="noreferrer"><ExternalLink size={15}/>Setup guide</a></div>
      <p className="ig-status ig-error" role="alert">{error}</p><p className="ig-status ig-good" role="status">{notice}</p>
    </div>

    {videos.length>0&&<div className="ig-card"><div className="ig-results-head"><div><h3>Your videos</h3><p>{visibleVideos.length} matching video{visibleVideos.length===1?'':'s'} returned by Meta</p></div><div className="ig-field" style={{marginTop:0,minWidth:200}}><label htmlFor="ig-video-filter">Filter your videos</label><input id="ig-video-filter" type="search" value={filter} onChange={event=>setFilter(event.target.value)} placeholder="Search caption or ID"/></div></div>
      {visibleVideos.length?<div className="ig-grid">{visibleVideos.map((video,index)=><article className="ig-video" key={video.id}><div className="ig-thumb">{video.thumbnail_url?<img src={video.thumbnail_url} loading="lazy" alt="Instagram video thumbnail"/>:<Film size={34} aria-hidden="true"/>}</div><div className="ig-video-body"><p className="ig-caption">{video.caption||'Your Instagram video'}</p><p className="ig-meta">{video.timestamp?new Date(video.timestamp).toLocaleDateString():''}</p><div className="ig-actions"><button className="ig-button primary" type="button" onClick={()=>{void downloadVideo(video,index)}}><Download size={15}/>Download video</button>{video.permalink&&<a className="ig-button" href={video.permalink} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Open on Instagram</a>}</div></div></article>)}</div>:<p>No matching videos. Clear your search to see the full list.</p>}
      {next&&<div className="ig-actions"><button className="ig-button" type="button" disabled={busy} onClick={()=>{void loadVideos(next)}}>{busy?<LoaderCircle size={16} className="ig-spin"/>:<Search size={15}/>}Load more videos</button></div>}
      <div className="ig-note" style={{marginTop:18}}><AlertTriangle size={17}/><span>If Instagram’s media server blocks a direct browser download, the button opens the video file so you can use your browser’s download/save option.</span></div>
    </div>}

    <div className="ig-card"><div className="ig-lead"><span className="ig-mark"><Search size={21}/></span><div><h3>Inspect the bot’s downloadGram flow</h3><p>This project demo validates a sample link locally and shows the call visible in the public source.</p></div></div>
      <div className="ig-field"><label htmlFor="ig-demo-url">Sample Instagram Reel / post URL</label><input id="ig-demo-url" type="url" inputMode="url" value={url} onChange={event=>{setUrl(event.target.value);setInspection(null);setError('')}} onKeyDown={event=>{if(event.key==='Enter')runInspection()}} placeholder="https://www.instagram.com/reel/..."/></div>
      <div className="ig-actions"><button className="ig-button" type="button" onClick={runInspection}><Search size={16}/>Inspect example</button><a className="ig-button" href="https://github.com/souravkl11/raganork-md/blob/main/plugins/utils/misc.js" target="_blank" rel="noreferrer"><ExternalLink size={15}/>misc.js source</a><a className="ig-button" href="https://github.com/souravkl11/raganork-md/blob/main/core/private.js" target="_blank" rel="noreferrer"><ExternalLink size={15}/>private.js source</a></div>
      {inspection&&<><p className="ig-status ig-good" role="status">Valid URL: {inspection.canonicalUrl} · shortcode {inspection.shortcode} · checked locally; no request sent to the bot service.</p><ol className="ig-trace"><li>The public helper exports <code>const downloadGram = (url) =&gt; priv.instagram(url);</code></li><li>The call passes the supplied link into <code>priv.instagram(url)</code>.</li><li>The repo says <code>core/private.js</code> is intentionally obfuscated and contains private endpoints and API keys, so its service destination and checks cannot be verified from the public source.</li></ol></>}
      <div className="ig-note"><AlertTriangle size={17}/><span>The inspector does not call the hidden third-party service. For an official review, the bot operator can show its backend logs and authorization controls.</span></div>
    </div>
  </section>
}
