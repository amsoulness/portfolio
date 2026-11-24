import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Film, Image as ImageIcon, LoaderCircle, Phone, RefreshCw, ShieldCheck, Upload, X } from 'lucide-react'
import './WhatsAppProfileTool.css'

const statusInputStyles = `
.wa-tool textarea{display:block;width:100%;box-sizing:border-box;margin-top:9px;padding:13px 15px;border:1px solid rgba(185,160,255,.28);border-radius:14px;background:rgba(9,8,18,.72);color:#f5efff;font:inherit;line-height:1.55;resize:vertical}
.wa-tool textarea:focus{outline:2px solid #a78bfa;outline-offset:2px}
.wa-tool textarea:disabled{opacity:.58}
.wa-tool .wa-drop video{display:block;width:100%;max-height:420px;object-fit:contain;border-radius:14px}
html[data-theme='light'] .wa-tool textarea{background:#fff;color:#20172d;border-color:#c9bbdf}
`;

const API = (import.meta.env.VITE_WHATSAPP_API_URL || 'https://portfolio-production-fe0b1536.up.railway.app').replace(/\/$/, '')
const KEY = 'aslns.whatsapp-status.v1'
const terminal = new Set(['SUCCESS', 'CANCELLED', 'ERROR'])
const allowed = new Set(['STARTING', 'CODE_READY', 'LINKED', 'SYNCING_CONTACTS', 'UPDATING', 'REMOVING_DEVICE', 'CANCELLING', 'CLEANUP_REQUIRED', ...terminal])
type Session = { sessionId: string; accessToken: string }
type State = { sessionId: string; status: string; pairingCode: string | null; expiresAt: string; updated: boolean; deviceRemoved: boolean; outcome: string; error: string | null }
type Asset = { file: File; url: string; kind: 'image' | 'video' }

class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

