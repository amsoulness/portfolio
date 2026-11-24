import { useEffect, useRef } from 'react'
export default function DoomsdayVFX() {
 const canvasRef=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{
  const canvas=canvasRef.current, preference=matchMedia('(prefers-reduced-motion: reduce)')
  if(!canvas)return
  const context=canvas.getContext('2d');if(!context)return
  let width=0,height=0,frame=0,visible=false,tick=0,last=0
  const points=Array.from({length:40},(_,i)=>({x:(i*0.61803398875)%1,y:(i*.381966)%1,speed:.000008+(i%5)*.000003,size:.6+(i%3)*.4,gold:i%2===0}))
  const resize=()=>{const bounds=canvas.getBoundingClientRect();width=bounds.width;height=bounds.height;const ratio=Math.min(devicePixelRatio,1.5);canvas.width=width*ratio;canvas.height=height*ratio;context.setTransform(ratio,0,0,ratio,0,0)}
  const paint=(time:number)=>{
   frame=0;if(!visible||document.hidden||preference.matches)return
   if(time-last<40){frame=requestAnimationFrame(paint);return}last=time;tick++
   context.clearRect(0,0,width,height)
   for(const p of points){
    const y=((p.y-time*p.speed)%1+1)%1*height,x=p.x*width+Math.sin(time*.0002+p.y*8)*20
    context.beginPath();context.fillStyle=p.gold?'rgba(240,197,105,.45)':'rgba(163,211,112,.4)';context.arc(x,y,p.size,0,Math.PI*2);context.fill()
    if(p.size>1){context.beginPath();context.strokeStyle=p.gold?'rgba(240,197,105,.12)':'rgba(163,211,112,.12)';context.moveTo(x,y);context.lineTo(x-3,y+12);context.stroke()}
   }
   for(let side=0;side<2;side++){
    const origin=side?width:0;context.beginPath();context.strokeStyle=side?'rgba(239,195,103,.12)':'rgba(161,218,110,.12)';context.lineWidth=.7
    for(let y=0;y<=height;y+=16){const x=origin+(side?-1:1)*(18+Math.sin(y*.009+time*.0002)*12+Math.sin(y*.021-time*.0003)*5);if(y===0)context.moveTo(x,y);else context.lineTo(x,y)}context.stroke()
   }
   frame=requestAnimationFrame(paint)
  }
  const start=()=>{if(!frame&&visible&&!document.hidden&&!preference.matches)frame=requestAnimationFrame(paint)}
  const update=()=>{if(preference.matches){cancelAnimationFrame(frame);frame=0;context.clearRect(0,0,width,height)}else start()}
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();else{cancelAnimationFrame(frame);frame=0}},{rootMargin:'100px'})
  const sizes=new ResizeObserver(resize);sizes.observe(canvas);observer.observe(canvas);document.addEventListener('visibilitychange',start);preference.addEventListener('change',update);resize()
  return()=>{cancelAnimationFrame(frame);observer.disconnect();sizes.disconnect();document.removeEventListener('visibilitychange',start);preference.removeEventListener('change',update)}
 },[])
 return <div className="doom-premium-vfx" aria-hidden="true"><canvas ref={canvasRef}/><div className="doom-lens-green"/><div className="doom-lens-gold"/><div className="doom-energy-contour"/><div className="doom-energy-contour doom-energy-contour-two"/><div className="doom-vfx-grain"/></div>
}
