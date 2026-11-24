import { useEffect, useRef, useState } from 'react'
export default function DoomThorFigures() {
 const video=useRef<HTMLVideoElement>(null),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null)
 const [paused,setPaused]=useState(true)
 useEffect(()=>{
  const el=video.current;if(!el)return
  const media=matchMedia('(prefers-reduced-motion: reduce)')
  const observer=new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&!media.matches)void el.play().then(()=>setPaused(false)).catch(()=>setPaused(true));else{el.pause();setPaused(true)}},{threshold:.2})
  observer.observe(el);return()=>{observer.disconnect();el.pause()}
 },[])
 const close=()=>{dialog.current?.querySelector('video')?.pause();dialog.current?.close();trigger.current?.focus()}
 return <><video ref={video} className="doom-cinema-footage" muted loop playsInline preload="metadata" poster="/images/doomsday/doctor-doom.jpg" aria-hidden="true" tabIndex={-1}><source src="/videos/doom-thor-fan-edit.mp4" type="video/mp4"/></video><div className="doom-cinema-controls"><button ref={trigger} onClick={()=>{video.current?.pause();setPaused(true);dialog.current?.showModal()}}>Watch the edit <span aria-hidden="true">↗</span></button><button className="doom-cinema-pause" aria-label={paused?'Play background video':'Pause background video'} onClick={()=>{const el=video.current;if(!el)return;if(el.paused)void el.play().then(()=>setPaused(false)).catch(()=>{});else{el.pause();setPaused(true)}}}>{paused?'Play background':'Pause motion'}</button></div><dialog ref={dialog} className="doom-cinema-dialog" onCancel={close} onClick={e=>{if(e.target===e.currentTarget)close()}}><button onClick={close} aria-label="Close video">Close ×</button><video controls playsInline preload="none" poster="/images/doomsday/thor-golden-lightning.webp" aria-label="Doom and Thor silent fan edit"><source src="/videos/doom-thor-fan-edit.mp4" type="video/mp4"/></video><p>Doom × Thor · Silent fan edit · Footage: Marvel Entertainment</p></dialog></>
}
