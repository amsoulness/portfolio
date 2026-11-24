import { useEffect, useState } from 'react'
import { Check, Copy, Download, Eye, EyeOff, Server, Terminal } from 'lucide-react'
import { BOT_REPO, KOYEB_DEPLOY, panelScript, RENDER_DEPLOY, VPS_COMMAND } from './session-deployment'

export default function DeploymentHub({ session }: { session: string }) {
  const [host, setHost] = useState('render')
  const [embedded, setEmbedded] = useState('')
  const [visible, setVisible] = useState(false)
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState('')
  const [step, setStep] = useState(0)
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
  const steps = ['Connect', 'Configure', 'Launch']
  return <section id="deploy" className="as-deploy-panel" aria-labelledby="deploy-heading">
    <span className="as-session-eyebrow"><Server size={15}/> DEPLOY YOUR BOT</span><h2 id="deploy-heading">Pick your host.<br/>Make it yours.</h2><p className="as-deploy-intro">Your session is ready for wherever you build.</p>
    <div className="as-host-tabs" role="tablist" aria-label="Deployment host">{[['render', 'Render', 'GUIDED'], ['koyeb', 'Koyeb', 'CLOUD'], ['vps', 'VPS', '1 COMMAND'], ['panel', 'Panel', 'START.JS']].map(([id, title, label]) => <button type="button" role="tab" aria-selected={host === id} aria-controls={`as-host-${id}`} id={`as-tab-${id}`} key={id} onClick={() => { setHost(id); setNotice(''); setCopied('') }}><strong>{title}</strong><small>{label}</small></button>)}</div>
    <div role="tabpanel" id={`as-host-${host}`} aria-labelledby={`as-tab-${host}`} className="as-host-content">
      {host === 'render' && <><h3>Guided Render setup</h3><p>Create the bot service and a PostgreSQL database together using the Amsoulness Blueprint.</p><ol className="as-render-progress" aria-label="Render setup steps">{steps.map((s, i) => <li key={s}><button aria-current={step === i ? 'step' : undefined} onClick={() => setStep(i)}>{i < step ? <Check size={13}/> : <span>{i + 1}</span>}{s}</button></li>)}</ol>
        {step === 0 && <div className="as-render-step"><h4>Connect your account</h4><p>Sign in to Render and connect GitHub when prompted. The Blueprint uses your public Amsoulness repository.</p><a href="https://dashboard.render.com/" target="_blank" rel="noreferrer" className="as-deploy-secondary">Open Render dashboard</a></div>}
        {step === 1 && <div className="as-render-step"><h4>Have these two values ready</h4><dl className="as-deploy-values"><div><dt>SESSION</dt><dd>Your private <code>ASLNS~…</code> session.</dd></div><div><dt>SUDO</dt><dd>Your phone number with country code.</dd></div></dl><p>The Blueprint connects <code>DATABASE_URL</code> automatically. Paste your session only into Render’s environment prompt.</p>{session && <button className="as-deploy-secondary" onClick={() => void copy(session, 'render-session')}>{copied === 'render-session' ? 'Session copied' : 'Copy my generated session'}</button>}</div>}
        {step === 2 && <div className="as-render-step"><h4>Review, then deploy</h4><p>Open the Blueprint, enter your session and owner number, review the resource plans, then approve deployment on Render.</p><a href={RENDER_DEPLOY} target="_blank" rel="noreferrer" className="as-session-primary">Open Amsoulness Blueprint</a></div>}
        <div className="as-render-controls">{step > 0 && <button className="as-session-text-button" onClick={() => setStep(step - 1)}>Back</button>}{step < 2 && <button className="as-session-primary" onClick={() => setStep(step + 1)}>Continue setup</button>}</div><p className="as-deploy-footnote">Free Render databases expire after 30 days; free services may sleep. Review plans in Render before deploying. <a href="https://render.com/docs/free" target="_blank" rel="noreferrer">See limits</a>.</p></>}
      {host === 'koyeb' && <><h3>Launch on Koyeb</h3><p>Open a deploy form prefilled with the Amsoulness source and Dockerfile. Add these values on Koyeb:</p><dl className="as-deploy-values"><div><dt>SESSION</dt><dd>Your private session string</dd></div><div><dt>DATABASE_URL</dt><dd>A persistent PostgreSQL connection URL</dd></div><div><dt>SUDO</dt><dd>Your owner phone number</dd></div></dl><a className="as-session-primary" href={KOYEB_DEPLOY} target="_blank" rel="noreferrer">Open Koyeb deployment</a><p className="as-deploy-footnote">Choose your instance and region on Koyeb. This link never includes your private session.</p></>}
      {host === 'vps' && <><h3>One command on your VPS</h3><p>For Ubuntu or Debian servers. The installer checks Docker, downloads Amsoulness, asks for your session, and starts the bot with persistent SQLite storage.</p><div className="as-deploy-code"><code>{VPS_COMMAND}</code><button aria-label="Copy VPS command" onClick={() => void copy(VPS_COMMAND, 'vps')}>{copied === 'vps' ? <Check size={17}/> : <Copy size={17}/>}</button></div><div className="as-deploy-links"><a href="/install-aslns.sh" target="_blank" rel="noreferrer">Read the installer</a><a href={`${BOT_REPO}#installation`} target="_blank" rel="noreferrer">Manual setup guide</a></div><p className="as-deploy-footnote">Run as your normal user with sudo access. The script asks before installing Docker. Keep the generated config.env private.</p></>}
      {host === 'panel' && <><h3>A launcher for your panel</h3><p>For Pterodactyl-style Node.js panels. Download <code>start.js</code>, upload it to your server, and start it.</p><label className="as-embed-label" htmlFor="as-panel-session">Session (optional, embedded in start.js)</label><div className="as-embed-input"><input id="as-panel-session" type={visible ? 'text' : 'password'} value={embedded} onChange={e => setEmbedded(e.target.value)} autoComplete="off" spellCheck={false} placeholder="ASLNS~…"/><button aria-label={visible ? 'Hide embedded session' : 'Show embedded session'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>{session && <button className="as-session-text-button" onClick={() => setEmbedded(session)}>Use my generated session</button>}<p className="as-deploy-footnote">Leave empty to set SESSION in the panel’s startup variables. If embedded, keep the downloaded file private.</p><div className="as-deploy-actions"><button className="as-session-primary" onClick={download}><Download size={17}/>Download start.js</button><button className="as-deploy-secondary" onClick={() => void copy(panelScript(embedded), 'panel')}><Copy size={17}/>{copied === 'panel' ? 'Copied start.js' : 'Copy start.js'}</button></div><ol className="as-panel-steps"><li>Choose a Node 24.15+ (24.x) or Node 26+ egg with Git and FFmpeg available.</li><li>Upload <code>start.js</code> to the server’s root folder.</li><li>Set the startup file to <code>start.js</code>; set SESSION if it is not embedded.</li><li>Start the server. First boot downloads the bot and installs dependencies.</li></ol></>}
    </div>{notice && <p className="as-session-error" role="alert">{notice}</p>}<div className="as-deploy-brand"><Terminal size={14}/><span>Deploys amsoulness/amsoulness-md</span></div>
  </section>
}
