import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Heart, LockKeyhole, Music2, Play, Sparkles } from 'lucide-react'
import type { SiteTheme } from './ThemeToggle'
import './PrivatePage.css'

type PrivateContent = { firstDate: string; callDate: string; videoDate: string; secondDate: string; thirdDate: string; openingMemory: string; callMemory: string; videoMemory: string; firstMemory: string; secondMemory: string; note: string; ending: string }

export default function PrivatePage({ theme, smoothMode }: { theme: SiteTheme; smoothMode: boolean }) {
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [content, setContent] = useState<PrivateContent | null>(null)
  const [musicOpen, setMusicOpen] = useState(false)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicBlocked, setMusicBlocked] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    document.title = 'A Little Space for You | AMSOULNESS'
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'A private little corner made with love.')
    return () => {
      document.title = 'AMSOULNESS | Emmanuel Cherian'
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'The portfolio and creative lab of Emmanuel Cherian: software projects, cinematic edits, and free browser-based tools from AMSOULNESS / ASLNS.')
    }
  }, [])

  useEffect(() => {
    if (!unlocked) return
    const audio = audioRef.current
    if (!audio) return
    audio.volume = 0.36
    audio.play().then(() => {
      setMusicPlaying(true)
      setMusicBlocked(false)
      setMusicOpen(true)
    }).catch(() => {
      setMusicPlaying(false)
      setMusicBlocked(true)
      setMusicOpen(true)
    })
    return () => audio.pause()
  }, [unlocked])

  useEffect(() => {
    let active = true
    fetch('/api/private-page-content', { cache: 'no-store', credentials: 'same-origin' })
      .then(async response => response.ok ? await response.json() as { content: PrivateContent } : null)
      .then(result => { if (active && result?.content) { setContent(result.content); setUnlocked(true) } })
      .catch(() => {})
    return () => { active = false }
  }, [])

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/private-page-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ password }),
      })
      const result = await response.json() as { authenticated?: boolean; error?: string }
      if (response.ok && result.authenticated) {
        const pageResponse = await fetch('/api/private-page-content', { cache: 'no-store', credentials: 'same-origin' })
        if (!pageResponse.ok) throw new Error('Your letter couldn’t be opened. Please try again.')
        const page = await pageResponse.json() as { content: PrivateContent }
        setContent(page.content)
        setUnlocked(true)
        setPassword('')
      } else {
        setError(result.error || 'That password didn’t open this little space. Try again.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Couldn’t reach the lock just now. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function lockPage() {
    audioRef.current?.pause()
    try {
      await fetch('/api/private-page-lock', { method: 'POST', cache: 'no-store', credentials: 'same-origin' })
    } finally {
      setMusicOpen(false)
      setMusicPlaying(false)
      setContent(null)
      setUnlocked(false)
    }
  }

  async function toggleMusic() {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
      setMusicPlaying(false)
      return
    }
    try {
      await audio.play()
      setMusicPlaying(true)
      setMusicBlocked(false)
    } catch {
      setMusicBlocked(true)
    }
  }

  return <main className={`private-page ${unlocked ? 'private-page-unlocked' : ''} ${theme === 'light' ? 'private-page-light' : ''} ${smoothMode ? '' : 'private-page-still'}`}>
    <div className="private-sky" aria-hidden="true"><span/><span/><span/><span/><span/><span/><i/><i/><i/></div>
    <div className="private-lock-fx" aria-hidden="true"><span>♡</span><span>✦</span><span>🧸</span><span>♥</span><span>✨</span><span>🧸</span><span>♡</span></div>
    <header className="private-nav">
      <a href="/" className="private-brand">AMSOUL<span>NESS.</span></a>
      <a className="private-back" href="/"><ArrowLeft size={16}/> BACK TO PORTFOLIO</a>
    </header>

    {!unlocked ? <section className="private-gate" aria-labelledby="private-title">
      <div className="private-lock-icon"><LockKeyhole size={24}/></div>
      <p className="private-eyebrow"><Sparkles size={14}/> JUST FOR YOU</p>
      <h1 id="private-title">A little space,<br/><em>just for us.</em></h1>
      <p className="private-intro">A little corner of the internet, tucked away just for you. Come in and find our story.</p>
      <form className="private-form" onSubmit={unlock}>
        <label htmlFor="private-password">Our little secret</label>
        <input id="private-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter the password" required disabled={busy}/>
        <button type="submit" disabled={busy || !password}><Heart size={17} fill="currentColor"/>{busy ? 'OPENING YOUR SPACE…' : 'OPEN YOUR LETTER'}</button>
      </form>
      <p className="private-error" role="alert" aria-live="polite">{error}</p>
      <p className="private-footnote">A tiny page made with a lot of affection <Heart size={12} fill="currentColor"/></p>
    </section> : <section className="private-letter" aria-labelledby="letter-title">
      <div className="private-flower-rain private-flower-rain-her" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={`daisy-${i}`}><img src="/keepsake/daisy.svg" alt=""/></span>)}</div>
      <div className="private-flower-rain private-flower-rain-me" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={`rose-${i}`}><img src="/keepsake/rose.svg" alt=""/></span>)}</div>
      <div className="private-rising-fx" aria-hidden="true"><span><img src="/keepsake/daisy.svg" alt=""/></span><span>♡</span><span><img src="/keepsake/rose.svg" alt=""/></span><span>✦</span><span>♥</span><span><img src="/keepsake/daisy.svg" alt=""/></span><span><img src="/keepsake/rose.svg" alt=""/></span></div>
      <p className="private-eyebrow"><Sparkles size={14}/> YOU MADE IT</p>
      <h1 id="letter-title">For my<br/><em>favorite person.</em></h1>
      <div className="private-portraits" aria-label="A couple of our favorite portraits">
        <figure><div className="private-portrait-frame"><img src="/api/private-photo?photo=her" alt="Her, smiling in a mirror selfie" loading="lazy" decoding="async"/></div><figcaption><span>HER</span><small>my favorite smile</small></figcaption></figure>
        <figure><div className="private-portrait-frame"><img src="/api/private-photo?photo=me" alt="Me, in a portrait" loading="lazy" decoding="async"/></div><figcaption><span>ME</span><small>the one who found you</small></figcaption></figure>
      </div>
      <section className="private-garden" aria-label="A rose and a daisy blooming for us">
        <p className="private-garden-title"><Sparkles size={13}/> TWO LITTLE BLOOMS <Sparkles size={13}/></p>
        <div className="private-garden-flowers">
          <figure className="private-garden-flower private-garden-rose"><span className="private-garden-stem"/><img src="/keepsake/rose.svg" alt="A red rose slowly blooming"/><figcaption>A rose for me</figcaption></figure>
          <figure className="private-garden-flower private-garden-daisy"><span className="private-garden-stem"/><img src="/keepsake/daisy.svg" alt="A soft white daisy slowly blooming"/><figcaption>A daisy for you</figcaption></figure>
        </div>
        <span className="private-garden-dew private-garden-dew-one" aria-hidden="true"/><span className="private-garden-dew private-garden-dew-two" aria-hidden="true"/>
        <a className="private-garden-credit" href="https://github.com/JIN2-ASCII/-JIN2-ASCII" target="_blank" rel="noreferrer">A little bloom inspiration from JIN2’s ASCII flower studies ↗</a>
      </section>
      <section className={`private-soundtrack ${musicOpen ? 'private-soundtrack-open' : ''} ${musicPlaying ? 'private-soundtrack-playing' : ''}`} aria-label="Our soundtrack">
        <audio ref={audioRef} src="/api/private-audio" loop preload="none" onPlay={() => setMusicPlaying(true)} onPause={() => setMusicPlaying(false)}/>
        <div className="private-soundtrack-copy"><span className="private-memory-date">A LITTLE SOUNDTRACK</span><strong>{musicBlocked ? 'One tap, then our song.' : 'A little music, all around us.'}</strong><small>{musicPlaying ? 'Playing softly in the background.' : 'The song you sent, tucked into our little space.'}</small><div className="private-viz" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i}/>)}</div></div>
        <button type="button" className={`private-music-button ${musicPlaying ? 'is-playing' : ''}`} onClick={toggleMusic} aria-pressed={musicPlaying}>{musicPlaying ? <Music2 size={16}/> : <Play size={16} fill="currentColor"/>}{musicPlaying ? 'PAUSE OUR SONG' : 'PLAY OUR SONG'}</button>
        {musicBlocked && !musicPlaying && <p className="private-music-hint">Your browser paused autoplay. Tap “Play our song” and it will continue while you explore.</p>}
      </section>
      <article className="private-note">
        <div className="private-note-top"><span>A LITTLE KEEPSAKE OF US</span><Heart size={18} fill="currentColor"/></div>
        <p>Hey, my favorite person,</p>
        <p>{content?.note}</p>
        <div className="private-timeline" aria-label="Our story so far">
          <div className="private-memory"><span className="private-memory-date">{content?.firstDate}</span><h2>The first hello</h2><p>{content?.openingMemory}</p></div>
          <div className="private-memory"><span className="private-memory-date">{content?.callDate}</span><h2>Our first calls</h2><p>{content?.callMemory}</p></div>
          <div className="private-memory"><span className="private-memory-date">{content?.videoDate}</span><h2>Face to face, from afar</h2><p>{content?.videoMemory}</p></div>
          <div className="private-memory"><span className="private-memory-date">{content?.secondDate}</span><h2>We chose us</h2><p>{content?.firstMemory}</p></div>
          <div className="private-memory"><span className="private-memory-date">{content?.thirdDate}</span><h2>Our first virtual coffee date</h2><p>{content?.secondMemory}</p></div>
        </div>
        <p>{content?.ending}</p>
        <p className="private-signoff">A hug, a kiss, and all my love <Heart size={15} fill="currentColor"/></p>
      </article>
      <button className="private-lock-button" type="button" onClick={lockPage}><LockKeyhole size={15}/> LOCK THIS PAGE</button>
      <a className="private-back private-letter-back" href="/"><ArrowLeft size={16}/> BACK TO PORTFOLIO</a>
    </section>}
    <footer className="private-footer">MADE WITH A LITTLE MAGIC <span>♥</span> AMSOULNESS</footer>
  </main>
}
