import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Heart, LockKeyhole, Music2, Play, Sparkles } from 'lucide-react'
import type { SiteTheme } from './ThemeToggle'
import './PrivatePage.css'

type PrivateContent = { firstDate: string; secondDate: string; thirdDate: string; firstMemory: string; secondMemory: string; note: string; ending: string }

export default function PrivatePage({ theme, smoothMode }: { theme: SiteTheme; smoothMode: boolean }) {
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [content, setContent] = useState<PrivateContent | null>(null)
  const [musicOpen, setMusicOpen] = useState(false)

  useEffect(() => {
    document.title = 'A Little Space for You | AMSOULNESS'
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'A private little corner made with love.')
    return () => {
      document.title = 'AMSOULNESS | Emmanuel Cherian'
      document.querySelector('meta[name="description"]')?.setAttribute('content', 'The portfolio and creative lab of Emmanuel Cherian: software projects, cinematic edits, and free browser-based tools from AMSOULNESS / ASLNS.')
    }
  }, [])

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
    try {
      await fetch('/api/private-page-lock', { method: 'POST', cache: 'no-store', credentials: 'same-origin' })
    } finally {
      setMusicOpen(false)
      setContent(null)
      setUnlocked(false)
    }
  }

  return <main className={`private-page ${theme === 'light' ? 'private-page-light' : ''} ${smoothMode ? '' : 'private-page-still'}`}>
    <div className="private-sky" aria-hidden="true"><span/><span/><span/><span/><span/><span/><i/><i/><i/></div>
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
      <p className="private-eyebrow"><Sparkles size={14}/> YOU MADE IT</p>
      <h1 id="letter-title">For my<br/><em>favorite person.</em></h1>
      <div className="private-portraits" aria-label="A couple of our favorite portraits">
        <figure><div className="private-portrait-frame"><img src="/api/private-photo?photo=her" alt="Her, smiling in a mirror selfie" loading="lazy" decoding="async"/></div><figcaption><span>HER</span><small>my favorite smile</small></figcaption></figure>
        <figure><div className="private-portrait-frame"><img src="/api/private-photo?photo=me" alt="Me, in a portrait" loading="lazy" decoding="async"/></div><figcaption><span>ME</span><small>the one who found you</small></figcaption></figure>
      </div>
      <section className={`private-soundtrack ${musicOpen ? 'private-soundtrack-open' : ''}`} aria-label="Our soundtrack">
        <div className="private-soundtrack-copy"><span className="private-memory-date">A LITTLE SOUNDTRACK</span><strong>Press play. Stay a little.</strong><small>A song for our own little world.</small></div>
        <button type="button" className="private-music-button" onClick={() => setMusicOpen(value => !value)} aria-expanded={musicOpen}>{musicOpen ? <Music2 size={16}/> : <Play size={16} fill="currentColor"/>}{musicOpen ? 'HIDE PLAYER' : 'PLAY OUR SONG'}</button>
        {musicOpen && <div className="private-music-player"><iframe src="https://www.youtube-nocookie.com/embed/sJO0rwy9-Ew?rel=0" title="Our little soundtrack on YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy"/></div>}
      </section>
      <article className="private-note">
        <div className="private-note-top"><span>A LITTLE KEEPSAKE OF US</span><Heart size={18} fill="currentColor"/></div>
        <p>Hey, my favorite person,</p>
        <p>{content?.note}</p>
        <div className="private-timeline" aria-label="Our story so far">
          <div className="private-memory"><span className="private-memory-date">{content?.firstDate}</span><h2>The first hello</h2><p>Our story began with a video chat on <a href="https://umingle.com/video/" target="_blank" rel="noreferrer">Umingle</a>. I didn’t know then how much that little moment would come to mean to me.</p></div>
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
