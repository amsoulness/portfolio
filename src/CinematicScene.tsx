import { useEffect, useRef, useState } from 'react'
import './CinematicScene.css'
export default function CinematicScene(){
 const [ready,setReady]=useState(false)
 const frame=useRef<HTMLIFrameElement>(null)
 useEffect(()=>{
  const receive=(e:MessageEvent)=>{if(e.origin===window.location.origin&&e.source===frame.current?.contentWindow&&e.data?.type==='aslns-scene-ready')setReady(true)}
  window.addEventListener('message',receive)
  let tick=0
  const send=()=>{tick=0;frame.current?.contentWindow?.postMessage({type:'aslns-scene-scroll',progress:window.scrollY/Math.max(1,document.documentElement.scrollHeight-window.innerHeight)},window.location.origin)}
  const update=()=>{if(!tick)tick=requestAnimationFrame(send)}
  window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);send()
  const f=frame.current;f?.addEventListener('load',send)
  return()=>{window.removeEventListener('message',receive);cancelAnimationFrame(tick);window.removeEventListener('scroll',update);window.removeEventListener('resize',update);f?.removeEventListener('load',send)}
 },[])
 return <div className={`cinematic-world ${ready?'scene-ready':''}`} aria-hidden="true"><iframe ref={frame} src="/cinematic/scene.html" title="Animated ASLNS environment" tabIndex={-1}/></div>
}
