import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { DOOMSDAY_END, isDoomsdaySeason } from './doomsday-season.mjs'
import './DoomsdaySeason.css'
const SeasonContext=createContext(false)
export function DoomsdayOnly({children}:{children:ReactNode}){return useContext(SeasonContext)?children:null}
export function DoomsdayChapter({number, title, detail}:{number:string,title:string,detail:string}) {
 return <DoomsdayOnly><section className="doom-chapter" aria-label="Doomsday edition"><div className="doom-chapter-seal" aria-hidden="true"><svg viewBox="0 0 80 90" fill="none"><path d="M40 4 71 18v31L40 84 9 49V18Z"/><path d="m22 30 12 7-5 10m29-17-12 7 5 10M32 61h16M40 20v37"/></svg></div><div><span className="doom-chapter-kicker">AMSOULNESS / DOOMSDAY EDITION</span><p><em>{number}</em> {title}</p><span className="doom-chapter-detail">{detail}</span></div><a href="/#doomsday">THE COUNTDOWN <span aria-hidden="true">&#8599;</span></a></section></DoomsdayOnly>
}
export function NormalOnly({children}:{children:ReactNode}){return useContext(SeasonContext)?null:children}
export default function DoomsdaySeason({children}:{children:ReactNode}){
 const [active,setActive]=useState(()=>isDoomsdaySeason())
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>
  const sync=()=>{clearTimeout(timer);const enabled=isDoomsdaySeason();setActive(enabled);document.documentElement.toggleAttribute('data-doomsday',enabled);if(enabled)timer=setTimeout(sync,Math.min(DOOMSDAY_END-Date.now(),60000))}
  sync();document.addEventListener('visibilitychange',sync)
  return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',sync);document.documentElement.removeAttribute('data-doomsday')}
 },[])
 return <SeasonContext.Provider value={active}>{active&&<div className="doom-season-atmosphere" aria-hidden="true"><span/><span/><i/><i/><i/></div>}{children}{active&&<div className="doom-season-badge"><span/>DOOMSDAY EDITION <small>UNTIL 16 DEC · IST</small></div>}</SeasonContext.Provider>
}
