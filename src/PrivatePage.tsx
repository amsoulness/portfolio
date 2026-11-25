import { useEffect, useRef, useState, type FormEvent, type TouchEvent, type WheelEvent } from 'react'
import { ArrowLeft, Heart, LockKeyhole, Music2, Play, Sparkles } from 'lucide-react'
import type { SiteTheme } from './ThemeToggle'
import './PrivatePage.css'

type PrivateContent = { firstDate: string; callDate: string; videoDate: string; secondDate: string; thirdDate: string; openingMemory: string; callMemory: string; videoMemory: string; firstMemory: string; secondMemory: string; note: string; ending: string }
const SCENE_LABELS = ['OUR PORTRAITS', 'WILL YOU', 'IN BLOOM', 'CAT KNIGHT', 'I LOVE YOU', 'BUTTERFLY', 'OUR SONG', 'OUR STORY', 'ALWAYS']

export default function PrivatePage({ theme, smoothMode }: { theme: SiteTheme; smoothMode: boolean }) {
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [content, setContent] = useState<PrivateContent | null>(null)
  const [musicOpen, setMusicOpen] = useState(false)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicBlocked, setMusicBlocked] = useState(false)
  const [sceneIndex, setSceneIndex] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const touchStartY = useRef<number | null>(null)
  const sceneChangeAt = useRef(0)

  function moveScene(direction: number) {
    const now = Date.now()
    if (now - sceneChangeAt.current < 680) return
    sceneChangeAt.current = now
    setSceneIndex(index => Math.max(0, Math.min(SCENE_LABELS.length - 1, index + direction)))
  }

  function handleSceneWheel(event: WheelEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    const scrollable = target.closest<HTMLElement>('[data-scene-scroll]')
    if (scrollable && ((event.deltaY < 0 && scrollable.scrollTop > 0) || (event.deltaY > 0 && scrollable.scrollTop + scrollable.clientHeight < scrollable.scrollHeight - 2))) return
    event.preventDefault()
    if (Math.abs(event.deltaY) > 22) moveScene(event.deltaY > 0 ? 1 : -1)
  }

  function handleSceneTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartY.current
    touchStartY.current = null
    if (start === null) return
    const target = event.target as HTMLElement
    if (target.closest('[data-scene-scroll]')) return
    const delta = start - event.changedTouches[0].clientY
    if (Math.abs(delta) > 42) moveScene(delta > 0 ? 1 : -1)
  }

  useEffect(() => {
    document.title = 'A Little Space for You | AMSOULNESS'
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'A private little corner made with love.')
    return () => {
      document.title = 'AMSOULNESS | Emmanuel Cherian'
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'The portfolio and creative lab of Emmanuel Cherian: software projects, cinematic edits, and free browser-based tools from AMSOULNESS / ASLNS.')
    }
  }, [])

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
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
      setSceneIndex(0)
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
    </section> : <section className="private-letter" aria-label="Our private 3D keepsake">
      <div className="private-flower-rain private-flower-rain-her" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={`daisy-${i}`}><img src="/keepsake/daisy.svg" alt=""/></span>)}</div>
      <div className="private-flower-rain private-flower-rain-me" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={`rose-${i}`}><img src="/keepsake/rose.svg" alt=""/></span>)}</div>
      <div className="private-rising-fx" aria-hidden="true"><span><img src="/keepsake/daisy.svg" alt=""/></span><span>♡</span><span><img src="/keepsake/rose.svg" alt=""/></span><span>✦</span><span>♥</span><span><img src="/keepsake/daisy.svg" alt=""/></span><span><img src="/keepsake/rose.svg" alt=""/></span></div>
      <div className="private-scene-hint" aria-live="polite">{SCENE_LABELS[sceneIndex]} · {sceneIndex + 1} / {SCENE_LABELS.length} <span>Scroll or swipe. I’ll come a little closer.</span></div>
      <div className="private-scene-viewport" onWheel={handleSceneWheel} onTouchStart={event => { touchStartY.current = event.touches[0].clientY }} onTouchEnd={handleSceneTouchEnd} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'PageDown') { event.preventDefault(); moveScene(1) } else if (event.key === 'ArrowUp' || event.key === 'PageUp') { event.preventDefault(); moveScene(-1) } }} tabIndex={0} aria-label="Scroll or swipe to explore each keepsake scene">
        <div className="private-wormhole" aria-hidden="true"><div className="private-wormhole-core"/><span className="wormhole-ring ring-one"/><span className="wormhole-ring ring-two"/><span className="wormhole-ring ring-three"/><span className="wormhole-ring ring-four"/><i className="wormhole-streak streak-one"/><i className="wormhole-streak streak-two"/><i className="wormhole-streak streak-three"/><i className="wormhole-streak streak-four"/><i className="wormhole-streak streak-five"/><i className="wormhole-streak streak-six"/></div>
        <div className="private-depth-blooms" aria-hidden="true"><span><img src="/keepsake/rose.svg" alt=""/></span><span>♡</span><span><img src="/keepsake/daisy.svg" alt=""/></span><span>✦</span><span><img src="/keepsake/rose.svg" alt=""/></span><span>♥</span><span><img src="/keepsake/daisy.svg" alt=""/></span><span>✧</span></div>
        <section className={`private-scene ${sceneIndex === 0 ? 'is-current' : sceneIndex < 0 ? 'is-ahead' : 'is-away'}`} aria-label="Our portraits">
          <p className="private-eyebrow"><Sparkles size={14}/> YOU MADE IT</p>
          <h1 id="letter-title">For my<br/><em>favorite person.</em></h1>
          <div className="private-portraits" aria-label="A couple of our favorite portraits">
            <figure><div className="private-portrait-frame"><img src="/api/private-photo?photo=her" alt="Her, smiling in a mirror selfie" loading="lazy" decoding="async"/></div><figcaption><span>HER</span><small>my favorite smile</small></figcaption></figure>
            <figure><div className="private-portrait-frame"><img src="/api/private-photo?photo=me" alt="Me, in a portrait" loading="lazy" decoding="async"/></div><figcaption><span>ME</span><small>the one who found you</small></figcaption></figure>
          </div>
        </section>
        <section className={`private-scene ${sceneIndex === 1 ? 'is-current' : sceneIndex < 1 ? 'is-ahead' : 'is-away'}`} aria-label="WILL YOU diamond ring">
          <p className="private-motif-kicker">A LITTLE PROMISE IN LIGHT</p>
          <div className="private-motif-art motif-ring-art" aria-hidden="true"><svg viewBox="0 0 180 180"><ellipse cx="90" cy="118" rx="48" ry="35"/><path d="M48 111c9 31 75 31 84 0"/><path d="M90 22 117 55 90 92 63 55Z"/><path d="m63 55 27 11 27-11M90 22v44"/><path d="M128 36h15m-7.5-7.5v15M48 54h10m-5-5v10"/></svg></div>
          <h2 className="private-motif-title">WILL YOU<br/><em>stay close?</em></h2>
          <p className="private-motif-copy">A little ring of light, for all the tiny tomorrows I hope we get to share.</p>
        </section>
        <section className={`private-scene ${sceneIndex === 2 ? 'is-current' : sceneIndex < 2 ? 'is-ahead' : 'is-away'}`} aria-label="IN BLOOM rose and daisy">
          <section className="private-garden" aria-label="A rose and a daisy blooming for us">
        <p className="private-garden-title"><Sparkles size={13}/> TWO LITTLE BLOOMS <Sparkles size={13}/></p>
        <div className="private-garden-flowers">
          <figure className="private-garden-flower private-garden-rose"><span className="private-garden-stem"/><img src="/keepsake/rose.svg" alt="A red rose slowly blooming"/><figcaption>A rose for me</figcaption></figure>
          <figure className="private-garden-flower private-garden-daisy"><span className="private-garden-stem"/><img src="/keepsake/daisy.svg" alt="A soft white daisy slowly blooming"/><figcaption>A daisy for you</figcaption></figure>
        </div>
        <span className="private-garden-dew private-garden-dew-one" aria-hidden="true"/><span className="private-garden-dew private-garden-dew-two" aria-hidden="true"/>
        <a className="private-garden-credit" href="https://github.com/JIN2-ASCII/-JIN2-ASCII" target="_blank" rel="noreferrer">A little bloom inspiration from JIN2’s ASCII flower studies ↗</a>
      </section>
        </section>
        <section className={`private-scene ${sceneIndex === 3 ? 'is-current' : sceneIndex < 3 ? 'is-ahead' : 'is-away'}`} aria-label="CAT KNIGHT">
          <p className="private-motif-kicker">THE BRAVEST LITTLE GUARD</p>
          <div className="private-motif-art motif-cat-art" aria-hidden="true"><svg viewBox="0 0 180 180"><path d="m35 70 8-43 39 25q8-3 16 0l39-25 8 43q12 17 7 39-10 39-63 39T26 109q-5-22 9-39Z"/><path d="M62 94h2m52 0h2m-39 18q13 12 26 0m-53-8-23-5m27 24-22 8m89-27 23-5m-27 24 22 8"/><path d="m128 107 28 9v30l-28 14-28-14v-30Z"/><path d="m117 133 10 10 17-21"/><path d="m41 69 8-26 25 15m57 11-8-26-25 15"/></svg></div>
          <h2 className="private-motif-title">YOUR TINY<br/><em>brave guard.</em></h2>
          <p className="private-motif-copy">A knight on whiskers, assigned to protect every rose, daisy, and stolen hug.</p>
        </section>
        <section className={`private-scene ${sceneIndex === 4 ? 'is-current' : sceneIndex < 4 ? 'is-ahead' : 'is-away'}`} aria-label="I LOVE YOU">
          <p className="private-motif-kicker">SOME THINGS DESERVE THEIR OWN LITTLE UNIVERSE</p>
          <div className="private-motif-art motif-heart-art" aria-hidden="true"><Heart fill="currentColor"/></div>
          <h2 className="private-motif-title">I LOVE<br/><em>YOU.</em></h2>
          <p className="private-motif-copy">Across every orbit, every quiet moment, and every version of tomorrow.</p>
        </section>
        <section className={`private-scene ${sceneIndex === 5 ? 'is-current' : sceneIndex < 5 ? 'is-ahead' : 'is-away'}`} aria-label="BUTTERFLY">
          <p className="private-motif-kicker">A LITTLE WINGBEAT, FINDING ITS WAY HOME</p>
          <div className="private-motif-art motif-butterfly-art" aria-hidden="true"><svg viewBox="0 0 180 180"><path d="M88 86C62 31 19 27 31 68c7 23 31 32 58 27-43 9-48 51-20 49 21-2 28-28 29-52m-2-6c26-55 69-59 57-18-7 23-31 32-58 27 43 9 48 51 20 49-21-2-28-28-29-52m3-4v50m-7-54-12-20m20 20 12-20"/></svg></div>
          <h2 className="private-motif-title">FOLLOW<br/><em>the flutter.</em></h2>
          <p className="private-motif-copy">Somehow, through all that space, the sweetest little things find their way to us.</p>
        </section>
        <section className={`private-scene ${sceneIndex === 6 ? 'is-current' : sceneIndex < 6 ? 'is-ahead' : 'is-away'}`} aria-label="Our soundtrack scene">
      <section className={`private-soundtrack ${musicOpen ? 'private-soundtrack-open' : ''} ${musicPlaying ? 'private-soundtrack-playing' : ''}`} aria-label="Our soundtrack">
        <audio ref={audioRef} src="/api/private-audio" loop preload="none" onPlay={() => setMusicPlaying(true)} onPause={() => setMusicPlaying(false)}/>
        <div className="private-soundtrack-copy"><span className="private-memory-date">A LITTLE SOUNDTRACK</span><strong>{musicBlocked ? 'One tap, then our song.' : 'A little music, all around us.'}</strong><small>{musicPlaying ? 'Playing softly in the background.' : 'The song you sent, tucked into our little space.'}</small><div className="private-viz" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i}/>)}</div></div>
        <button type="button" className={`private-music-button ${musicPlaying ? 'is-playing' : ''}`} onClick={toggleMusic} aria-pressed={musicPlaying}>{musicPlaying ? <Music2 size={16}/> : <Play size={16} fill="currentColor"/>}{musicPlaying ? 'PAUSE OUR SONG' : 'PLAY OUR SONG'}</button>
        {musicBlocked && !musicPlaying && <p className="private-music-hint">Your browser paused autoplay. Tap “Play our song” and it will continue while you explore.</p>}
      </section>
        </section>
        <section className={`private-scene ${sceneIndex === 7 ? 'is-current' : sceneIndex < 7 ? 'is-ahead' : 'is-away'}`} aria-label="Our story">
      <article className="private-note" data-scene-scroll>
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
        </section>
        <section className={`private-scene private-finale ${sceneIndex === 8 ? 'is-current' : sceneIndex < 8 ? 'is-ahead' : 'is-away'}`} aria-label="The end of our little space">
          <p className="private-eyebrow"><Heart size={14} fill="currentColor"/> ALWAYS, IN EVERY LITTLE UNIVERSE</p>
          <h2>One more<br/><em>hug?</em></h2>
          <div className="private-finale-heart" aria-hidden="true">♥</div>
          <button className="private-lock-button" type="button" onClick={lockPage}><LockKeyhole size={15}/> LOCK THIS PAGE</button>
          <a className="private-back private-letter-back" href="/"><ArrowLeft size={16}/> BACK TO PORTFOLIO</a>
        </section>
      </div>
    </section>}
    <footer className="private-footer">MADE WITH A LITTLE MAGIC <span>♥</span> AMSOULNESS</footer>
  </main>
}
