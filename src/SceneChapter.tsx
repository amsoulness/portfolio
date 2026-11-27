import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react'


/** A viewport-held chapter: document scrolling advances its content and camera together. */
export default function SceneChapter({children,className='',...props}:ComponentPropsWithoutRef<'section'>){
 const root=useRef<HTMLElement>(null)
 const content=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  const section=root.current,body=content.current
  if(!section||!body)return
  const media=matchMedia('(prefers-reduced-motion: reduce)')
  let frame=0
  const measure=()=>{
   const viewport=window.innerHeight
   section.style.setProperty('--chapter-distance',`${Math.max(viewport*1.7,body.scrollHeight+viewport*.8)}px`)
   update()
  }
  const draw=()=>{
   frame=0
   if(media.matches)return
   const viewport=window.innerHeight,rect=section.getBoundingClientRect()
   const travel=Math.max(1,section.offsetHeight-viewport)
   const progress=Math.max(0,Math.min(1,-rect.top/travel))
   const overflow=Math.max(0,body.scrollHeight-(viewport-170))
   const reading=Math.max(0,Math.min(1,(progress-.15)/.65))
   const enter=props.id==='home'?1:Math.max(0,Math.min(1,(viewport-rect.top)/(viewport*.55)))
   const leave=Math.max(0,Math.min(1,(1-progress)/.14))
   section.style.setProperty('--chapter-opacity',String(Math.min(enter,leave)))
   section.style.setProperty('--chapter-offset',`${-overflow*reading+(1-enter)*40}px`)
  }
  const update=()=>{if(!frame)frame=requestAnimationFrame(draw)}
  const observer=new ResizeObserver(measure);observer.observe(body)
  window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',measure);media.addEventListener('change',measure);measure()
  return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('scroll',update);window.removeEventListener('resize',measure);media.removeEventListener('change',measure)}
 },[props.id])
 return <section {...props} ref={root} className={`scene-chapter ${className}`}><div className="scene-chapter-stage"><div ref={content} className="scene-chapter-content">{children}</div></div></section>
}
