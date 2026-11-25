import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Heart, KeyRound, LockKeyhole, Music2, Play, RotateCcw, Sparkles } from 'lucide-react'
import type { SiteTheme } from './ThemeToggle'
import PrivateAsciiMotif from './PrivateAsciiMotif'
import './PrivatePage.css'

type PrivateContent = { firstDate: string; callDate: string; videoDate: string; secondDate: string; thirdDate: string; openingMemory: string; callMemory: string; videoMemory: string; firstMemory: string; secondMemory: string; note: string; ending: string }
type PrivateDetails = {
  her: { name: string; caption: string; alt: string; eyebrow: string; intro: string; hobbies: string[] }
  me: { name: string; caption: string; alt: string; eyebrow: string; intro: string; hobbies: string[] }
  moments: { eyebrow: string; title: string; body: string }[]
}

export default function PrivatePage({ theme, smoothMode }: { theme: SiteTheme; smoothMode: boolean }) {
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [gateMood, setGateMood] = useState<'idle' | 'opening' | 'rejected'>('idle')
  const [hugs, setHugs] = useState(0)
  const [entrySequence, setEntrySequence] = useState(false)
  const [content, setContent] = useState<PrivateContent | null>(null)
  const [details, setDetails] = useState<PrivateDetails | null>(null)
  const contentRootRef = useRef<HTMLDivElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicBlocked, setMusicBlocked] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    document.title = unlocked ? 'A Little Space for You | AMSOULNESS' : 'Sealed | AMSOULNESS'
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'A secured page.')
    return () => {
      document.title = 'AMSOULNESS | Emmanuel Cherian'
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'The portfolio and creative lab of Emmanuel Cherian: software projects, cinematic edits, and free browser-based tools from AMSOULNESS / ASLNS.')
    }
  }, [unlocked])

  useEffect(() => {
    if (!unlocked || !contentRootRef.current) return
    const targets = contentRootRef.current.querySelectorAll<HTMLElement>('.private-hero, .private-section, .private-finale')
    if (!('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('private-reveal-visible')
          observer.unobserve(entry.target)
        }
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -7% 0px' })
    targets.forEach(target => { target.classList.add('private-reveal-ready'); observer.observe(target) })
    return () => observer.disconnect()
  }, [unlocked])

  useEffect(() => {
    // Start every page load behind the gate and invalidate any previous browser session.
    fetch('/api/private-page-lock', { method: 'POST', cache: 'no-store', credentials: 'same-origin' }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!unlocked || !audioRef.current) return
    const audio = audioRef.current
    audio.volume = 0.36
    audio.play().then(() => { setMusicPlaying(true); setMusicBlocked(false) }).catch(() => { setMusicPlaying(false); setMusicBlocked(true) })
    return () => audio.pause()
  }, [unlocked])

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setGateMood('opening')
    setError('')
    try {
      const response = await fetch('/api/private-page-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ password }) })
      const result = await response.json() as { authenticated?: boolean; error?: string }
      if (response.ok && result.authenticated) {
        const pageResponse = await fetch('/api/private-page-content', { cache: 'no-store', credentials: 'same-origin' })
        if (!pageResponse.ok) throw new Error('Your letter couldn’t be opened. Please try again.')
        const page = await pageResponse.json() as { content: PrivateContent; details: PrivateDetails }
        await new Promise(resolve => window.setTimeout(resolve, 850))
        setContent(page.content)
        setDetails(page.details)
        setEntrySequence(true)
        setUnlocked(true)
        setPassword('')
        window.setTimeout(() => setEntrySequence(false), 1500)
      } else {
        setGateMood('rejected')
        setError(response.status === 401 ? 'The key didn’t turn. Take a breath and try again.' : result.error || 'The door stayed closed this time. Please try again.')
      }
    } catch (cause) {
      setGateMood('rejected')
      setError(cause instanceof Error ? cause.message : 'Couldn’t reach the lock just now. Check your connection and try again.')
    } finally { setBusy(false); setGateMood(current => current === 'opening' ? 'idle' : current) }
  }

  async function toggleMusic() {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) { audio.pause(); setMusicPlaying(false); return }
    try { await audio.play(); setMusicPlaying(true); setMusicBlocked(false) }
    catch { setMusicBlocked(true) }
  }

  return <main className={`private-page ${unlocked ? 'private-page-unlocked' : ''} ${theme === 'light' ? 'private-page-light' : ''} ${smoothMode ? '' : 'private-page-still'}`}>
    <div className="private-sky" aria-hidden="true"><span/><span/><span/><span/><span/><span/><i/><i/><i/></div>
    <div className="private-lock-fx" aria-hidden="true"><span>♡</span><span>✦</span><span>✧</span><span>♥</span></div>
    {unlocked && <div className="private-romance-particles" aria-hidden="true"><span>🌹</span><span>✦</span><span>🌼</span><span>♡</span><span>✧</span><span>🌹</span><span>🦋</span><span>♥</span><span>🌼</span><span>✦</span><span>🌹</span><span>♡</span><span>🌼</span><span>✧</span><span>♥</span><span>🌹</span><span>🦋</span><span>🌼</span></div>}
    {unlocked && <div className="private-privacy-mark" aria-hidden="true">{Array.from({length: 9}, (_, index) => <span key={index}>ONLY OUR LITTLE WORLD · VAISHU + EMMU</span>)}</div>}
    <header className="private-nav">
      <a href="/" className="private-brand">AMSOUL<span>NESS.</span></a>
      <a className="private-back" href="/"><ArrowLeft size={16}/> BACK TO PORTFOLIO</a>
    </header>

    {!unlocked ? <section className={`private-gate gate-${gateMood}`} aria-labelledby="private-title" aria-busy={busy}>
      <div className="private-gate-cinema" aria-hidden="true"><span className="private-cinema-halo"/><span className="private-cinema-sweep"/><i/><i/><b/></div>
      <div className="private-seal" aria-hidden="true"><i/><i/><b><LockKeyhole size={19}/></b><span>ONLY THE RIGHT KEY</span></div>
      <p className="private-eyebrow"><Sparkles size={14}/> A PRIVATE INVITATION</p>
      <h1 id="private-title">You’re invited<br/><em>to step inside.</em></h1>
      <p className="private-intro">A quiet little place is waiting to be discovered. Enter your key whenever you’re ready.</p>
      <form className="private-form" onSubmit={unlock}>
        <label htmlFor="private-password">YOUR KEY</label>
        <input ref={passwordInputRef} id="private-password" type="password" autoComplete="current-password" value={password} onChange={event => { setPassword(event.target.value); setError(''); setGateMood('idle') }} placeholder="Enter the secret key" required disabled={busy}/>
        <button type="submit" disabled={busy || !password}><span className="private-open-spark" aria-hidden="true"/><LockKeyhole size={15}/>{busy ? 'OPENING YOUR INVITATION…' : 'ACCEPT INVITATION'}</button>
      </form>
      <div className="private-gate-status" role="status" aria-live="polite">{busy && <><span aria-hidden="true"/><span>THE SEAL IS TURNING · YOUR LITTLE WORLD IS OPENING</span></>}</div>
      {error && <div className="private-error-popup" role="alert" aria-live="assertive">
        <span className="private-error-icon" aria-hidden="true"><KeyRound size={17}/></span>
        <div className="private-error-copy"><strong>THE SEAL STAYS CLOSED</strong><p>{error}</p></div>
        <button className="private-error-retry" type="button" onClick={() => { setError(''); setGateMood('idle'); passwordInputRef.current?.focus() }} aria-label="Try entering the key again"><RotateCcw size={15}/></button>
      </div>}
      <p className="private-footnote"><span/>NO CLUES. NO PREVIEW. JUST THE KEY.</p>
    </section> : <div className={`private-content ${entrySequence ? 'private-content-entering' : ''}`} ref={contentRootRef}>
      <section className="private-hero" aria-labelledby="letter-title">
        <p className="private-eyebrow"><Sparkles size={14}/> A LITTLE UNIVERSE OF OUR OWN</p>
        <p className="private-hero-index">EST. 13 · 09 · 2026 <span>✦</span> STILL MY FAVORITE STORY</p>
        <h1 id="letter-title">For my<br/><em>favorite person.</em></h1>
        <p className="private-hero-copy">Somewhere between a hello and a thousand little moments,<br className="private-desktop-break"/> you became my favorite place to be.</p>
        <a href="#our-story" className="private-scroll-cue"><span/>SCROLL INTO OUR STORY</a>
        <div className="private-hero-orbit" aria-hidden="true"><i/><i/><b>♥</b></div>
      </section>

      <section className="private-section private-portraits-section" aria-label="Our portraits">
        <div className="private-section-heading"><span>01 / THE TWO OF US</span><i/></div>
        <h2>A favorite view.<br/><em>My favorite people.</em></h2>
        <div className="private-portraits">
          <figure><div className="private-portrait-frame"><img src="/api/private-photo?photo=her" alt={details?.her.alt ?? 'A favorite portrait'} loading="lazy" decoding="async"/></div><figcaption><span>{details?.her.name}</span><small>{details?.her.caption}</small></figcaption></figure>
          <figure><div className="private-portrait-frame"><img src="/api/private-photo?photo=me" alt={details?.me.alt ?? 'A favorite portrait'} loading="lazy" decoding="async"/></div><figcaption><span>{details?.me.name}</span><small>{details?.me.caption}</small></figcaption></figure>
        </div>
      </section>

      <section className="private-section private-hobbies-section" aria-label="A little about Vaishu and Emmu">
        <div className="private-section-heading"><span>02 / LITTLE THINGS THAT FEEL LIKE US</span><i/></div>
        <h2>Two different worlds.<br/><em>A few things in common.</em></h2>
        <div className="private-hobbies-grid">
          <article className="private-hobby-card private-hobby-vaishu">
            <span className="private-card-index">{details?.her.eyebrow}</span><h3>{details?.her.name}</h3><p>{details?.her.intro}</p>
            <ul>{details?.her.hobbies.map(hobby => <li key={hobby}>{hobby}</li>)}</ul>
          </article>
          <article className="private-hobby-card private-hobby-emmu">
            <span className="private-card-index">{details?.me.eyebrow}</span><h3>{details?.me.name}</h3><p>{details?.me.intro}</p>
            <ul>{details?.me.hobbies.map(hobby => <li key={hobby}>{hobby}</li>)}</ul>
          </article>
        </div>
      </section>

      <section className="private-section private-little-moments" aria-label="Little things that make us smile">
        <div className="private-section-heading"><span>03 / THE LITTLE THINGS WE KEEP</span><i/></div>
        <h2>Small moments.<br/><em>Big feelings.</em></h2>
        <div className="private-moments-grid">
          <article className="private-moment-card">
            <span className="private-moment-mark" aria-hidden="true">01</span>
            <span className="private-moment-overline">{details?.moments[0]?.eyebrow}</span>
            <h3>{details?.moments[0]?.title}</h3>
            <p>{details?.moments[0]?.body}</p>
          </article>
          <article className="private-moment-card">
            <span className="private-moment-mark" aria-hidden="true">02</span>
            <span className="private-moment-overline">{details?.moments[1]?.eyebrow}</span>
            <h3>{details?.moments[1]?.title}</h3>
            <p>{details?.moments[1]?.body}</p>
          </article>
          <article className="private-moment-card">
            <span className="private-moment-mark" aria-hidden="true">03</span>
            <span className="private-moment-overline">{details?.moments[2]?.eyebrow}</span>
            <h3>{details?.moments[2]?.title}</h3>
            <p>{details?.moments[2]?.body}</p>
          </article>
        </div>
      </section>

      <section className="private-section private-keepsake-section" aria-label="Little keepsakes">
        <div className="private-section-heading"><span>04 / LITTLE THINGS, BIG FEELINGS</span><i/></div>
        <div className="private-keepsake-grid">
          <article className="private-keepsake-card private-ring-card"><span className="private-card-index">A PROMISE IN LIGHT</span><div className="private-motif-art motif-ring-art"><PrivateAsciiMotif motif="ring" label="An original animated ASCII diamond ring"/></div><h3>WILL YOU <em>stay close?</em></h3><p>For all the tiny tomorrows we still get to share.</p></article>
          <article className="private-keepsake-card private-bloom-card"><span className="private-card-index">TWO LITTLE BLOOMS</span><div className="private-garden-flowers"><figure className="private-garden-flower private-garden-rose"><PrivateAsciiMotif motif="rose" label="ASLNS animated ASCII rose"/><figcaption>A rose for me</figcaption></figure><figure className="private-garden-flower private-garden-daisy"><PrivateAsciiMotif motif="daisy" label="ASLNS animated ASCII daisy"/><figcaption>A daisy for you</figcaption></figure></div><h3>Growing <em>side by side.</em></h3></article>
          <article className="private-keepsake-card private-cat-card"><span className="private-card-index">YOUR TINY GUARD</span><div className="private-motif-art motif-cat-art"><PrivateAsciiMotif motif="cat" label="An original animated ASCII cat knight"/></div><h3>Brave little <em>protector.</em></h3><p>On duty for every rose, daisy, and stolen hug.</p></article>
          <article className="private-keepsake-card private-heart-card"><span className="private-card-index">A HEART, MANY WAYS</span><div className="private-motif-art motif-heart-art"><PrivateAsciiMotif motif="heart" label="A rotating ASCII heart formed from I love you in 114 languages"/></div><h3>I love <em>you.</em></h3><p>The same little feeling, in 114 languages.</p></article>
        </div>
      </section>

      <section className="private-section private-soundtrack-section" aria-label="Our soundtrack">
        <div className="private-section-heading"><span>05 / PRESS PLAY, STAY A LITTLE</span><i/></div>
        <div className={`private-soundtrack ${musicPlaying ? 'private-soundtrack-playing' : ''}`}>
          <audio ref={audioRef} src="/api/private-audio" loop preload="none" onPlay={() => setMusicPlaying(true)} onPause={() => setMusicPlaying(false)}/>
          <div className="private-record" aria-hidden="true"><span>♥</span></div>
          <div className="private-soundtrack-copy"><span className="private-memory-date">A LITTLE SOUNDTRACK</span><strong>Our song, in our little space.</strong><small>{musicPlaying ? 'Playing softly while you explore.' : 'The song you sent, tucked in here for us.'}</small><div className="private-viz" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i}/>)}</div></div>
          <button type="button" className={`private-music-button ${musicPlaying ? 'is-playing' : ''}`} onClick={toggleMusic} aria-pressed={musicPlaying}>{musicPlaying ? <Music2 size={16}/> : <Play size={16} fill="currentColor"/>}{musicPlaying ? 'PAUSE OUR SONG' : 'PLAY OUR SONG'}</button>
          {musicBlocked && !musicPlaying && <p className="private-music-hint">Tap play to start the music. Your browser needs a tap before it can play audio.</p>}
        </div>
      </section>

      <section className="private-section private-story-section" id="our-story" aria-label="Our story">
        <div className="private-section-heading"><span>06 / HOW OUR LITTLE STORY BEGAN</span><i/></div>
        <article className="private-note">
          <div className="private-note-top"><span>A LITTLE KEEPSAKE OF US</span><Heart size={17} fill="currentColor"/></div>
          <p className="private-note-greeting">Hey, my favorite person,</p><p>{content?.note}</p>
          <div className="private-timeline" aria-label="Our story so far">
            <div className="private-memory"><span className="private-memory-date">{content?.firstDate}</span><h3>The first hello</h3><p>We first connected on <a href="https://umingle.com/video/" target="_blank" rel="noreferrer">Umingle video chat</a> that day. That night, our first chat began on Snapchat.</p></div>
            <div className="private-memory"><span className="private-memory-date">{content?.callDate}</span><h3>Our first calls</h3><p>{content?.callMemory}</p></div>
            <div className="private-memory"><span className="private-memory-date">{content?.videoDate}</span><h3>Face to face, from afar</h3><p>{content?.videoMemory}</p></div>
            <div className="private-memory"><span className="private-memory-date">{content?.secondDate}</span><h3>We chose us</h3><p>{content?.firstMemory}</p></div>
            <div className="private-memory"><span className="private-memory-date">{content?.thirdDate}</span><h3>Our first virtual coffee date</h3><p>{content?.secondMemory}</p></div>
          </div>
          <p>{content?.ending}</p><p className="private-signoff">A hug, a kiss, and all my love <Heart size={15} fill="currentColor"/></p>
        </article>
      </section>

      <section className="private-finale" aria-label="The end of our little space">
        <div className="private-finale-glow" aria-hidden="true">♥</div><p className="private-eyebrow">ALWAYS, IN EVERY LITTLE UNIVERSE</p><h2>One more<br/><em>hug?</em></h2>
        <button className="private-hug" type="button" onClick={() => setHugs(count => count + 1)}>
          {hugs ? 'One more hug' : 'Open your hug'}
        </button>
        <p className="private-hug-note" role="status">{hugs > 0 && (hugs % 2 ? 'Until I can hug you in person, this one is yours.' : 'Stay a little longer. I like it here with you.')}</p>
        {hugs > 0 && <div key={hugs} className="private-petal-arc" aria-hidden="true">
          {['🌹','🌼','♡','🌼','🌹','♡','🌼','🌹'].map((flower, index) =>
            <span key={index} style={{ left: (9 + index * 11) + '%', animationDelay: (index % 3) * 90 + 'ms' }}>{flower}</span>)}
        </div>}
      </section>
    </div>}
    <footer className="private-footer">MADE WITH A LITTLE MAGIC <span>♥</span> AMSOULNESS</footer>
  </main>
}
