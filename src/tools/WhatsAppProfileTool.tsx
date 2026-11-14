import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Copy, Image as ImageIcon, LoaderCircle, Phone, RefreshCw, ShieldCheck, Upload, X } from 'lucide-react'
import './WhatsAppProfileTool.css'

const API = (import.meta.env.VITE_WHATSAPP_API_URL || '').replace(/\/$/, '')
const STORAGE_KEY = 'aslns.whatsapp-profile.v2'
const terminal = new Set(['SUCCESS', 'CANCELLED', 'ERROR'])
const statuses = new Set(['STARTING', 'CODE_READY', 'LINKED', 'UPDATING', 'REMOVING_DEVICE', 'CANCELLING', 'CLEANUP_REQUIRED', ...terminal])
type Session = { sessionId: string; accessToken: string }
type Snapshot = {
  sessionId: string; status: string; pairingCode: string | null; expiresAt: string
  updated: boolean; deviceRemoved: boolean; outcome: string; error: string | null
  confirmationSent?: boolean | null
}
type Photo = { file: File; url: string; width: number; height: number }

function restore(): Session | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')
    if (saved?.api === API && /^[a-f0-9-]{36}$/.test(saved.sessionId) && /^[a-f0-9]{64}$/.test(saved.accessToken)) {
      return { sessionId: saved.sessionId, accessToken: saved.accessToken }
    }
  } catch { /* Storage can be unavailable in private browser modes. */ }
  return null
}

class RequestError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

async function request(path: string, options: RequestInit = {}, timeoutMs = 30000) {
  const response = await fetch(`${API}/api/whatsapp${path}`, {
    ...options, signal: options.signal || AbortSignal.timeout(timeoutMs), cache: 'no-store', credentials: 'omit'
  })
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new RequestError('The WhatsApp service is unavailable. Please try again later.', response.status)
  }
  const data = await response.json()
  if (!response.ok) throw new RequestError(data.error || 'The request could not be completed.', response.status)
  return data
}

function snapshot(data: Snapshot): Snapshot {
  if (!data || !statuses.has(data.status) || typeof data.sessionId !== 'string' ||
      typeof data.updated !== 'boolean' || typeof data.deviceRemoved !== 'boolean' ||
      (data.pairingCode !== null && typeof data.pairingCode !== 'string') ||
      (data.error !== null && typeof data.error !== 'string') ||
      !Number.isFinite(Date.parse(data.expiresAt))) throw new Error('The service returned an unexpected response.')
  return data
}

async function prepareUpload(file: File) {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser could not prepare the photo for upload.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    context.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    if (!blob) throw new Error('This browser could not prepare the photo for upload.')
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified })
  } finally { bitmap.close() }
}

const labels: Record<string, string> = {
  STARTING: 'Requesting your pairing code…', CODE_READY: 'Enter this code in WhatsApp',
  LINKED: 'Linked successfully. Preparing your update…', UPDATING: 'Updating your profile picture…',
  REMOVING_DEVICE: 'Removing the temporary linked device…', CANCELLING: 'Closing your session…',
  CLEANUP_REQUIRED: 'Device removal needs attention', SUCCESS: 'Profile picture updated',
  CANCELLED: 'Session closed', ERROR: 'The update could not be completed'
}

