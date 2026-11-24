import { useMemo, useState } from 'react'
import { Download, ExternalLink, Film, LoaderCircle, LockKeyhole, RotateCcw, Search, ShieldCheck, Trash2 } from 'lucide-react'

type Reel = { id: string; media_type: string; media_url?: string; thumbnail_url?: string; permalink?: string; caption?: string; timestamp?: string }
type ApiPayload = { data?: Reel[]; paging?: { next?: string }; error?: { message?: string } }
const GRAPH = 'https://graph.instagram.com/v27.0'
const FIELDS = 'id,media_type,media_url,thumbnail_url,permalink,timestamp'

function safeNextPage(value: string | undefined) {
  if (!value) return null
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'graph.instagram.com' ? url.toString() : null } catch { return null }
}

export default function InstagramReelDownloader() {
  const [token, setToken] = useState('')
  const [reelUrl, setReelUrl] = useState('')
  const [reels, setReels] = useState<Reel[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')

  const matchingReels = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const shortcode = reelUrl.match(/\/(?:reel|p|tv)\/([a-z\d_-]+)/i)?.[1]?.toLowerCase()
    return reels.filter(reel => (!normalized || `${reel.caption || ''} ${reel.permalink || ''} ${reel.id}`.toLowerCase().includes(normalized)) && (!reelUrl.trim() || (!!shortcode && (reel.permalink || '').toLowerCase().includes(`/${shortcode}/`))))
  }, [reels, query, reelUrl])

  async function loadReels(pageUrl?: string) {
    if (!token.trim() || busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      let url: URL
      if (pageUrl) {
        const safe = safeNextPage(pageUrl)
        if (!safe) throw new Error('Instagram returned an unexpected page link. Try loading your Reels again.')
        url = new URL(safe)
      } else {
        url = new URL(`${GRAPH}/me/media`)
        url.searchParams.set('fields', FIELDS)
        url.searchParams.set('limit', '50')
        url.searchParams.set('access_token', token.trim())
      }
      const response = await fetch(url, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(25000) })
      const payload = await response.json() as ApiPayload
      if (!response.ok || payload.error) throw new Error(payload.error?.message || 'Instagram could not return your media. Check that the token is valid and has instagram_business_basic access.')
      const videos = (Array.isArray(payload.data) ? payload.data : []).filter(item => item.media_type === 'VIDEO' && typeof item.media_url === 'string' && /^https:\/\//i.test(item.media_url))
      setReels(previous => pageUrl ? [...previous, ...videos.filter(video => !previous.some(item => item.id === video.id))] : videos)
      setNext(safeNextPage(payload.paging?.next))
      if (!videos.length && !pageUrl) setNotice('No downloadable Reels or videos were returned for this account. Instagram may withhold media links for some audio or copyright restrictions.')
      else if (!pageUrl) setNotice(`${videos.length} video${videos.length === 1 ? '' : 's'} loaded from your connected Instagram account.`)
    } catch (cause) {
      setError(cause instanceof Error && cause.name === 'TimeoutError' ? 'Instagram took too long to respond. Try again.' : cause instanceof Error ? cause.message : 'Could not load your Reels.')
    } finally { setBusy(false) }
  }

  function clear() { setToken(''); setReelUrl(''); setReels([]); setNext(null); setError(''); setNotice(''); setQuery('') }

  return <section className="ig-tool" aria-label="Instagram Reel downloader">
    <style>{`
      .ig-tool{--ig-ink:#f5f0ff;--ig-muted:#aaa2b8;--ig-line:rgba(190,166,235,.22);--ig-accent:#c2a4ff;color:var(--ig-ink);display:grid;gap:20px}
      .ig-tool *{box-sizing:border-box}.ig-card{min-width:0;padding:22px;border:1px solid var(--ig-line);border-radius:19px;background:rgba(12,10,22,.76);box-shadow:0 16px 36px rgba(0,0,0,.14)}
      .ig-tool h3{margin:0 0 8px;font-size:16px}.ig-tool p{color:var(--ig-muted);font-size:13px;line-height:1.7;margin:8px 0 0}.ig-lead{display:flex;align-items:flex-start;gap:13px}.ig-mark{flex:0 0 42px;width:42px;height:42px;border-radius:13px;display:grid;place-items:center;color:#f4e8ff;background:linear-gradient(145deg,#a342d5,#593ce0 58%,#f58d6d);box-shadow:0 7px 25px #893ee537}
      .ig-field{display:grid;gap:8px;margin-top:17px}.ig-field label{font-size:12px;font-weight:700;color:var(--ig-ink)}.ig-field input{min-width:0;width:100%;min-height:48px;padding:12px 14px;border:1px solid var(--ig-line);border-radius:12px;background:rgba(4,4,12,.55);color:var(--ig-ink);font:inherit;font-size:14px}.ig-field input:focus{outline:2px solid #a78bfa;outline-offset:2px}.ig-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.ig-button{min-height:44px;padding:10px 15px;border:1px solid var(--ig-line);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;gap:8px;background:rgba(167,139,250,.12);color:var(--ig-ink);font:inherit;font-size:12px;font-weight:750;text-decoration:none;cursor:pointer}.ig-button.primary{background:linear-gradient(110deg,#c3a5ff,#9d82ef);color:#1b1230;border:0}.ig-button:disabled{opacity:.55;cursor:not-allowed}.ig-spin{animation:igspin .8s linear infinite}@keyframes igspin{to{transform:rotate(360deg)}}.ig-note{display:flex;gap:10px;align-items:flex-start;padding:13px 14px;border-radius:12px;background:rgba(167,139,250,.08);color:var(--ig-muted);font-size:12px;line-height:1.65}.ig-note svg{flex:none;color:var(--ig-accent);margin-top:1px}.ig-status{font-size:12px;line-height:1.6}.ig-error{color:#ffb9c3}.ig-good{color:#b8efd1}.ig-results-head{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}.ig-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;margin-top:16px}.ig-reel{overflow:hidden;border:1px solid var(--ig-line);border-radius:15px;background:rgba(255,255,255,.025)}.ig-thumb{width:100%;height:245px;display:grid;place-items:center;background:linear-gradient(145deg,#241835,#101321);overflow:hidden}.ig-thumb img{width:100%;height:100%;object-fit:cover}.ig-reel-body{padding:14px}.ig-caption{margin:0!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:42px}.ig-meta{font-size:11px!important}.ig-reel-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ig-reel-actions .ig-button{flex:1}.ig-empty{padding:24px;text-align:center;color:var(--ig-muted);font-size:13px}.ig-help{color:var(--ig-accent);text-decoration:underline;text-underline-offset:3px}
      html[data-theme='light'] .ig-tool{--ig-ink:#251b35;--ig-muted:#665d74;--ig-line:rgba(91,66,132,.2);--ig-accent:#7043b8}.ig-tool html[data-theme='light']{}.ig-tool{}
      html[data-theme='light'] .ig-card{background:rgba(255,255,255,.95);box-shadow:0 14px 38px rgba(59,39,91,.07)}html[data-theme='light'] .ig-field input{background:#fff}html[data-theme='light'] .ig-button{background:#f2ecfa;color:#392951;border-color:#d7c8eb}html[data-theme='light'] .ig-button.primary{background:linear-gradient(110deg,#c4a6f6,#a98add);color:#241432;border:0}html[data-theme='light'] .ig-note{background:#f5f0fb}html[data-theme='light'] .ig-thumb{background:linear-gradient(145deg,#e8dff3,#d9deea)}
      @media(max-width:600px){.ig-card{padding:17px}.ig-grid{grid-template-columns:1fr}.ig-thumb{height:260px}.ig-actions .ig-button{flex:1}.ig-reel-actions .ig-button{min-width:0}}
      @media(prefers-reduced-motion:reduce){.ig-spin{animation:none}}
    `}</style>
    <div className="ig-card"><div className="ig-lead"><span className="ig-mark"><Film size={22}/></span><div><h3>Save Reels from your own Instagram account</h3><p>This uses Meta’s Instagram API to list videos from your professional account. It doesn’t scrape public profiles or bypass Instagram restrictions.</p></div></div>
      <div className="ig-note" style={{marginTop:18}}><LockKeyhole size={17}/><span>Your access token is used only in this tab to ask Instagram for your media. It is not saved by this tool. Use an Instagram User token with <strong>instagram_business_basic</strong> permission for a Business or Creator account.</span></div>
      <div className="ig-field"><label htmlFor="ig-access-token">Instagram User access token</label><input id="ig-access-token" type="password" autoComplete="off" spellCheck={false} value={token} onChange={event=>setToken(event.target.value)} placeholder="Paste your Meta-issued token"/></div>
      <div className="ig-field"><label htmlFor="ig-reel-link">Optional: find one of your Reels by its link</label><input id="ig-reel-link" type="url" inputMode="url" value={reelUrl} onChange={event=>setReelUrl(event.target.value)} placeholder="https://www.instagram.com/reel/..."/></div>
      <div className="ig-actions"><button className="ig-button primary" type="button" onClick={()=>{void loadReels()}} disabled={!token.trim()||busy}>{busy?<LoaderCircle size={16} className="ig-spin"/>:<Search size={16}/>}Load my Reels</button><button className="ig-button" type="button" onClick={clear} disabled={busy}><Trash2 size={15}/>Clear token and results</button><a className="ig-button" href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer"><ExternalLink size={15}/>Meta Graph API Explorer</a><a className="ig-button" href="https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started/" target="_blank" rel="noreferrer"><ExternalLink size={15}/>Setup guide</a></div>
      <p className="ig-status ig-error" role="alert">{error}</p><p className="ig-status ig-good" role="status">{notice}</p>
    </div>
    {reels.length>0&&<div className="ig-card"><div className="ig-results-head"><div><h3>Your video library</h3><p>{matchingReels.length} matching video{matchingReels.length===1?'':'s'} · returned by Instagram</p></div><div className="ig-field" style={{marginTop:0,minWidth:200}}><label htmlFor="ig-search">Filter by Reel link or ID</label><input id="ig-search" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search your videos"/></div></div>
      {matchingReels.length? <div className="ig-grid">{matchingReels.map((reel,index)=><article className="ig-reel" key={reel.id}><div className="ig-thumb">{reel.thumbnail_url?<img src={reel.thumbnail_url} loading="lazy" alt="Instagram video thumbnail"/>:<Film size={34} aria-hidden="true"/>}</div><div className="ig-reel-body"><p className="ig-caption">{reel.caption||'Your Instagram video'}</p><p className="ig-meta">{reel.timestamp?new Date(reel.timestamp).toLocaleDateString():''}</p><div className="ig-reel-actions"><a className="ig-button primary" href={reel.media_url} download={`instagram-reel-${index+1}.mp4`} target="_blank" rel="noreferrer"><Download size={15}/>Download video</a>{reel.permalink&&<a className="ig-button" href={reel.permalink} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Open Reel</a>}</div></div></article>)}</div>:<div className="ig-empty">No videos match those filters. Check the Reel link or clear the search.</div>}
      {next&&<div className="ig-actions"><button className="ig-button" type="button" disabled={busy} onClick={()=>{void loadReels(next)}}>{busy?<LoaderCircle size={16} className="ig-spin"/>:<RotateCcw size={15}/>}Load more videos</button></div>}
      <div className="ig-note" style={{marginTop:18}}><ShieldCheck size={17}/><span>Meta may omit a video URL when a Reel contains copyrighted material or has been flagged. If the browser plays the video instead of saving it, use the browser’s video menu to save it when that option is available.</span></div>
    </div>}
    <p className="ig-status">Meta’s API supports content owned by professional Instagram accounts. Personal accounts and media that Meta withholds aren’t available through this tool.</p>
  </section>
}
