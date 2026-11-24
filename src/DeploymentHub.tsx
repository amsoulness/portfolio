import { useEffect, useState } from 'react'
import { Check, Copy, Download, Eye, EyeOff, Server, Terminal } from 'lucide-react'
import { BOT_REPO, KOYEB_DEPLOY, panelScript, RENDER_DEPLOY, VPS_COMMAND } from './session-deployment'

export default function DeploymentHub({ session }: { session: string }) {
  const [host, setHost] = useState('render')
  const [embedded, setEmbedded] = useState('')
  const [visible, setVisible] = useState(false)
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState('')
  useEffect(() => {
    if (window.location.hash === '#deploy') document.getElementById('deploy')?.scrollIntoView()
  }, [])
  async function copy(text: string, name: string) {
    try { await navigator.clipboard.writeText(text); setCopied(name); setNotice('') }
    catch { setNotice('Clipboard access was blocked. Select the command or download the file instead.') }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([panelScript(embedded)], { type: 'text/javascript;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'start.js'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section id="deploy" className="as-deploy-panel" aria-labelledby="deploy-heading">
    <span className="as-session-eyebrow"><Server size={15}/> DEPLOY YOUR BOT</span><h2 id="deploy-heading">Pick your host.<br/>Make it yours.</h2><p className="as-deploy-intro">Your session is ready for wherever you build.</p>
    <div className="as-host-tabs" role="tablist" aria-label="Deployment host">{[['render', 'Render', 'GUIDED'], ['koyeb', 'Koyeb', 'CLOUD'], ['vps', 'VPS', '1 COMMAND'], ['panel', 'Panel', 'START.JS']].map(([id, title, label]) => <button type="button" role="tab" aria-selected={host === id} aria-controls={`as-host-${id}`} id={`as-tab-${id}`} key={id} onClick={() => { setHost(id); setNotice(''); setCopied('') }}><strong>{title}</strong><small>{label}</small></button>)}</div>
    <div role="tabpanel" id={`as-host-${host}`} aria-labelledby={`as-tab-${host}`} className="as-host-content">
      {host === 'render' && <><h3>Deploy from start to finish</h3><p>Connect GitHub, add your Render API key and session, then follow the deployment as your repository, database and service are created.</p><dl className="as-deploy-values"><div><dt>GITHUB</dt><dd>Your own public deployment repository</dd></div><div><dt>RENDER API KEY</dt><dd>Creates resources in your chosen workspace</dd></div><div><dt>SESSION</dt><dd>Your private Amsoulness bot session</dd></div></dl>{session && <button className="as-deploy-secondary" onClick={() => void copy(session, 'render-session')}>{copied === 'render-session' ? 'Session copied' : 'Copy my generated session'}</button>}<a href="/session/deploy/render" className="as-session-primary" style={{marginTop: 20}}>Start Render deployment</a><p className="as-deploy-footnote">Free database expires after 30 days. <a href={RENDER_DEPLOY} target="_blank" rel="noreferrer">Use the official Blueprint instead</a>.</p></>}
      {host === 'koyeb' && <><h3>Launch on Koyeb</h3><p>Open a deploy form prefilled with the Amsoulness source and Dockerfile. Add these values on Koyeb:</p><dl className="as-deploy-values"><div><dt>SESSION</dt><dd>Your private session string</dd></div><div><dt>DATABASE_URL</dt><dd>A persistent PostgreSQL connection URL</dd></div><div><dt>SUDO</dt><dd>Your owner phone number</dd></div></dl><a className="as-session-primary" href={KOYEB_DEPLOY} target="_blank" rel="noreferrer">Open Koyeb deployment</a><p className="as-deploy-footnote">Choose your instance and region on Koyeb. This link never includes your private session.</p></>}
      {host === 'vps' && <><h3>One command on your VPS</h3><p>For Ubuntu or Debian servers. The installer checks Docker, downloads Amsoulness, asks for your session, and starts the bot with persistent SQLite storage.</p><div className="as-deploy-code"><code>{VPS_COMMAND}</code><button aria-label="Copy VPS command" onClick={() => void copy(VPS_COMMAND, 'vps')}>{copied === 'vps' ? <Check size={17}/> : <Copy size={17}/>}</button></div><div className="as-deploy-links"><a href="/install-aslns.sh" target="_blank" rel="noreferrer">Read the installer</a><a href={`${BOT_REPO}#installation`} target="_blank" rel="noreferrer">Manual setup guide</a></div><p className="as-deploy-footnote">Run as your normal user with sudo access. The script asks before installing Docker. Keep the generated config.env private.</p></>}
      {host === 'panel' && <><h3>A launcher for your panel</h3><p>For Pterodactyl-style Node.js panels. Download <code>start.js</code>, upload it to your server, and start it.</p><label className="as-embed-label" htmlFor="as-panel-session">Session (optional, embedded in start.js)</label><div className="as-embed-input"><input id="as-panel-session" type={visible ? 'text' : 'password'} value={embedded} onChange={e => setEmbedded(e.target.value)} autoComplete="off" spellCheck={false} placeholder="ASLNS~…"/><button aria-label={visible ? 'Hide embedded session' : 'Show embedded session'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>{session && <button className="as-session-text-button" onClick={() => setEmbedded(session)}>Use my generated session</button>}<p className="as-deploy-footnote">Leave empty to set SESSION in the panel’s startup variables. If embedded, keep the downloaded file private.</p><div className="as-deploy-actions"><button className="as-session-primary" onClick={download}><Download size={17}/>Download start.js</button><button className="as-deploy-secondary" onClick={() => void copy(panelScript(embedded), 'panel')}><Copy size={17}/>{copied === 'panel' ? 'Copied start.js' : 'Copy start.js'}</button></div><ol className="as-panel-steps"><li>Choose a Node 24.15+ (24.x) or Node 26+ egg with Git and FFmpeg available.</li><li>Upload <code>start.js</code> to the server’s root folder.</li><li>Set the startup file to <code>start.js</code>; set SESSION if it is not embedded.</li><li>Start the server. First boot downloads the bot and installs dependencies.</li></ol></>}
    </div>{notice && <p className="as-session-error" role="alert">{notice}</p>}<div className="as-deploy-brand"><Terminal size={14}/><span>Deploys amsoulness/amsoulness-md</span></div>
  </section>
}