export default function WhatsAppProfileTool() {
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [session, setSession] = useState<Session | null>(restore)
  const [state, setState] = useState<Snapshot | null>(null)
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const [pollError, setPollError] = useState('')
  const [missing, setMissing] = useState(false)
  const [copied, setCopied] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const selection = useRef(0)
  const submitting = useRef(false)
  const active = !!session && !terminal.has(state?.status || '')
  const locked = busy || !!session
  const number = phone.trim().replace(/[+\s()-]/g, '')
  const validPhone = /^[1-9][0-9]{7,14}$/.test(number)
  const success = state?.status === 'SUCCESS' && state.updated && state.deviceRemoved
  const code = state?.pairingCode?.replace(/[^A-Za-z0-9]/g, '') || ''

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url) }, [photo])
  useEffect(() => () => { selection.current++ }, [])
  useEffect(() => {
    if (!active && !busy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active, busy])

  useEffect(() => {
    if (!session) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const controller = new AbortController()
    const poll = async () => {
      try {
        const data = snapshot(await request(`/sessions/${session.sessionId}`, {
          headers: { 'X-Session-Token': session.accessToken },
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])
        }))
        if (stopped) return
        setState(data)
        setPollError('')
        if (terminal.has(data.status)) return
      } catch (cause) {
        if (stopped) return
        if (cause instanceof RequestError && cause.status === 404) {
          setMissing(true)
          setPollError(cause.message)
          return
        }
        setPollError('Connection interrupted. Checking again automatically. Keep this tab open; the update may still be running.')
      }
      if (!stopped) timer = setTimeout(poll, 2000)
    }
    void poll()
    return () => { stopped = true; clearTimeout(timer); controller.abort() }
  }, [session])

  async function choose(file?: File) {
    if (!file || locked) return
    const generation = ++selection.current
    setError('')
    setReading(false)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 20 * 1024 * 1024) {
      setError('Choose a JPG, PNG, or WebP image no larger than 20 MB.')
      return
    }
    setReading(true)
    try {
      const bitmap = await createImageBitmap(file)
      const { width, height } = bitmap
      bitmap.close()
      if (width * height > 40_000_000) throw new Error('Choose an image up to 40 megapixels.')
      if (generation !== selection.current) return
      setPhoto({ file, url: URL.createObjectURL(file), width, height })
    } catch (cause) {
      if (generation === selection.current) setError(cause instanceof Error ? cause.message : 'This image could not be opened.')
    } finally { if (generation === selection.current) setReading(false) }
  }

  async function start() {
    if (submitting.current || session || !photo || !validPhone || !consent) return
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const health = await request('/health')
      if (health.version !== 2 || health.available !== true) throw new Error('The WhatsApp tool is temporarily unavailable. Please try again later.')
      const upload = await prepareUpload(photo.file)
      const form = new FormData()
      form.append('image', upload)
      form.append('phoneNumber', number)
      form.append('consent', 'true')
      const data = await request('/sessions', { method: 'POST', body: form }, 5 * 60 * 1000)
      const current = snapshot(data)
      if (!/^[a-f0-9]{64}$/.test(data.accessToken)) throw new Error('The service could not create a secure session.')
      const credentials = { sessionId: current.sessionId, accessToken: data.accessToken }
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...credentials, api: API })) } catch { /* Keep credentials in memory. */ }
      setState(current)
      setSession(credentials)
    } catch (cause) {
      setError(cause instanceof RequestError || (cause instanceof Error && cause.name === 'Error')
        ? cause.message
        : cause instanceof Error && cause.name === 'TimeoutError'
          ? 'The photo upload took too long. Check your connection and try again.'
          : 'Could not send the photo to the WhatsApp service. Check your connection and try again.')
    } finally { submitting.current = false; setBusy(false) }
  }

  async function cancel() {
    if (!session || submitting.current) return
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      setState(snapshot(await request(`/sessions/${session.sessionId}`, { method: 'DELETE', headers: { 'X-Session-Token': session.accessToken } })))
    } catch (cause) {
      setError(cause instanceof RequestError ? cause.message : 'Could not confirm cleanup. Try again, or remove this device in WhatsApp → Linked devices.')
    } finally { submitting.current = false; setBusy(false) }
  }

  function reset() {
    if (active && !missing) return
    try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* No stored credentials. */ }
    setSession(null); setState(null); setPhoto(null); setPhone(''); setConsent(false)
    setError(''); setPollError(''); setMissing(false); setCopied('')
  }

  async function copyCode() {
    try { await navigator.clipboard.writeText(code); setCopied(code) }
    catch { setError('Could not copy the code. Select it and copy it manually.') }
  }

  return <section className="wa-tool" aria-label="WhatsApp profile picture updater">
    <div className="wa-intro"><span className="wa-badge"><ImageIcon size={14} aria-hidden="true"/> THE WHOLE PICTURE</span>
      <h3>Your photo.<br/><em>Without the crop.</em></h3>
      <p>Portrait, landscape, or square. Choose your photo, link WhatsApp, and let the tool handle the update.</p>
    </div>
    <div className="wa-layout"><div className="wa-main">
      <section className="wa-card"><h4><span className="wa-step">1</span> Choose your photo <span className="wa-step-note">ANY ASPECT RATIO</span></h4>
        <input ref={input} className="wa-file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photo" disabled={locked || reading}
          onChange={event => { void choose(event.target.files?.[0]); event.target.value = '' }}/>
        <button type="button" className={`wa-drop ${photo ? 'wa-has-photo' : ''}`} disabled={locked || reading} onClick={() => input.current?.click()}
          onDragOver={event => { event.preventDefault() }} onDrop={event => { event.preventDefault(); if (!locked) void choose(event.dataTransfer.files[0]) }}
          aria-label={photo ? 'Change profile photo' : 'Upload profile photo'}>
          {photo ? <img src={photo.url} alt="Full photo preview — no crop"/> : <><span className="wa-upload-icon"><Upload size={26} aria-hidden="true"/></span><strong>{reading ? 'Opening your photo…' : session ? 'Your photo is in this session' : 'Choose an image'}</strong><span>{session ? 'Checking the update below' : 'Drop it here or browse your files'}</span><small>JPG, PNG, WebP · up to 20 MB</small></>}
        </button>
        {photo && <div className="wa-photo-meta"><div><strong title={photo.file.name}>{photo.file.name}</strong><span>{photo.width} × {photo.height} · {(photo.file.size / 1024 / 1024).toFixed(1)} MB · Full image</span></div>
          {!locked && <button type="button" className="wa-text-button" disabled={reading} onClick={() => input.current?.click()}>Change photo</button>}</div>}
      </section>
      <section className="wa-card"><h4><span className="wa-step">2</span> Your WhatsApp number</h4>
        <label className="wa-phone-label" htmlFor="wa-phone">Include your country code</label>
        <div className="wa-phone"><Phone size={18} aria-hidden="true"/><input id="wa-phone" type="tel" autoComplete="tel" placeholder="e.g. +91 98765 43210" value={phone} disabled={locked} onChange={event => setPhone(event.target.value)} aria-describedby="wa-phone-hint"/></div>
        <p id="wa-phone-hint" className="wa-small">Use the number for the account whose profile photo you want to update.</p>
      </section>
      {!session && <><label className="wa-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)}/><span>This is my WhatsApp account. I agree to temporarily link this tool, update my profile photo, and automatically remove the linked device afterward.</span></label>
        <button type="button" className="wa-primary" disabled={!photo || !validPhone || !consent || busy || reading} onClick={() => { void start() }}>{busy ? <LoaderCircle className="wa-spin" size={18} aria-hidden="true"/> : <ArrowRight size={18} aria-hidden="true"/>}{busy ? 'Preparing and uploading photo…' : 'Update profile picture'}</button></>}
      {session && <section className={`wa-status ${success ? 'wa-success' : ''}`} aria-label="Update progress">
        <div className="wa-status-title" role="status">{success ? <Check size={20} aria-hidden="true"/> : active && state?.status !== 'CLEANUP_REQUIRED' && !missing ? <LoaderCircle className="wa-spin" size={18} aria-hidden="true"/> : <ShieldCheck size={19} aria-hidden="true"/>}
          <strong>{missing ? 'Session unavailable' : state ? labels[state.status] : 'Restoring your session…'}</strong></div>
        {code && state?.status === 'CODE_READY' && <><span className="wa-badge wa-code-brand">✦ AMSOULNESS · SECURE PAIRING</span><div className="wa-code" aria-label={`Pairing code ${code}`}>{code}</div><p className="wa-small wa-code-hint">Enter these 8 characters exactly. Do not add a dash, spaces, or punctuation. You can use Copy code.</p>
          <button className="wa-secondary" type="button" onClick={() => { void copyCode() }}><Copy size={15} aria-hidden="true"/>{copied === code ? 'Code copied' : 'Copy code'}</button>
          <ol className="wa-instructions"><li>Open WhatsApp on your phone.</li><li>Go to <strong>Settings → Linked devices → Link a device</strong>.</li><li>Tap <strong>Link with phone number instead</strong> and enter the code.</li></ol><p className="wa-small">Keep this tab open. The photo updates automatically after linking. Never share your pairing code.</p></>}
        {state?.status === 'STARTING' && <p className="wa-small">Preparing a temporary connection. Your pairing code will appear here.</p>}
        {success && <><p className="wa-small">The profile update and removal of the temporary linked device are confirmed.</p>{state.confirmationSent === true && <p className="wa-small">A thank-you message and website link were sent to this WhatsApp account.</p>}{state.confirmationSent === false && <p className="wa-small">Your photo was updated, but WhatsApp could not send the thank-you message.</p>}</>}
        {state?.status === 'CANCELLED' && <p className="wa-small">This session has been closed. You can choose another photo when you are ready.</p>}
        {state?.error && !success && <p className="wa-status-error">{state.error}</p>}
        {pollError && <p className="wa-status-error" role="status">{pollError}</p>}
        {active && !missing && <button type="button" className="wa-secondary" disabled={busy || ['UPDATING', 'REMOVING_DEVICE', 'CANCELLING'].includes(state?.status || '')} onClick={() => { void cancel() }}><X size={15} aria-hidden="true"/>{state?.status === 'CLEANUP_REQUIRED' ? 'Retry device removal' : 'Cancel and close session'}</button>}
        {(!active || missing) && <button type="button" className="wa-secondary" onClick={reset}><RefreshCw size={15} aria-hidden="true"/>{missing ? 'Clear this session' : 'Start over'}</button>}
      </section>}
      {error && <p className="wa-error" role="alert">{error}</p>}
    </div><aside className="wa-aside"><div className="wa-card"><div className="wa-aside-heading">HOW IT WORKS</div><ol className="wa-how"><li><ImageIcon size={19} aria-hidden="true"/><span>Select a photo in any aspect ratio.</span></li><li><Phone size={19} aria-hidden="true"/><span>Enter your number to receive a pairing code.</span></li><li><ShieldCheck size={19} aria-hidden="true"/><span>Link the temporary device in WhatsApp settings.</span></li><li><Check size={19} aria-hidden="true"/><span>Wait for the update and device-removal confirmation.</span></li></ol></div>
      <div className="wa-privacy"><ShieldCheck size={21} aria-hidden="true"/><div><strong>A temporary connection.</strong><p>Your photo is uploaded only when you start. The tool never reads your messages or contacts. After a successful update, it sends one thank-you message with the website link to the same WhatsApp account. Session data is removed after cleanup.</p></div></div>
      <p className="wa-footnote">The full image is sent without cropping or stretching. Images are resized and encoded as JPEG for WhatsApp; transparent areas become white. WhatsApp controls the final display, including circular thumbnails.</p>
    </aside></div>
  </section>
}
