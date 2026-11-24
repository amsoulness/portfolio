import DoomThorFigures from './DoomThorFigures'
import { useEffect, useState } from 'react'
import './DoomsdayCountdown.css'
const dates = [
 {name:'India', date:'17 December 2026', target:'2026-12-17T00:00:00+05:30', zone:'IST', source:'https://www.district.in/movies/avengers-doomsday-movie-tickets-MV176735'},
 {name:'Global / US', date:'18 December 2026', target:'2026-12-18T00:00:00-05:00', zone:'US Eastern', source:'https://movies.disney.com/avengers-doomsday'}
]
export default function DoomsdayCountdown() {
 const [now,setNow]=useState(()=>Date.now())
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[])
 return <section id="doomsday" className="doom-countdown" aria-labelledby="doom-title"><div className="doom-atmosphere" aria-hidden="true"><span/><span/><span/><i/><i/><i/></div><div className="doom-topline"><span className="doom-live-dot" aria-hidden="true"/> THE NEXT CINEMATIC COLLISION <span>ASLNS / WATCHLIST 001</span></div><div className="doom-title-group"><span className="eyebrow">MARVEL STUDIOS / THE COUNTDOWN</span><h2 id="doom-title"><span className="doom-avengers">AVENGERS</span><em>DOOMSDAY</em></h2><p className="doom-tagline">Every second brings us closer.</p><a className="doom-film-link" href="https://movies.disney.com/avengers-doomsday" target="_blank" rel="noreferrer">Explore the film <span aria-hidden="true">↗</span></a></div><DoomThorFigures/><div className="doom-releases">{dates.map(d=>{
 const seconds=Math.max(0,Math.floor((Date.parse(d.target)-now)/1000))
 const values=[Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60]
 return <article key={d.name}><header><strong>{d.name}</strong><a href={d.source} target="_blank" rel="noreferrer">Release source ↗</a></header><time dateTime={d.target}>{d.date} · {d.zone}</time>{seconds>0?<div className="doom-clock" role="timer" aria-label={d.name+' release countdown'}>{values.map((v,i)=><div key={i}><span key={v} className="doom-digit">{String(v).padStart(2,'0')}</span><small>{['Days','Hours','Minutes','Seconds'][i]}</small></div>)}</div>:<p>Release date has arrived.</p>}</article>
 })}</div><p className="doom-note">Counts down to midnight at the start of each listed date, not a cinema showtime. Global releases vary by territory. Dates may change.</p></section>
}
