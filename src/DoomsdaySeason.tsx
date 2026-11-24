import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { DOOMSDAY_END, isDoomsdaySeason } from './doomsday-season.mjs'
import './DoomsdaySeason.css'
const SeasonContext=createContext(false)
export function DoomsdayOnly({children}:{children:ReactNode}){return useContext(SeasonContext)?children:null}
export default function DoomsdaySeason({children}:{children:ReactNode}){
 const [active,setActive]=useState(()=>isDoomsdaySeason())
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>
  const sync=()=>{clearTimeout(timer);const enabled=isDoomsdaySeason();setActive(enabled);document.documentElement.toggleAttribute('data-doomsday',enabled);if(enabled)timer=setTimeout(sync,Math.min(DOOMSDAY_END-Date.now(),60000))}
  sync();document.addEventListener('visibilitychange',sync)
  return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',sync);document.documentElement.removeAttribute('data-doomsday')}
 },[])
 return <SeasonContext.Provider value={active}>{active&&<div className="doom-season-atmosphere" aria-hidden="true"><span/><span/><i/><i/><i/></div>}{children}{active&&<div className="doom-season-badge"><span/>DOOMSDAY EDITION <small>UNTIL 21 DEC · IST</small></div>}</SeasonContext.Provider>
}