function readSession(): Session | null {
  try { const value = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (value?.api === API && /^[a-f0-9-]{36}$/.test(value.sessionId) && /^[a-f0-9]{64}$/.test(value.accessToken)) return { sessionId: value.sessionId, accessToken: value.accessToken } } catch { /* storage unavailable */ }
  return null
}
async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API}/api/whatsapp${path}`, { ...options, signal: options.signal || AbortSignal.timeout(30000), cache: 'no-store', credentials: 'omit' })
  if (!response.headers.get('content-type')?.includes('application/json')) throw new ApiError('The WhatsApp service is unavailable. Try again later.', response.status)
  const data = await response.json()
  if (!response.ok) throw new ApiError(data.error || 'The request could not be completed.', response.status)
  return data
}
function validateState(data: State): State { if (!data || !allowed.has(data.status) || typeof data.sessionId !== 'string' || !Number.isFinite(Date.parse(data.expiresAt))) throw new Error('Unexpected response from the WhatsApp service.'); return data }

export default function WhatsAppStatusTool() {
  const [asset, setAsset] = useState<Asset | null>(null), [phone, setPhone] = useState(''), [caption, setCaption] = useState(''), [consent, setConsent] = useState(false)
  const [session, setSession] = useState<Session | null>(readSession), [state, setState] = useState<State | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [pollError, setPollError] = useState(''), [missing, setMissing] = useState(false), [copied, setCopied] = useState(false)
  const input = useRef<HTMLInputElement>(null), active = !!session && !terminal.has(state?.status || ''), locked = busy || !!session
  const number = phone.trim().replace(/[+\s()-]/g, '')
  const validPhone = /^[1-9][0-9]{7,14}$/.test(number)
  const code = state?.pairingCode?.replace(/[^a-z0-9]/gi, '') || '', success = state?.status === 'SUCCESS' && state.updated && state.deviceRemoved
  useEffect(() => () => { if (asset) URL.revokeObjectURL(asset.url) }, [asset])
  useEffect(() => {
    if (!session) return
    let stopped = false, timer: ReturnType<typeof setTimeout>
    const controller = new AbortController()
    const poll = async () => {
      try { const value = validateState(await api(`/sessions/${session.sessionId}`, { headers: { 'X-Session-Token': session.accessToken }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) })); if (stopped) return; setState(value); setPollError(''); if (terminal.has(value.status)) return }
      catch (cause) {
        if (stopped) return
        if (cause instanceof ApiError && cause.status === 404) {
          try { sessionStorage.removeItem(KEY) } catch { /* Storage may be unavailable. */ }
          setSession(null)
          setState(null)
          setMissing(false)
          setPollError('')
          setError('Your previous status session expired. Choose the media and account again to start a fresh session. Check Linked devices in WhatsApp and remove this tool if it is still listed.')
          return
        }
        setPollError(cause instanceof Error ? cause.message : 'Connection interrupted. Checking again…')
      }
      if (!stopped) timer = setTimeout(poll, 2000)
    }
    void poll(); return () => { stopped = true; clearTimeout(timer); controller.abort() }
  }, [session])
  useEffect(() => { if (!active && !busy) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [active, busy])

  function choose(file?: File) {
    if (!file || locked) return
    setError('')
    const kind = file.type.startsWith('image/') ? 'image' : file.type === 'video/mp4' ? 'video' : null
    if (!kind || (kind === 'image' && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) || file.size > (kind === 'video' ? 16 : 20) * 1024 * 1024 || file.size === 0) { setError('Choose a JPG, PNG, or WebP image up to 20 MB, or an MP4 video up to 16 MB.'); return }
    setAsset({ file, url: URL.createObjectURL(file), kind })
  }
  async function start() {
    if (!asset || !validPhone || !consent || busy || session) return
    setBusy(true); setError('')
    try {
      const health = await api('/health'); if (health.available !== true) throw new Error('The WhatsApp service is temporarily unavailable.')
      const form = new FormData(); form.append('media', asset.file); form.append('phoneNumber', number); form.append('caption', caption.trim()); form.append('consent', 'true')
      const data = await api('/status', { method: 'POST', body: form, signal: AbortSignal.timeout(5 * 60 * 1000) }), current = validateState(data)
      if (!/^[a-f0-9]{64}$/.test(data.accessToken)) throw new Error('Could not create a secure session.')
      const credentials = { sessionId: current.sessionId, accessToken: data.accessToken }; try { sessionStorage.setItem(KEY, JSON.stringify({ ...credentials, api: API })) } catch { /* keep in memory */ }
      setState(current); setSession(credentials)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The status could not be uploaded.') } finally { setBusy(false) }
  }
  async function cancel() {
    if (!session || busy) return
    setBusy(true)
    try {
      const result = await api(`/sessions/${session.sessionId}`, {
        method: 'DELETE',
        headers: { 'X-Session-Token': session.accessToken }
      })
      setState(validateState(result))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not confirm cleanup.')
    } finally {
      setBusy(false)
    }
  }
  function reset() { if (active && !missing) return; try { sessionStorage.removeItem(KEY) } catch { /* no stored session */ }; setSession(null); setState(null); setAsset(null); setPhone(''); setCaption(''); setConsent(false); setError(''); setPollError(''); setMissing(false); setCopied(false) }
  async function copyCode() { try { await navigator.clipboard.writeText(code); setCopied(true) } catch { setError('Could not copy the code. Select it and copy manually.') } }
  const labels: Record<string, string> = { STARTING: 'Requesting your pairing code…', CODE_READY: 'Enter this code in WhatsApp', LINKED: 'Linked. Preparing your audience…', SYNCING_CONTACTS: 'Syncing saved WhatsApp contacts…', UPDATING: 'Publishing your WhatsApp status…', REMOVING_DEVICE: 'Removing the temporary linked device…', CANCELLING: 'Closing your session…', CLEANUP_REQUIRED: 'Device removal needs attention', SUCCESS: 'Status posted', CANCELLED: 'Session closed', ERROR: 'Status could not be posted' }

  return <section className="wa-tool" aria-label="WhatsApp status uploader">
    <style>{statusInputStyles}</style><div className="wa-intro"><span className="wa-badge"><Film size={14}/> STATUS STUDIO / 02</span><h3>Share a moment.<br/><em>Right from the lab.</em></h3><p>Choose a photo or MP4 clip, connect your own account, and publish it as a WhatsApp status.</p></div>
    <div className="wa-layout"><div className="wa-main">
      <section className="wa-card"><h4><span className="wa-step">1</span> Choose an image or video</h4><input ref={input} className="wa-file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4" aria-label="Choose status media" disabled={locked} onChange={event => { choose(event.target.files?.[0]); event.target.value = '' }}/>
        <button type="button" className={`wa-drop ${asset ? 'wa-has-photo' : ''}`} disabled={locked} onClick={() => input.current?.click()}>{asset ? asset.kind === 'video' ? <video src={asset.url} controls muted playsInline aria-label="Status video preview"/> : <img src={asset.url} alt="Full status image preview"/> : <><span className="wa-upload-icon"><Upload size={26}/></span><strong>Choose status media</strong><span>Drop it here or browse files</span><small>JPG, PNG, WebP ≤20 MB · MP4 ≤16 MB</small></>}</button>
        {asset && <div className="wa-photo-meta"><strong title={asset.file.name}>{asset.file.name}</strong><button type="button" className="wa-text-button" disabled={locked} onClick={() => input.current?.click()}>Change media</button></div>}
      </section>
      <section className="wa-card"><h4><span className="wa-step">2</span> Your WhatsApp account</h4><label className="wa-phone-label" htmlFor="wa-status-phone">Include your country code</label><div className="wa-phone"><Phone size={18}/><input id="wa-status-phone" type="tel" autoComplete="tel" placeholder="e.g. +91 98765 43210" value={phone} disabled={locked} onChange={event => setPhone(event.target.value)}/></div><p className="wa-small">This is the account that will publish the status.</p></section>
      <section className="wa-card"><h4><span className="wa-step">3</span> Add a caption <span className="wa-small">· optional</span></h4><label className="wa-phone-label" htmlFor="wa-status-caption">Caption</label><textarea id="wa-status-caption" rows={2} maxLength={500} placeholder="Add a short caption…" value={caption} disabled={locked} onChange={event => setCaption(event.target.value)}/><p className="wa-small">Your status uses the audience already selected in WhatsApp. Set it to <strong>My contacts</strong> in WhatsApp → Settings → Privacy → Status.</p></section>
      {!session && <><label className="wa-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)}/><span>This is my account. I approve a temporary sync to identify my saved WhatsApp contacts, publish this media to that audience, and remove the linked device afterward. WhatsApp may include recent chats/messages in the sync; the tool extracts contacts only and does not log or store chat/message content.</span></label><button type="button" className="wa-primary" disabled={!asset || !validPhone || !consent || busy} onClick={() => { void start() }}>{busy ? <LoaderCircle className="wa-spin" size={18}/> : <Upload size={18}/>} {busy ? 'Preparing your status…' : 'Publish WhatsApp status'}</button></>}
      {session && <section className={`wa-status ${success ? 'wa-success' : ''}`} aria-label="Status publishing progress"><div className="wa-status-title" role="status">{success ? <Check size={20}/> : active ? <LoaderCircle className="wa-spin" size={18}/> : <ShieldCheck size={19}/>}<strong>{missing ? 'Session unavailable' : state ? labels[state.status] : 'Restoring your session…'}</strong></div>
        {code && state?.status === 'CODE_READY' && <><span className="wa-badge wa-code-brand">✦ AMSOULNESS · SECURE PAIRING</span><div className="wa-code">{code}</div><p className="wa-small wa-code-hint">Enter these 8 characters exactly. Never share your pairing code.</p><button className="wa-secondary" type="button" onClick={() => { void copyCode() }}><Copy size={15}/>{copied ? 'Code copied' : 'Copy code'}</button><ol className="wa-instructions"><li>Open WhatsApp on your phone.</li><li>Go to <strong>Settings → Linked devices → Link a device</strong>.</li><li>Tap <strong>Link with phone number instead</strong> and enter the code.</li></ol><p className="wa-small">Keep this tab open. The status will publish after you link.</p></>}
        {state?.status === 'STARTING' && <p className="wa-small">Preparing a temporary connection. Your pairing code will appear here.</p>}{state?.status === 'SYNCING_CONTACTS' && <p className="wa-small">Finding saved contacts for your status audience. WhatsApp may include recent chats/messages in its sync; only contacts are extracted, and chat/message content is never logged or stored.</p>}{success && <p className="wa-small">WhatsApp accepted the status post and the temporary device was removed.</p>}{state?.error && !success && <p className="wa-status-error">{state.error}</p>}{pollError && <p className="wa-status-error" role="status">{pollError}</p>}
        {active && !missing && <button type="button" className="wa-secondary" disabled={busy || ['UPDATING','REMOVING_DEVICE','CANCELLING'].includes(state?.status || '')} onClick={() => { void cancel() }}><X size={15}/>Cancel and close session</button>}{(!active || missing) && <button type="button" className="wa-secondary" onClick={reset}><RefreshCw size={15}/>{missing ? 'Clear this session' : 'Start another status'}</button>}
      </section>}{error && <p className="wa-error" role="alert">{error}</p>}
    </div><aside className="wa-aside"><div className="wa-card"><div className="wa-aside-heading">HOW IT WORKS</div><ol className="wa-how"><li><ImageIcon size={19}/><span>Choose a still image or MP4 video.</span></li><li><Phone size={19}/><span>Enter the account that will publish it.</span></li><li><ShieldCheck size={19}/><span>Link the temporary device with the code.</span></li><li><Check size={19}/><span>Publish to your saved WhatsApp audience, then remove the temporary device.</span></li></ol></div><div className="wa-privacy"><ShieldCheck size={21}/><div><strong>Your status stays in your hands.</strong><p>Delivery follows WhatsApp’s saved <strong>My contacts</strong> status privacy setting. WhatsApp may include recent chats/messages in the temporary sync; the tool reads contacts only and never logs or stores chat/message content. Contact data is cleared after cleanup.</p></div></div><p className="wa-footnote">If your WhatsApp Status privacy is set to “My contacts except” or “Only share with,” the upload stops safely because this tool does not change or override those audience settings. Image and MP4 support depends on WhatsApp and Baileys.</p></aside></div>
  </section>
}
