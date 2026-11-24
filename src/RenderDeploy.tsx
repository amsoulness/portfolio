import { DoomsdayChapter } from './DoomsdaySeason'
import ConnectionGraphic from './ConnectionGraphic'
import useSessionMotion from './useSessionMotion'
import { useEffect, useRef, useState } from 'react'
import { Check, CheckCircle2, Code, Database, Eye, EyeOff, LoaderCircle, LockKeyhole, Server } from 'lucide-react'
import ThemeToggle, { type SiteTheme, type ThemePreference } from './ThemeToggle'
import './SessionPage.css'
import './RenderDeploy.css'

const API = import.meta.env.VITE_ASLNS_API_URL || 'https://aslns-pairing-production.up.railway.app'
type Job = { phase: string; login?: string; error?: string; steps?: { message: string; at: string }[]; repoUrl?: string; dashboardUrl?: string; databaseDashboard?: string; serviceUrl?: string; deploymentStatus?: string }
type Props = { theme: SiteTheme; themePreference: ThemePreference; onToggleTheme: () => void }
export default function RenderDeploy({ theme, themePreference, onToggleTheme }: Props) {
  useSessionMotion()
  const [oauth, setOauth] = useState<boolean | null>(null)
  const [githubToken, setGithubToken] = useState(''), [renderKey, setRenderKey] = useState('')
  const [login, setLogin] = useState(''), [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([])
  const [ownerId, setOwnerId] = useState(''), [name, setName] = useState(() => `aslns-bot-${Math.random().toString(36).slice(2, 6)}`)
  const [session, setSession] = useState(''), [sudo, setSudo] = useState(''), [region, setRegion] = useState('singapore')
  const [useExisting, setUseExisting] = useState(false), [databaseUrl, setDatabaseUrl] = useState('')
  const [showSession, setShowSession] = useState(false), [confirmed, setConfirmed] = useState(false), [permission, setPermission] = useState(false)
  const [step, setStep] = useState(0), [busy, setBusy] = useState(''), [error, setError] = useState(''), [job, setJob] = useState<Job | null>(null)
  const connection = useRef<string | null>(null), pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), mounted = useRef(true)

  async function request(path: string, method = 'GET', data?: unknown) {
    const response = await fetch(API + path, { method, signal: AbortSignal.timeout(30000), headers: { 'Content-Type': 'application/json', ...(connection.current ? { Authorization: `Bearer ${connection.current}` } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'The deployer could not complete this request.')
    return result
  }
  useEffect(() => {
    mounted.current = true
    const title = document.title; document.title = 'ASLNS | WEBSITE'
    void fetch(API + '/api/render/config').then(r => r.json()).then(d => { if (mounted.current) setOauth(Boolean(d.githubOAuthAvailable)) }).catch(() => { if (mounted.current) setOauth(false) })
    const ticket = new URLSearchParams(window.location.hash.slice(1)).get('ticket')
    if (ticket) {
      window.history.replaceState({}, '', window.location.pathname)
      setBusy('github')
      void request('/api/render/ticket', 'POST', { ticket }).then(d => { if (!mounted.current) return; connection.current = d.id; setLogin(d.login); setStep(1) }).catch(e => { if (mounted.current) setError(e.message) }).finally(() => { if (mounted.current) setBusy('') })
    }
    return () => { mounted.current = false; clearTimeout(pollTimer.current); document.title = title }
  }, [])
  async function connect() {
    if (!permission) return
    setBusy('github'); setError('')
    try { const d = await request('/api/render/connect', 'POST', { token: githubToken }); connection.current = d.id; setGithubToken(''); setLogin(d.login); setStep(1) }
    catch (e) { setError(e instanceof Error ? e.message : 'GitHub connection failed.') }
    finally { setBusy('') }
  }
  async function verifyRender() {
    setBusy('render'); setError('')
    try { const d = await request('/api/render/workspaces', 'POST', { apiKey: renderKey }); setWorkspaces(d.workspaces); setOwnerId(d.workspaces[0]?.id || ''); setRenderKey('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Render connection failed.') }
    finally { setBusy('') }
  }
  async function launch() {
    if (!confirmed || busy) return
    setBusy('launch'); setError('')
    try {
      const d: Job = await request('/api/render/deploy', 'POST', { confirm: true, name, session: session.trim(), sudo: sudo.replace(/[\s()+-]/g, ''), ownerId, region, existingDatabaseUrl: useExisting ? databaseUrl.trim() : '' })
      setSession(''); setDatabaseUrl(''); setJob(d); setStep(2)
      const poll = async () => {
        try {
          const current: Job = await request('/api/render/status')
          if (!mounted.current) return
          setJob(current)
          if (current.phase === 'live') { setStep(3); return }
          if (current.phase === 'error') return
          pollTimer.current = setTimeout(() => void poll(), 3000)
        } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Status unavailable. Use the Render dashboard links below.') }
      }
      void poll()
    } catch (e) { setError(e instanceof Error ? e.message : 'Deployment could not start.') }
    finally { setBusy('') }
  }
  async function disconnect() {
    clearTimeout(pollTimer.current)
    try { await request('/api/render/connection', 'DELETE') } catch { /* expires automatically */ }
    connection.current = null; setLogin(''); setWorkspaces([]); setRenderKey(''); setGithubToken(''); setStep(0); setError(''); setJob(null); setConfirmed(false); setPermission(false)
  }
  const stages = ['GitHub', 'Configure', 'Deploy', 'Done']
  return <div className="as-session as-render-page" data-theme={theme}><div className="as-session-glow" aria-hidden="true"/><header className="as-session-nav"><a className="as-session-brand" href="/session"><span className="as-session-monogram">A<span>·</span></span><span>AMSOULNESS<small>ASLNS / RENDER DEPLOYER</small></span></a><nav aria-label="Render navigation"><a href="/session/deploy">Other hosts</a><ThemeToggle theme={theme} preference={themePreference} onToggle={onToggleTheme}/></nav></header>
    <main className="as-render-main"><DoomsdayChapter number="04" title="Launch sequence." detail="RENDER / GUIDED DEPLOYMENT"/><div className="as-render-heading"><span className="as-session-eyebrow"><Server size={16}/> YOUR BOT, ON RENDER</span><h1>Deploy on <span className="creative-type-accent">Render.</span></h1><p>Connect GitHub. Configure your bot. Watch it go live.</p></div><ConnectionGraphic/><ol className="as-render-stages" aria-label="Deployment progress">{stages.map((stage, i) => <li key={stage} aria-current={step === i ? 'step' : undefined} className={step > i ? 'complete' : ''}><span>{step > i ? <Check size={16}/> : i + 1}</span><strong>{stage}</strong><small>{step > i ? 'Complete' : step === i ? 'Current step' : 'Upcoming'}</small></li>)}</ol>
      <section key={step} className="as-render-card" aria-label={stages[step]}><span className="as-session-eyebrow">STEP {step + 1} OF 4</span>
        {step === 0 && <><h2>Connect GitHub</h2><p>We’ll create a small public deployment repository in your account when you approve deployment. It contains a Dockerfile for Amsoulness, never your session or API keys.</p><div className="as-render-assurances"><div><Code size={20}/><strong>Your own repository</strong><span>A new deployment wrapper, with no changes to your existing repos.</span></div><div><LockKeyhole size={20}/><strong>Temporary credentials</strong><span>Tokens stay in server memory, expire automatically, and are cleared when deployment finishes.</span></div></div>
          {oauth && <a className="as-session-primary" href={`${API}/api/render/oauth/start?origin=${encodeURIComponent(window.location.origin)}`}>Continue with GitHub</a>}
          {oauth === false && <p className="as-render-notice">One-click GitHub sign-in is awaiting site configuration. You can use a temporary GitHub token to run the full deployment workflow now.</p>}
          <details open={oauth === false}><summary>{oauth ? 'Use a temporary GitHub token instead' : 'Connect with a GitHub token'}</summary><form onSubmit={e => { e.preventDefault(); void connect() }}><label htmlFor="rd-github">GitHub token</label><input id="rd-github" type="password" value={githubToken} onChange={e => setGithubToken(e.target.value)} autoComplete="off" spellCheck={false} required placeholder="ghp_…"/><p className="as-render-help">Use a short-lived classic token with only <code>public_repo</code>. That permission can write your public repositories; this wizard only creates the deployment repository you approve. <a href="https://github.com/settings/tokens/new?description=Amsoulness%20Render%20deployment&scopes=public_repo" target="_blank" rel="noreferrer">Create a token on GitHub</a>.</p><label className="as-session-consent"><input type="checkbox" checked={permission} onChange={e => setPermission(e.target.checked)}/><span>I authorize Amsoulness to use this token to verify my GitHub account and create my public deployment repository.</span></label><button className="as-session-primary" disabled={!permission || !githubToken || !!busy}>{busy === 'github' ? <LoaderCircle size={18} className="as-session-spinner"/> : <Code size={18}/>}Connect GitHub</button></form></details></>}
        {step === 1 && <><div className="as-render-connected"><CheckCircle2 size={18}/> Connected as @{login}<button onClick={() => void disconnect()}>Disconnect</button></div><h2>Configure your bot</h2><p>Add your Render key, choose a workspace and enter your bot settings. Credentials are sent over HTTPS and are never added to GitHub.</p><div className="as-render-key"><label htmlFor="rd-render">Render API key</label><div className="as-render-key-row"><input id="rd-render" type="password" autoComplete="off" spellCheck={false} value={renderKey} onChange={e => setRenderKey(e.target.value)} placeholder={workspaces.length ? 'Render connected — key cleared from this form' : 'rnd_…'}/><button className="as-deploy-secondary" disabled={!renderKey || !!busy} onClick={() => void verifyRender()}>{busy === 'render' ? 'Checking…' : workspaces.length ? 'Reconnect' : 'Connect Render'}</button></div><p className="as-render-help"><a href="https://dashboard.render.com/u/settings#api-keys" target="_blank" rel="noreferrer">Get a Render API key</a>. This key allows resource creation in your Render workspaces.</p></div>
          <form onSubmit={e => { e.preventDefault(); void launch() }}><div className="as-render-fields"><div><label htmlFor="rd-owner">Render workspace</label><select id="rd-owner" disabled={!workspaces.length} value={ownerId} onChange={e => setOwnerId(e.target.value)} required><option value="">Connect Render first</option>{workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div><div><label htmlFor="rd-region">Region</label><select id="rd-region" value={region} onChange={e => setRegion(e.target.value)}>{[['singapore', 'Singapore'], ['oregon', 'Oregon'], ['ohio', 'Ohio'], ['virginia', 'Virginia'], ['frankfurt', 'Frankfurt']].map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></div><div><label htmlFor="rd-name">Bot name on Render</label><input id="rd-name" value={name} onChange={e => setName(e.target.value.toLowerCase())} required minLength={3} maxLength={40} pattern="[a-z][a-z0-9\-]{1,38}[a-z0-9]"/><p className="as-render-help">Repository: {login}/{name}-deploy</p></div><div><label htmlFor="rd-sudo">Owner WhatsApp number</label><input id="rd-sudo" type="tel" inputMode="tel" value={sudo} onChange={e => setSudo(e.target.value)} required placeholder="Country code + number"/></div></div><label htmlFor="rd-session">Your session string</label><div className="as-render-session-input"><input id="rd-session" type={showSession ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={session} onChange={e => setSession(e.target.value)} required placeholder="ASLNS~…"/><button type="button" aria-label={showSession ? 'Hide session' : 'Show session'} onClick={() => setShowSession(!showSession)}>{showSession ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div><p className="as-render-help"><a href="/session" target="_blank" rel="noreferrer">Generate a session</a>, then paste the complete value here.</p>
          <label className="as-render-existing"><input type="checkbox" checked={useExisting} onChange={e => setUseExisting(e.target.checked)}/>Use an existing PostgreSQL database</label>{useExisting && <><label htmlFor="rd-database">PostgreSQL connection URL</label><input id="rd-database" type="password" autoComplete="off" spellCheck={false} value={databaseUrl} onChange={e => setDatabaseUrl(e.target.value)} required placeholder="postgresql://…"/></>}
          <div className="as-render-review"><strong>What this deployment creates</strong><ul><li>A public GitHub repository: <code>{name}-deploy</code></li><li>{useExisting ? 'Uses the PostgreSQL URL you provide' : 'A free Render PostgreSQL database'}</li><li>A free Render web service with private bot settings</li></ul><p>Free Render databases expire after 30 days. Free web services can sleep. If a free resource is unavailable, deployment stops; no paid plan is substituted.</p></div><label className="as-session-consent"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/><span>I authorize this repository and these Render resources to be created using my credentials, and my WhatsApp session to be set as a private Render environment variable.</span></label><button className="as-session-primary" disabled={!confirmed || !workspaces.length || !!busy}>{busy === 'launch' ? 'Starting deployment…' : 'Create and deploy my bot'}</button></form></>}
        {step === 2 && <><h2>{job?.phase === 'error' ? 'Deployment needs attention' : 'Building your Amsoulness bot'}</h2><p>{job?.phase === 'error' ? 'Use the resource links below to inspect anything already created. Nothing is deleted automatically.' : 'Keep this page open to follow progress. Your repository, database and service are created in your own accounts.'}</p><ol className="as-render-log">{job?.steps?.map((s, i) => <li key={`${s.at}-${i}`}><Check size={15}/><span>{s.message}</span></li>)}</ol>{job?.phase !== 'error' && <div className="as-render-working"><LoaderCircle className="as-session-spinner" size={22}/><span>{job?.deploymentStatus ? `Render status: ${job.deploymentStatus.replaceAll('_', ' ')}` : 'Waiting for Render…'}</span></div>}{job?.error && <p className="as-session-error" role="alert">{job.error}</p>}{job?.phase === 'error' && <button className="as-deploy-secondary" onClick={() => void disconnect()}>Clear connection and start again</button>}</>}
        {step === 3 && <div className="as-render-done"><CheckCircle2 size={48}/><h2>Your bot is live.</h2><p>Render reports a live deployment. Open WhatsApp and send <code>.ping</code> or <code>.list</code> from your owner account to check your bot.</p><p className="as-render-help">GitHub and Render credentials have been cleared from deployer memory.</p></div>}
        {(job?.repoUrl || job?.dashboardUrl || job?.databaseDashboard) && <div className="as-render-resources">{job.repoUrl && <a href={job.repoUrl} target="_blank" rel="noreferrer"><Code size={18}/>GitHub repository</a>}{job.databaseDashboard && <a href={job.databaseDashboard} target="_blank" rel="noreferrer"><Database size={18}/>Database dashboard</a>}{job.dashboardUrl && <a href={job.dashboardUrl} target="_blank" rel="noreferrer"><Server size={18}/>Service & build logs</a>}</div>}
        {error && <p className="as-session-error" role="alert">{error}</p>}
      </section><p className="as-render-bottom"><LockKeyhole size={14}/> Tokens are kept only in server memory and expire automatically. Never share API keys or sessions in public.</p><footer className="as-render-footer"><a href="/session/deploy">Other hosting options</a><a href="https://github.com/amsoulness/amsoulness-md" target="_blank" rel="noreferrer">Amsoulness source</a></footer>
    </main></div>
}
