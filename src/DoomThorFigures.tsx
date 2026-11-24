import { useEffect, useRef, type ReactNode } from 'react'
export default function DoomThorFigures({children}:{children:(button:ReactNode)=>ReactNode}) {
 const video=useRef<HTMLVideoElement>(null),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null)
 useEffect(()=>{
  const el=video.current;if(!el)return
  const media=matchMedia('(prefers-reduced-motion: reduce)')
  let inView=false
  const sync=()=>{if(inView&&!media.matches&&!document.hidden&&!dialog.current?.open)void el.play().catch(()=>{});else el.pause()}
  const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync()},{threshold:.15})
  observer.observe(el);media.addEventListener('change',sync);document.addEventListener('visibilitychange',sync)
  return()=>{observer.disconnect();media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);el.pause()}
 },[])
 const close=()=>{dialog.current?.querySelector('video')?.pause();dialog.current?.close();trigger.current?.focus();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)void video.current?.play().catch(()=>{})}
 const button=<button ref={trigger} className="doom-watch-button" onClick={()=>{video.current?.pause();dialog.current?.showModal()}}>Watch the edit <span aria-hidden="true">↗</span></button>
 return <><video ref={video} className="doom-cinema-footage" muted loop playsInline preload="metadata" poster="/images/doomsday/doctor-doom.jpg" aria-hidden="true" tabIndex={-1}><source src="/videos/doom-thor-reel-mix.mp4" type="video/mp4"/></video>{children(button)}<dialog ref={dialog} className="doom-cinema-dialog" onCancel={close} onClick={e=>{if(e.target===e.currentTarget)close()}}><button onClick={close} aria-label="Close video">Close ×</button><video controls playsInline preload="none" poster="/images/doomsday/thor-golden-lightning.webp" aria-label="Doom and Thor silent fan edit"><source src="/videos/doom-thor-reel-mix.mp4" type="video/mp4"/></video><p>Doom × Thor · Reel remix · Original edits by ghxz.edit · Marvel footage</p></dialog></>
}
