import { useState } from 'react'
import { AlertTriangle, ExternalLink, Film, Search, ShieldCheck } from 'lucide-react'

type Inspection = { canonicalUrl: string; shortcode: string; host: string }

function inspectInstagramUrl(value: string): Inspection | null {
  try {
    const url = new URL(value.trim())
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (url.protocol !== 'https:' || host !== 'instagram.com') return null
    const match = url.pathname.match(/^\/(reel|reels|p|tv)\/([\w-]+)\/?$/i)
    if (!match) return null
    return { canonicalUrl: `https://www.instagram.com/${match[1]}/${match[2]}/`, shortcode: match[2], host }
  } catch { return null }
}

export default function InstagramReelDownloader() {
  const [url, setUrl] = useState('')
  const [inspection, setInspection] = useState<Inspection | null>(null)
  const [error, setError] = useState('')

  function runDemo() {
    const result = inspectInstagramUrl(url)
    setInspection(result)
    setError(result ? '' : 'Paste a full Instagram Reel, post, or video URL, such as https://www.instagram.com/reel/SHORTCODE/.')
  }

  return <section className="ig-tool" aria-label="Inspect the downloadGram downloader flow">
    <style>{`
      .ig-tool{--ig-ink:#f5f0ff;--ig-muted:#aaa2b8;--ig-line:rgba(190,166,235,.22);--ig-accent:#c2a4ff;color:var(--ig-ink);display:grid;gap:20px}
      .ig-tool *{box-sizing:border-box}.ig-card{min-width:0;padding:22px;border:1px solid var(--ig-line);border-radius:19px;background:rgba(12,10,22,.76);box-shadow:0 16px 36px rgba(0,0,0,.14)}
      .ig-tool h3{margin:0 0 8px;font-size:16px}.ig-tool p{color:var(--ig-muted);font-size:13px;line-height:1.7;margin:8px 0 0}.ig-lead{display:flex;align-items:flex-start;gap:13px}.ig-mark{flex:0 0 42px;width:42px;height:42px;border-radius:13px;display:grid;place-items:center;color:#f4e8ff;background:linear-gradient(145deg,#a342d5,#593ce0 58%,#f58d6d);box-shadow:0 7px 25px #893ee537}
      .ig-field{display:grid;gap:8px;margin-top:17px}.ig-field label{font-size:12px;font-weight:700;color:var(--ig-ink)}.ig-field input{min-width:0;width:100%;min-height:48px;padding:12px 14px;border:1px solid var(--ig-line);border-radius:12px;background:rgba(4,4,12,.55);color:var(--ig-ink);font:inherit;font-size:14px}.ig-field input:focus{outline:2px solid #a78bfa;outline-offset:2px}.ig-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.ig-button{min-height:44px;padding:10px 15px;border:1px solid var(--ig-line);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;gap:8px;background:rgba(167,139,250,.12);color:var(--ig-ink);font:inherit;font-size:12px;font-weight:750;text-decoration:none;cursor:pointer}.ig-button.primary{background:linear-gradient(110deg,#c3a5ff,#9d82ef);color:#1b1230;border:0}.ig-note{display:flex;gap:10px;align-items:flex-start;padding:13px 14px;border-radius:12px;background:rgba(167,139,250,.08);color:var(--ig-muted);font-size:12px;line-height:1.65}.ig-note svg{flex:none;color:var(--ig-accent);margin-top:1px}.ig-error{color:#ffb9c3!important}.ig-trace{display:grid;gap:10px;margin:17px 0 0;padding:0;list-style:none;counter-reset:step}.ig-trace li{counter-increment:step;display:flex;align-items:flex-start;gap:12px;padding:13px;border:1px solid var(--ig-line);border-radius:12px;background:rgba(255,255,255,.025);color:var(--ig-muted);font-size:13px;line-height:1.6}.ig-trace li:before{content:counter(step,decimal-leading-zero);font:700 11px ui-monospace,monospace;color:var(--ig-accent)}.ig-code{display:block;overflow-wrap:anywhere;padding:13px;border-radius:10px;background:rgba(4,4,12,.65);color:var(--ig-ink);font:12px/1.7 ui-monospace,Consolas,monospace}.ig-good{color:#b8efd1!important}
      html[data-theme='light'] .ig-tool{--ig-ink:#251b35;--ig-muted:#665d74;--ig-line:rgba(91,66,132,.2);--ig-accent:#7043b8}html[data-theme='light'] .ig-card{background:rgba(255,255,255,.96);box-shadow:0 14px 38px rgba(59,39,91,.07)}html[data-theme='light'] .ig-field input{background:#fff}html[data-theme='light'] .ig-button{background:#f2ecfa;color:#392951;border-color:#d7c8eb}html[data-theme='light'] .ig-button.primary{background:linear-gradient(110deg,#c4a6f6,#a98add);color:#241432;border:0}html[data-theme='light'] .ig-note{background:#f5f0fb}html[data-theme='light'] .ig-trace li{background:#fff}html[data-theme='light'] .ig-code{background:#f1edf6}
      @media(max-width:600px){.ig-card{padding:17px}.ig-actions .ig-button{flex:1}}
    `}</style>

    <div className="ig-card">
      <div className="ig-lead"><span className="ig-mark"><Film size={22}/></span><div><h3>Inspect the bot’s Instagram download flow</h3><p>Use a sample URL to demonstrate what the public source reveals about <code>downloadGram</code>.</p></div></div>
      <div className="ig-note" style={{marginTop:18}}><AlertTriangle size={17}/><span><strong>Demonstration mode:</strong> this page checks and displays the URL locally. It does not call Instagram or the bot’s hidden downloader service and does not fetch a video.</span></div>
      <div className="ig-field"><label htmlFor="ig-demo-url">Instagram Reel / post URL</label><input id="ig-demo-url" type="url" inputMode="url" value={url} onChange={event=>{setUrl(event.target.value);setError('')}} onKeyDown={event=>{if(event.key==='Enter')runDemo()}} placeholder="https://www.instagram.com/reel/..."/></div>
      <div className="ig-actions"><button className="ig-button primary" type="button" onClick={runDemo}><Search size={16}/>Inspect example</button><a className="ig-button" href="https://github.com/souravkl11/raganork-md/blob/main/plugins/utils/misc.js" target="_blank" rel="noreferrer"><ExternalLink size={15}/>Source: misc.js</a><a className="ig-button" href="https://github.com/souravkl11/raganork-md/blob/main/core/private.js" target="_blank" rel="noreferrer"><ExternalLink size={15}/>Source: private.js</a></div>
      {error&&<p className="ig-error" role="alert">{error}</p>}
    </div>

    {inspection&&<div className="ig-card" aria-live="polite">
      <div className="ig-lead"><span className="ig-mark"><ShieldCheck size={21}/></span><div><h3>Local inspection complete</h3><p className="ig-good">Valid Instagram URL structure · no network request was made</p></div></div>
      <ol className="ig-trace">
        <li>Input accepted for inspection: <strong>{inspection.canonicalUrl}</strong> (shortcode <code>{inspection.shortcode}</code>).</li>
        <li>The bot’s helper exports the wrapper shown in its public source:</li>
      </ol>
      <code className="ig-code">const downloadGram = (url) =&gt; priv.instagram(url);</code>
      <ol className="ig-trace" start={3}>
        <li>The wrapper passes the URL into <code>priv.instagram(url)</code>.</li>
        <li><code>core/private.js</code> says it is intentionally obfuscated and contains private backend endpoints and API keys. The request destination, response handling, and authorization checks cannot be independently verified from that file.</li>
      </ol>
      <div className="ig-note" style={{marginTop:17}}><AlertTriangle size={17}/><span>This demonstration deliberately stops before the hidden call. For an official review, inspect the bot operator’s backend logs, service terms, and authorization controls. The sample URL remains in this browser tab only.</span></div>
    </div>}
  </section>
}
