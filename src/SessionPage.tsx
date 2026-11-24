import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, CheckCircle2, Copy, Code as Github, Link2, LoaderCircle, LockKeyhole, QrCode, Smartphone, X } from 'lucide-react'
import ThemeToggle, { type SiteTheme, type ThemePreference } from './ThemeToggle'
import './SessionPage.css'

const API = 'https://aslns-pairing-production.up.railway.app'
type PairState = { state: 'starting' | 'waiting' | 'finishing' | 'ready' | 'error'; qr?: string; code?: string; session?: string; error?: string; expiresAt?: number }
type Props = { theme: SiteTheme; themePreference: ThemePreference; onToggleTheme: () => void }

export default function SessionPage({ theme, themePreference, onToggleTheme }: Props) {
  const [method, setMethod] = useState<'qr' | 'code'>('qr')
  const [phone, setPhone] = useState('')
  const [pair, setPair] = useState<PairState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [accepted, setAccepted] = useState(false)
  const idRef = useRef<string | null>(null)
  const generation = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const controllerRef = useRef<AbortController | null>(null)
  const active = busy || !!pair && !['ready', 'error'].includes(pair.state)

  const release = useCallback(() => {
    generation.current++
    controllerRef.current?.abort()
    clearTimeout(timerRef.current)
    const id = idRef.current
    idRef.current = null
    if (id) void fetch(`${API}/api/session`, { method: 'DELETE', headers: { Authorization: `Bearer ${id}` }, keepalive: true }).catch(() => {})
  }, [])
  useEffect(() => {
    const oldTitle = document.title
    document.title = 'WhatsApp Session · Amsoulness / ASLNS'
    return () => { document.title = oldTitle; release() }
  }, [release])
  useEffect(() => {
    if (!pair?.expiresAt) return
    const tick = () => setRemaining(Math.max(0, Math.ceil((pair.expiresAt! - Date.now()) / 1000)))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [pair?.expiresAt])

  async function start() {
    if (!accepted || busy) return
    if (method === 'code' && !/^[1-9]\d{6,14}$/.test(phone.replace(/[\s()+-]/g, ''))) {
      setError('Enter your full WhatsApp number with country code.'); return
    }
    release()
    const run = generation.current
    const controller = new AbortController()
    controllerRef.current = controller
    setBusy(true); setError(''); setCopied(false); setPair({ state: 'starting' })
    const request = async (methodName: string, id?: string) => {
      const response = await fetch(`${API}/api/session`, {
        method: methodName, signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(id ? { Authorization: `Bearer ${id}` } : {}) },
        ...(methodName === 'POST' ? { body: JSON.stringify({ method, ...(method === 'code' ? { phone } : {}) }) } : {}),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Connection failed. Please try again.')
      return data
    }
    try {
      const created = await request('POST')
      if (run !== generation.current) {
        void fetch(`${API}/api/session`, { method: 'DELETE', headers: { Authorization: `Bearer ${created.id}` } }).catch(() => {})
        return
      }
      idRef.current = created.id
      setPair({ state: 'starting', expiresAt: created.expiresAt }); setBusy(false)
      const poll = async () => {
        try {
          const next: PairState = await request('GET', created.id)
          if (run !== generation.current) return
          setPair(next)
          if (next.state === 'error') { setError(next.error || 'Please try again.'); return }
          if (next.state === 'ready') return
          timerRef.current = setTimeout(() => void poll(), 1800)
        } catch (e) {
          if (run !== generation.current) return
          setError(e instanceof Error ? e.message : 'Connection interrupted. Please try again.')
          setPair({ state: 'error' }); setBusy(false)
        }
      }
      void poll()
    } catch (e) {
      if (run !== generation.current) return
      setError(e instanceof Error ? e.message : 'Could not reach the pairing server.')
      setPair({ state: 'error' }); setBusy(false)
    }
  }
  function reset() { release(); setPair(null); setBusy(false); setError(''); setCopied(false) }
  async function copySession() {
    try { await navigator.clipboard.writeText(pair?.session || ''); setCopied(true) }
    catch { setError('Clipboard access was blocked. Select the session below and copy it manually.') }
  }

  return <div className="as-session" data-theme={theme}>
    <div className="as-session-glow" aria-hidden="true"/>
    <header className="as-session-nav">
      <a href="/" className="as-session-brand"><span className="as-session-monogram">A<span>·</span></span><span>AMSOULNESS<small>ASLNS / TOOL LAB</small></span></a>
      <nav aria-label="Session navigation"><a href="/">Portfolio</a><a href="/tools">Tools</a><ThemeToggle theme={theme} preference={themePreference} onToggle={onToggleTheme}/></nav>
    </header>
    <main className="as-session-main">
      <div className="as-session-heading"><span className="as-session-eyebrow"><Link2 size={15}/> WHATSAPP SESSION</span><h1>Your bot.<br/><span>Your connection.</span></h1><p>Link WhatsApp to Amsoulness in a few simple steps.<br className="as-session-desktop"/> Scan a QR or use your phone number. Then copy your session.</p></div>
      <div className="as-session-layout">
        <section className="as-pair-panel" aria-labelledby="pair-heading">
          <div className="as-panel-title"><span className="as-icon-tile"><Smartphone size={23}/></span><div><h2 id="pair-heading">Connect your WhatsApp</h2><p>Choose how you want to link your device.</p></div></div>
          <div className="as-pair-tabs" role="group" aria-label="Pairing method"><button aria-pressed={method === 'qr'} disabled={active} onClick={() => { reset(); setMethod('qr') }}><QrCode size={18}/> QR code</button><button aria-pressed={method === 'code'} disabled={active} onClick={() => { reset(); setMethod('code') }}><Smartphone size={18}/> Pairing code</button></div>
          {!pair || pair.state === 'error' ? <form onSubmit={e => { e.preventDefault(); void start() }}>
            {method === 'code' ? <div className="as-phone-field"><label htmlFor="session-phone">WhatsApp phone number</label><input id="session-phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" required pattern="[+0-9 ()\-]{7,22}"/><p>Include your country code. We never ask for your OTP.</p></div> : <div className="as-qr-placeholder"><div className="as-qr-frame"><QrCode size={72} strokeWidth={1}/></div><strong>One scan. You’re connected.</strong><p>Generate a QR, then scan it in WhatsApp<br/>under Settings › Linked devices.</p></div>}
            <label className="as-session-consent"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}/><span>I’m linking my own WhatsApp account and understand this creates a bot session.</span></label>
            <button className="as-session-primary" type="submit" disabled={!accepted || busy}>{method === 'qr' ? <QrCode size={18}/> : <Link2 size={18}/>} {method === 'qr' ? 'Generate QR code' : 'Get pairing code'}</button>
          </form> : pair.state === 'ready' ? <div className="as-session-result"><CheckCircle2 size={44}/><h3>You’re connected.</h3><p>Copy this private session into your bot’s <code>SESSION</code> setting, then start your bot.</p><label htmlFor="as-session-output">Your Amsoulness session</label><textarea id="as-session-output" readOnly value={pair.session || ''} spellCheck={false}/><button className="as-session-primary" onClick={() => void copySession()}>{copied ? <Check size={18}/> : <Copy size={18}/>} {copied ? 'Session copied' : 'Copy session'}</button><p className="as-session-note">Keep it private. Anyone with this session can access your linked WhatsApp account.</p><button className="as-session-text-button" onClick={reset}>Clear session from this page</button></div> : <div className="as-session-live" aria-live="polite">
            {pair.qr ? <><img src={pair.qr} width="280" height="280" alt="Scan this WhatsApp linking QR code"/><h3>Scan with WhatsApp</h3><p>Settings › Linked devices › Link a device</p></> : pair.code ? <><span className="as-icon-tile"><Smartphone size={28}/></span><h3>Enter this code on your phone</h3><div className="as-pair-code">{pair.code.match(/.{1,4}/g)?.join(' – ')}</div><p>WhatsApp › Linked devices › Link a device<br/>› Link with phone number instead</p></> : <><LoaderCircle size={38} className="as-session-spinner"/><h3>{pair.state === 'finishing' ? 'Finishing your connection…' : 'Preparing your connection…'}</h3><p>{pair.state === 'finishing' ? 'Your private session will appear here shortly.' : 'Keep this page open. This may take a moment.'}</p></>}
            {pair.expiresAt && <span className="as-session-expiry">Connection expires in {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span>}<button className="as-session-text-button" onClick={reset}><X size={15}/> Cancel connection</button>
          </div>}
          {error && <p className="as-session-error" role="alert">{error}</p>}
          <div className="as-session-private"><LockKeyhole size={14}/><span>Temporary pairing. No credentials saved to disk.</span></div>
        </section>
        <aside className="as-session-guide"><span className="as-session-eyebrow">LINK. COPY. BUILD.</span><h2>From your phone<br/> to your own bot.</h2><ol><li><span className="as-guide-icon"><Smartphone size={20}/></span><div><h3>Open WhatsApp</h3><p>Go to Settings, then Linked devices.<br/>Choose “Link a device”.</p></div></li><li><span className="as-guide-icon"><Link2 size={20}/></span><div><h3>Make the connection</h3><p>Scan your QR code, or enter the pairing code using your phone.</p></div></li><li><span className="as-guide-icon"><Copy size={20}/></span><div><h3>Copy your session</h3><p>Add it to your Amsoulness bot’s environment and you’re ready.</p></div></li></ol><a className="as-session-repo" href="https://github.com/amsoulness/amsoulness-md" target="_blank" rel="noreferrer"><Github size={20}/><div><strong>Meet Amsoulness-MD</strong><span>Source code & setup guide</span></div></a><div className="as-session-fineprint"><LockKeyhole size={17}/><p>Your pairing data is held temporarily in server memory and expires after five minutes. Save your session before leaving. You can revoke access in WhatsApp’s Linked devices at any time.</p></div></aside>
      </div>
      <section className="as-session-faq"><h2>A couple of things to know.</h2><details><summary>Is this my WhatsApp password?</summary><p>No. It is a linked-device session that grants access to your account. Treat it as a secret. Never share it publicly or put it in GitHub.</p></details><details><summary>Where do I paste the session?</summary><p>Set <code>SESSION=ASLNS~…</code> in your bot’s private config.env or your hosting provider’s environment variables. Use the latest Amsoulness-MD version, which supports this format.</p></details><details><summary>Can I disconnect later?</summary><p>Yes. Open WhatsApp › Settings › Linked devices, select the Amsoulness device and log it out. This uses an unofficial WhatsApp integration; use an account you are comfortable testing with.</p></details></section>
    </main><footer className="as-session-footer"><span>Built by AMSOULNESS / ASLNS</span><a href="/">Back to portfolio</a><span>Independent tool · Not affiliated with WhatsApp</span></footer>
  </div>
}
