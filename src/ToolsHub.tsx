import {Children,isValidElement,useEffect,useRef,useState} from 'react'

import QRCode from 'qrcode'

import './ToolsHub.css'
import WhatsAppProfileTool from './tools/WhatsAppProfileTool'


/* ASLNS / Unified interactive dropdown and navigation design */
function StudioSelect({value,onChange,children,disabled}:{
 value?:string|number;onChange:(event:React.ChangeEvent<HTMLSelectElement>)=>void;
 children:React.ReactNode;disabled?:boolean
}){
 const [open,setOpen]=useState(false)
 const root=useRef<HTMLDivElement>(null)
 const options=ReactChildrenOptions(children)
 const selected=options.find(o=>String(o.value)===String(value))||options[0]
 useEffect(()=>{
  if(!open)return
  const outside=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false)}
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key)
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key)}
 },[open])
 return <div ref={root} className={`th-studio-select ${open?'th-studio-open':''} ${disabled?'th-studio-disabled':''}`}>
  <button type="button" className="th-studio-trigger" aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={()=>setOpen(o=>!o)}>
   <span className="th-studio-trigger-text">{selected?.label||'Choose an option'}</span><span className="th-studio-chevron" aria-hidden="true">⌄</span>
  </button>
  {open&&<div className="th-studio-menu" role="listbox" aria-label="Choose an option">
   {options.map((option,i)=><button type="button" role="option" aria-selected={String(option.value)===String(value)} className={`th-studio-option ${String(option.value)===String(value)?'th-studio-selected':''}`} key={`${option.value}-${i}`} onClick={()=>{
    onChange({target:{value:String(option.value)}} as React.ChangeEvent<HTMLSelectElement>);setOpen(false)
   }}><span>{option.label}</span><span className="th-studio-check" aria-hidden="true">{String(option.value)===String(value)?'✓':''}</span></button>)}
  </div>}
 </div>
}
function ReactChildrenOptions(children:React.ReactNode):{value:string|number;label:React.ReactNode}[]{
 const result:{value:string|number;label:React.ReactNode}[]=[]
 const walk=(nodes:React.ReactNode)=>{for(const child of Children.toArray(nodes)){
  if(!isValidElement(child))continue
  const props=child.props as {value?:string|number;children?:React.ReactNode}
  if(typeof child.type==='string'&&child.type==='option')result.push({value:props.value??String(props.children??''),label:props.children})
  else if(props.children)walk(props.children)
 }}
 walk(children);return result
}
const studioStyles=`
.th-studio-select{position:relative;width:100%;min-width:0;margin-top:9px;text-align:left;isolation:isolate;display:flex;flex-direction:column;align-items:stretch}
.th-studio-trigger{width:100%!important;min-height:58px!important;padding:12px 18px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:14px!important;text-align:left!important;border-radius:16px!important;border:1px solid rgba(185,160,255,.34)!important;color:#f4edff!important;background:linear-gradient(120deg,rgba(31,24,56,.98),rgba(14,13,30,.98))!important;box-shadow:inset 0 1px rgba(255,255,255,.07),0 8px 24px rgba(0,0,0,.12)!important;font:inherit!important;font-weight:650!important;letter-spacing:0!important;transition:border-color .2s,box-shadow .2s,transform .2s!important;cursor:pointer}
.th-studio-trigger:hover,.th-studio-open .th-studio-trigger{border-color:#bca4ff!important;box-shadow:0 0 0 3px rgba(167,139,250,.12),0 12px 28px rgba(0,0,0,.24)!important}
.th-studio-trigger:focus-visible{outline:2px solid #d6c6ff!important;outline-offset:3px!important}
.th-studio-trigger-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}
.th-studio-chevron{display:grid;place-items:center;flex:none;width:29px;height:29px;border-radius:9px;background:rgba(167,139,250,.14);color:#c4b5fd;font-size:23px;line-height:1;transition:transform .2s}
.th-studio-open .th-studio-chevron{transform:rotate(180deg)}
.th-studio-menu{position:relative;z-index:1;width:100%;box-sizing:border-box;flex:none;margin-top:9px;max-height:280px;overflow-y:auto;overflow-x:hidden;padding:7px;border:1px solid rgba(185,160,255,.46);border-radius:17px;background:#151127!important;box-shadow:0 20px 55px rgba(0,0,0,.6),0 0 30px rgba(139,92,246,.13);animation:th-select-in .18s ease both}
.th-studio-option{position:relative!important;z-index:1;width:100%!important;display:flex!important;justify-content:space-between!important;align-items:center!important;gap:12px!important;padding:13px 12px!important;border:0!important;border-radius:10px!important;background:transparent!important;color:#e7e0f7!important;font-size:13px!important;font-weight:550!important;text-align:left!important;cursor:pointer!important;min-height:43px!important}
.th-studio-option:hover,.th-studio-option:focus-visible{background:rgba(167,139,250,.17)!important;outline:none!important}
.th-studio-option.th-studio-selected{background:linear-gradient(95deg,rgba(139,92,246,.34),rgba(139,92,246,.1))!important;color:#fff!important}
.th-studio-check{color:#c4b5fd;font-size:16px}
.th-studio-disabled{opacity:.5;pointer-events:none}
.th-split:has(.th-studio-open){align-items:start!important}
.th-split>label:has(.th-studio-select){min-width:0!important}
.th-studio-open{z-index:2}
@keyframes th-select-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.th-back.th-studio-back{display:inline-flex!important;align-items:center!important;gap:14px!important;padding:10px 20px 10px 10px!important;margin-bottom:25px!important;border-radius:999px!important;border:1px solid rgba(190,165,255,.4)!important;background:linear-gradient(110deg,rgba(55,38,91,.85),rgba(21,17,43,.94))!important;color:#e9dcff!important;box-shadow:inset 0 1px rgba(255,255,255,.1),0 10px 30px rgba(0,0,0,.18)!important;font-size:11px!important;letter-spacing:2px!important;font-weight:800!important;text-decoration:none!important;transition:transform .22s,border-color .22s,box-shadow .22s!important}
.th-back.th-studio-back:hover{transform:translateX(-4px)!important;border-color:#c4b5fd!important;box-shadow:0 10px 34px rgba(139,92,246,.23)!important}
.th-back.th-studio-back:focus-visible{outline:2px solid #e9d5ff;outline-offset:4px}
.th-studio-back-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(135deg,#a78bfa,#6d4dbe);color:#130e24;font-size:20px;letter-spacing:0;box-shadow:0 3px 12px rgba(167,139,250,.28)}
.th-studio-back-sub{display:block;font-size:9px;letter-spacing:1.4px;color:#a99bbf;font-weight:600;margin-top:3px}
@media(max-width:560px){.th-studio-trigger{min-height:52px!important}.th-back.th-studio-back{letter-spacing:1.1px!important}.th-studio-menu{max-height:220px}}
@media(prefers-reduced-motion:reduce){.th-studio-menu{animation:none!important}.th-studio-trigger,.th-back.th-studio-back{transition:none!important}}
`

function MotionFX({enabled}:{enabled:boolean}){

 const root=useRef<HTMLDivElement>(null)

 useEffect(()=>{

  if(!enabled||!root.current)return

  const host=root.current

  let raf=0,px=window.innerWidth*.5,py=window.innerHeight*.45

  const move=(e:PointerEvent)=>{if(e.pointerType==='touch')return;px=e.clientX;py=e.clientY;if(raf)return;raf=requestAnimationFrame(()=>{host.style.setProperty('--mx',px+'px');host.style.setProperty('--my',py+'px');raf=0})}

  const tap=(e:PointerEvent)=>{if(e.pointerType==='mouse'&&e.button!==0)return;const el=document.createElement('span');el.className='th-touch-burst';el.style.left=e.clientX+'px';el.style.top=e.clientY+'px';host.appendChild(el);el.addEventListener('animationend',()=>el.remove(),{once:true});setTimeout(()=>el.remove(),850)}

  window.addEventListener('pointermove',move,{passive:true});window.addEventListener('pointerdown',tap,{passive:true})

  return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerdown',tap);cancelAnimationFrame(raf);host.replaceChildren()}

 },[enabled])

 return <div ref={root} className={`th-motion-fx ${enabled?'th-motion-on':''}`} aria-hidden="true"><div className="th-cursor-glow"/><div className="th-cursor-ring"/></div>

}

function CosmicCanvas({active}:{active:boolean}){

 const canvasRef=useRef<HTMLCanvasElement>(null)

 useEffect(()=>{

  if(!active)return

  const canvas=canvasRef.current

  if(!canvas)return

  const ctx=canvas.getContext('2d',{alpha:true})

  if(!ctx)return

  let width=0,height=0,dpr=1,frame=0,raf=0,visible=!document.hidden

  const points=Array.from({length:95},(_,i)=>({

   x:((i*0.61803398875)%1),y:((i*0.41421356237)%1),

   radius:i%11===0?2.1:i%3===0?1.4:.8,

   speed:.07+(i%9)*.017,phase:i*2.39,hue:i%6===0?188:267

  }))

  const resize=()=>{width=window.innerWidth;height=window.innerHeight;dpr=Math.min(window.devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}

  const visibility=()=>{visible=!document.hidden}

  const draw=()=>{

   raf=requestAnimationFrame(draw)

   if(!visible)return

   frame++

   if(frame%2!==0)return

   ctx.clearRect(0,0,width,height)

   const t=performance.now()*.001

   for(const p of points){

    const x=(p.x*width+Math.sin(t*p.speed+p.phase)*27+width)%width

    const y=(p.y*height-t*(5+p.speed*15)%height+height)%height

    const alpha=.16+.33*(.5+.5*Math.sin(t*1.3+p.phase))

    ctx.beginPath();ctx.arc(x,y,p.radius,0,Math.PI*2)

    ctx.fillStyle=`hsla(${p.hue},95%,82%,${alpha})`;ctx.fill()

   }

   const cx=width*.52+Math.sin(t*.12)*width*.08,cy=height*.34+Math.cos(t*.17)*35

   const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.min(width*.48,430))

   glow.addColorStop(0,'rgba(139,92,246,.065)');glow.addColorStop(.45,'rgba(99,102,241,.028)');glow.addColorStop(1,'rgba(0,0,0,0)')

   ctx.fillStyle=glow;ctx.fillRect(0,0,width,height)

  }

  resize();draw()

  window.addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',visibility)

  return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility)}

 },[active])

 return <canvas ref={canvasRef} className="th-cosmic-canvas" aria-hidden="true"/>

}

function ImmersiveMotion({enabled}:{enabled:boolean}){

 const ref=useRef<HTMLDivElement>(null)

 useEffect(()=>{

  const host=ref.current

  if(!host||!enabled)return

  let raf=0,scrollY=window.scrollY

  const sync=()=>{raf=0;host.style.setProperty('--scroll-shift',`${Math.min(300,scrollY*.18)}px`);host.style.setProperty('--scroll-turn',`${Math.min(50,scrollY*.014)}deg`)}

  const onScroll=()=>{scrollY=window.scrollY;if(!raf)raf=requestAnimationFrame(sync)}

  onScroll()

  window.addEventListener('scroll',onScroll,{passive:true})

  return()=>{window.removeEventListener('scroll',onScroll);cancelAnimationFrame(raf)}

 },[enabled])

 return <div ref={ref} className={`th-v22-stage ${enabled?'th-v22-active':''}`} aria-hidden="true">

  <div className="th-v22-depth th-v22-depth-a"/><div className="th-v22-depth th-v22-depth-b"/>

  <div className="th-v22-arc th-v22-arc-a"/><div className="th-v22-arc th-v22-arc-b"/>

  <div className="th-v22-horizon"/><div className="th-v22-noise"/>

  <div className="th-v22-constellation">{Array.from({length:24},(_,i)=><i key={i} style={{left:`${(i*41.17+5)%100}%`,top:`${(i*29.71+13)%100}%`,animationDelay:`-${(i*.41)%9}s`}}/>)}</div>

  <div className="th-v22-orbit-label th-v22-label-a">ASLNS / MOTION SYSTEM</div>

  <div className="th-v22-orbit-label th-v22-label-b">∞ CREATE / EXPLORE</div>

 </div>

}

type ToolId='compress'|'convert'|'qr'|'color'|'password'|'whatsapp'

const cards:{id:ToolId;icon:string;name:string;desc:string;tag:string}[]=[

{id:'compress',icon:'◩',name:'Image Compressor',desc:'Make every pixel count. Less weight, same visual impact.',tag:'CREATOR'},

{id:'convert',icon:'▧',name:'Image Converter',desc:'One image. Endless possibilities. Change its format in a click.',tag:'CREATOR'},

{id:'qr',icon:'▦',name:'QR Code Studio',desc:'Turn a link into a little piece of magic.',tag:'UTILITY'},

{id:'color',icon:'◉',name:'Color Lab',desc:'Find the shade that makes your next idea shine.',tag:'DESIGN'},

{id:'password',icon:'✳',name:'Password Generator',desc:'Strong by design. Random by nature.',tag:'SECURITY'},
 {id:'whatsapp',icon:'◎',name:'WhatsApp Profile Updater',desc:'Your whole photo, any aspect ratio. Link, update, and disconnect automatically.',tag:'CREATOR'}]

const cap=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1)

function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}

function readImage(file:File):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Unable to read this image.'))};img.src=url})}


function copy(text:string,setNotice:(s:string)=>void){navigator.clipboard.writeText(text).then(()=>setNotice('Copied to clipboard.')).catch(()=>setNotice('Copy failed. Select and copy the result manually.'))}


const readableSize=(bytes:number)=>bytes>=1048576?`${(bytes/1048576).toFixed(2)} MB`:`${(bytes/1024).toFixed(1)} KB`

type CompressionPreset='balanced'|'maximum'|'quality'|'custom'
type CompressionResult={id:number;source:File;originalUrl:string;outputUrl:string;blob:Blob;filename:string;width:number;height:number;originalWidth:number;originalHeight:number;keptOriginal:boolean}
const imageFormats=[{mime:'image/webp',ext:'webp',label:'WebP · Modern'},{mime:'image/jpeg',ext:'jpg',label:'JPG · Universal'},{mime:'image/png',ext:'png',label:'PNG · Lossless'}] as const
function zipFiles(files:{name:string;blob:Blob}[]):Promise<Blob>{
 const encoder=new TextEncoder();const parts:BlobPart[]=[];const central:Uint8Array<ArrayBuffer>[]=[];let offset=0
 const table=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;table[i]=c>>>0}
 const u16=(v:number)=>[v&255,(v>>>8)&255],u32=(v:number)=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]
 return (async()=>{for(const f of files){const data=new Uint8Array(await f.blob.arrayBuffer());const name=encoder.encode(f.name);let crc=0xffffffff;for(const byte of data)crc=table[(crc^byte)&255]^(crc>>>8);crc=(crc^0xffffffff)>>>0
 const local=new Uint8Array([80,75,3,4,...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name]);parts.push(local,data);const cd=new Uint8Array([80,75,1,2,...u16(20),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]);central.push(cd);offset+=local.length+data.length}
 const start=offset;for(const cd of central){parts.push(cd);offset+=cd.length}parts.push(new Uint8Array([80,75,5,6,...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(offset-start),...u32(start),...u16(0)]));return new Blob(parts,{type:'application/zip'})})()
}
function ImageTool(){
 const [files,setFiles]=useState<File[]>([]),[results,setResults]=useState<CompressionResult[]>([])
 const [preset,setPreset]=useState<CompressionPreset>('balanced'),[quality,setQuality]=useState(78)
 const [format,setFormat]=useState<'image/webp'|'image/jpeg'|'image/png'>('image/webp')
 const [resize,setResize]=useState(false),[maxDim,setMaxDim]=useState(1920),[compare,setCompare]=useState(50)
 const [busy,setBusy]=useState(false),[drag,setDrag]=useState(false),[notice,setNotice]=useState(''),[previewIndex,setPreviewIndex]=useState(0)
 const picker=useRef<HTMLInputElement>(null),urls=useRef<string[]>([]),running=useRef(false)
 const panel:React.CSSProperties={border:'1px solid rgba(167,139,250,.27)',borderRadius:20,padding:'clamp(15px,3vw,24px)',background:'linear-gradient(145deg,rgba(36,26,66,.65),rgba(12,11,30,.75))'}
 const mini:React.CSSProperties={padding:'10px 12px',borderRadius:12,border:'1px solid rgba(167,139,250,.26)',background:'rgba(167,139,250,.08)',color:'inherit'}
 const release=()=>{urls.current.forEach(u=>URL.revokeObjectURL(u));urls.current=[];setResults([])}
 useEffect(()=>()=>{urls.current.forEach(u=>URL.revokeObjectURL(u))},[])
 const add=(incoming:File[])=>{if(running.current)return;const accepted=incoming.filter(f=>f.type.startsWith('image/')&&f.size<=35*1024*1024);setFiles(old=>[...old,...accepted].slice(0,30));release();setNotice(accepted.length!==incoming.length?'Some files were skipped. Only images up to 35 MB each are supported.':'Images ready for optimization.')}
 const applyPreset=(p:CompressionPreset)=>{setPreset(p);if(p==='maximum'){setQuality(50);setFormat('image/webp');setResize(true);setMaxDim(1600)}if(p==='balanced'){setQuality(78);setFormat('image/webp');setResize(false)}if(p==='quality'){setQuality(92);setFormat('image/webp');setResize(false)}release()}
 const process=async()=>{if(!files.length||running.current)return;running.current=true;setBusy(true);release();setNotice('Optimizing locally on your device…');const done:CompressionResult[]=[];const errors:string[]=[]
 try{for(const [id,file] of files.entries()){try{const img=await readImage(file);const originalWidth=img.naturalWidth,originalHeight=img.naturalHeight;const ratio=resize?Math.min(1,maxDim/Math.max(originalWidth,originalHeight)):1;const width=Math.max(1,Math.round(originalWidth*ratio)),height=Math.max(1,Math.round(originalHeight*ratio));const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas not available');if(format==='image/jpeg'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height)}ctx.drawImage(img,0,0,width,height);const encoded=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,format,quality/100));if(!encoded||encoded.type!==format)throw Error('Selected output format is unsupported in this browser');const keptOriginal=encoded.size>=file.size;const blob=keptOriginal?file:encoded;const ext=keptOriginal?(file.name.split('.').pop()||'image'):imageFormats.find(f=>f.mime===format)!.ext;const filename=`${file.name.replace(/\.[^.]+$/,'')}-optimized.${ext}`;const originalUrl=URL.createObjectURL(file),outputUrl=URL.createObjectURL(blob);urls.current.push(originalUrl,outputUrl);done.push({id,source:file,originalUrl,outputUrl,blob,filename,width:keptOriginal?originalWidth:width,height:keptOriginal?originalHeight:height,originalWidth,originalHeight,keptOriginal})}catch(e){errors.push(`${file.name}: ${e instanceof Error?e.message:'Processing failed'}`)}}setResults(done);setPreviewIndex(0);setNotice(errors.length?`Optimized ${done.length}/${files.length}. ${errors.join(' | ')}`:`Optimized ${done.length} image${done.length===1?'':'s'}. Outputs that grew were replaced with originals.`)}finally{running.current=false;setBusy(false)}}
 const saveZip=async()=>{if(!results.length)return;try{setNotice('Packaging your images…');const zip=await zipFiles(results.map(r=>({name:r.filename,blob:r.blob})));download(zip,'aslns-optimized-images.zip');setNotice('ZIP download requested.')}catch{setNotice('Could not create ZIP archive. Download files individually instead.')}}
 const originalTotal=results.reduce((n,r)=>n+r.source.size,0),outputTotal=results.reduce((n,r)=>n+r.blob.size,0),saved=originalTotal?100*(1-outputTotal/originalTotal):0
 const current=results[previewIndex]||results[0]
 return <div className="th-fields">
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}><div><div className="th-kicker">ASLNS / OPTIMIZATION SYSTEMS</div><h3 style={{fontSize:'clamp(24px,4vw,34px)',margin:'6px 0'}}>Image Compressor <span style={{color:'#a78bfa'}}>3.0 ✦</span></h3><p className="th-hint">Make it lighter. Keep what matters. Create without compromise.</p></div><span style={{...mini,fontSize:11,color:'#86efac'}}>◉ PRIVATE · ON-DEVICE</span></div>
  <div style={panel}><div className="th-kicker">01 / YOUR IMAGE COLLECTION</div><div className="th-file" role="button" tabIndex={0} aria-label="Choose images or drop images" onClick={()=>picker.current?.click()} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();picker.current?.click()}}} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={e=>{e.preventDefault();setDrag(false)}} onDrop={e=>{e.preventDefault();setDrag(false);add(Array.from(e.dataTransfer.files))}} style={{cursor:'pointer',textAlign:'center',padding:'clamp(24px,5vw,45px)',marginTop:14,border:drag?'2px dashed #c4b5fd':'1px dashed rgba(167,139,250,.5)',borderRadius:18,background:'radial-gradient(circle at 50% 0%,rgba(167,139,250,.15),transparent 70%)'}}><div style={{fontSize:35,marginBottom:8}}>↥</div><strong>DROP YOUR IMAGES INTO THE STUDIO</strong><p className="th-hint">or click to browse · Up to 30 images · 35 MB per file</p><input ref={picker} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>{add(Array.from(e.target.files||[]));e.target.value=''}}/></div>{files.length>0&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginTop:14}}><span className="th-hint">✦ {files.length} selected · {readableSize(files.reduce((n,f)=>n+f.size,0))}</span><button type="button" className="th-secondary" disabled={busy} onClick={()=>{setFiles([]);release();setNotice('Images cleared.')}}>Clear collection ×</button></div>}</div>
  <div style={panel}><div className="th-kicker">02 / CHOOSE YOUR OPTIMIZATION</div><p className="th-hint">Creative presets fine-tune your output in one click.</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:10,margin:'15px 0 20px'}}>{([['maximum','◈ MAX SAVINGS','Smaller files'],['balanced','✦ BALANCED','Everyday sweet spot'],['quality','◇ HIGH FIDELITY','More visual detail'],['custom','⚙ CUSTOM','Your own settings']] as [CompressionPreset,string,string][]).map(([id,name,desc])=><button key={id} type="button" className="th-secondary" aria-pressed={preset===id} onClick={()=>applyPreset(id)} style={{...mini,textAlign:'left',borderColor:preset===id?'#a78bfa':'rgba(167,139,250,.26)',background:preset===id?'rgba(167,139,250,.21)':'rgba(167,139,250,.06)'}}><strong style={{fontSize:12}}>{name}</strong><span style={{display:'block',fontSize:11,opacity:.7,marginTop:6}}>{desc}</span></button>)}</div><div className="th-split"><label>Output format<StudioSelect value={format} onChange={e=>{setFormat(e.target.value as typeof format);setPreset('custom');release()}}>{imageFormats.map(f=><option key={f.mime} value={f.mime}>{f.label}</option>)}</StudioSelect></label><label>Resolution<StudioSelect value={resize?'resize':'original'} onChange={e=>{setResize(e.target.value==='resize');setPreset('custom');release()}}><option value="original">Preserve original dimensions</option><option value="resize">Limit maximum dimension</option></StudioSelect></label></div>{resize&&<label>Maximum width or height<StudioSelect value={maxDim} onChange={e=>{setMaxDim(Number(e.target.value));setPreset('custom');release()}}>{[640,1080,1600,1920,2560,4096,8192].map(v=><option key={v} value={v}>{v} px</option>)}</StudioSelect></label>}{format!=='image/png'&&<div style={{marginTop:15}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><strong style={{fontSize:13}}>Compression quality</strong><strong style={{color:'#c4b5fd'}}>{quality}%</strong></div><input aria-label="Compression quality" type="range" min="10" max="100" value={quality} style={{width:'100%',margin:0}} onChange={e=>{setQuality(Number(e.target.value));setPreset('custom');release()}}/><div style={{display:'flex',justifyContent:'space-between',fontSize:11,opacity:.7,marginTop:7}}><span>SMALLER FILE</span><span>HIGHER QUALITY</span></div></div>}<button type="button" disabled={!files.length||busy} onClick={()=>{void process()}} style={{width:'100%',marginTop:20}}>{busy?'✦ Optimizing your collection…':`✦ Optimize ${files.length||''} image${files.length===1?'':'s'} ↗`}</button><p className="th-hint" style={{marginTop:12}}>Images stay in your browser. PNG is lossless and ignores the quality slider. WebP/JPG may change fine detail; compare results before use. If output is larger, the original is retained.</p></div>
  {results.length>0&&<><div style={panel}><div className="th-kicker">03 / OPTIMIZATION REPORT</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:10,marginTop:15}}>{[['BEFORE',readableSize(originalTotal)],['AFTER',readableSize(outputTotal)],['SPACE SAVED',`${saved.toFixed(1)}%`],['IMAGES',String(results.length)]].map(([label,value])=><div key={label} style={{...mini,textAlign:'center',padding:16}}><div style={{fontSize:10,letterSpacing:1.5,opacity:.7}}>{label}</div><strong style={{display:'block',fontSize:21,color:label==='SPACE SAVED'?'#86efac':'#e9d5ff',marginTop:8}}>{value}</strong></div>)}</div><div style={{height:9,background:'rgba(255,255,255,.09)',borderRadius:999,overflow:'hidden',marginTop:17}}><div style={{height:'100%',width:`${Math.max(0,Math.min(100,saved))}%`,background:'linear-gradient(90deg,#8b5cf6,#34d399)',borderRadius:999}}/></div></div><div style={panel}><div className="th-kicker">04 / BEFORE & AFTER VIEWFINDER</div><label>Choose image<StudioSelect value={current.id} onChange={e=>{setPreviewIndex(results.findIndex(r=>r.id===Number(e.target.value)));setCompare(50)}}>{results.map(r=><option key={r.id} value={r.id}>{r.source.name}</option>)}</StudioSelect></label><div style={{position:'relative',width:'100%',height:'clamp(220px,48vw,400px)',overflow:'hidden',borderRadius:16,background:'repeating-conic-gradient(#28243b 0% 25%,#1a1729 0% 50%) 50% / 24px 24px',marginTop:12}}><img src={current.originalUrl} alt="Original image" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain'}}/><div style={{position:'absolute',inset:0,clipPath:`inset(0 0 0 ${compare}%)`}}><img src={current.outputUrl} alt="Optimized image" style={{width:'100%',height:'100%',objectFit:'contain'}}/></div><div style={{position:'absolute',top:0,bottom:0,left:`${compare}%`,width:2,background:'#ffffff',boxShadow:'0 0 10px #000',pointerEvents:'none'}}/><span style={{position:'absolute',top:10,left:10,...mini,fontSize:10}}>ORIGINAL</span><span style={{position:'absolute',top:10,right:10,...mini,fontSize:10}}>OPTIMIZED</span></div><input type="range" aria-label="Before and after comparison slider" min="0" max="100" value={compare} onChange={e=>setCompare(Number(e.target.value))} style={{width:'100%',marginTop:16}}/><p className="th-hint">Slide to reveal the processed image. {current.originalWidth} × {current.originalHeight} original → {current.width} × {current.height} output.</p></div><div style={panel}><div className="th-kicker">05 / YOUR EXPORT COLLECTION</div><div style={{display:'grid',gap:10,margin:'15px 0'}}>{results.map(r=><div key={r.id} style={{...mini,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div style={{minWidth:0,flex:'1 1 180px'}}><strong style={{overflowWrap:'anywhere',fontSize:13}}>{r.source.name}</strong><div className="th-hint">{readableSize(r.source.size)} → {readableSize(r.blob.size)} · {((1-r.blob.size/r.source.size)*100).toFixed(1)}% saved {r.keptOriginal?'· Original retained':''}</div></div><button type="button" className="th-secondary" onClick={()=>download(r.blob,r.filename)}>↓ Download</button></div>)}</div><button type="button" onClick={()=>{void saveZip()}} style={{width:'100%'}}>↓ Download all as ZIP ↗</button></div></>}
  <p role="status" className="th-hint">{notice||'Ready to optimize. No uploads, no accounts, no waiting.'}</p>
 </div>
}

type ConvertedImage={id:number;source:File;originalUrl:string;outputUrl:string;blob:Blob;filename:string;width:number;height:number;originalWidth:number;originalHeight:number}
type ConverterPreset='web'|'social'|'print'|'transparent'|'custom'
function ConverterTool(){
 const [files,setFiles]=useState<File[]>([])
 const [format,setFormat]=useState<'image/png'|'image/jpeg'|'image/webp'>('image/webp')
 const [quality,setQuality]=useState(88)
 const [resize,setResize]=useState(false)
 const [maxDimension,setMaxDimension]=useState(1920)
 const [background,setBackground]=useState('#ffffff')
 const [preset,setPreset]=useState<ConverterPreset>('web')
 const [items,setItems]=useState<ConvertedImage[]>([])
 const [busy,setBusy]=useState(false),[packing,setPacking]=useState(false)
 const [notice,setNotice]=useState(''),[dragging,setDragging]=useState(false)
 const [previewIndex,setPreviewIndex]=useState(0),[compare,setCompare]=useState(50)
 const picker=useRef<HTMLInputElement>(null),urls=useRef<string[]>([]),running=useRef(false)
 const panel:React.CSSProperties={border:'1px solid rgba(167,139,250,.27)',borderRadius:20,padding:'clamp(15px,3vw,24px)',background:'linear-gradient(145deg,rgba(36,26,66,.65),rgba(12,11,30,.75))'}
 const mini:React.CSSProperties={padding:'10px 12px',borderRadius:12,border:'1px solid rgba(167,139,250,.26)',background:'rgba(167,139,250,.08)',color:'inherit'}
 const release=()=>{urls.current.forEach(u=>URL.revokeObjectURL(u));urls.current=[];setItems([])}
 useEffect(()=>()=>{urls.current.forEach(u=>URL.revokeObjectURL(u))},[])
 const add=(incoming:File[])=>{
  if(running.current)return
  const accepted=incoming.filter(f=>f.type.startsWith('image/')&&f.size<=35*1024*1024)
  const room=Math.max(0,30-files.length)
  setFiles(old=>[...old,...accepted.slice(0,room)])
  release()
  setNotice(accepted.length!==incoming.length||accepted.length>room?'Some files were skipped. Maximum 30 images, 35 MB each.':'Images ready for conversion.')
 }
 const applyPreset=(p:ConverterPreset)=>{
  setPreset(p)
  if(p==='web'){setFormat('image/webp');setQuality(85);setResize(false)}
  if(p==='social'){setFormat('image/jpeg');setQuality(90);setResize(true);setMaxDimension(1920)}
  if(p==='print'){setFormat('image/png');setResize(false)}
  if(p==='transparent'){setFormat('image/png');setResize(false)}
  release()
 }
 const convert=async()=>{
  if(running.current||!files.length)return
  running.current=true;setBusy(true);release();setNotice('Converting locally in your browser…')
  const completed:ConvertedImage[]=[],errors:string[]=[]
  try{
   for(const [id,file] of files.entries()){
    try{
     const img=await readImage(file)
     const originalWidth=img.naturalWidth,originalHeight=img.naturalHeight
     const ratio=resize?Math.min(1,maxDimension/Math.max(originalWidth,originalHeight)):1
     const width=Math.max(1,Math.round(originalWidth*ratio)),height=Math.max(1,Math.round(originalHeight*ratio))
     const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
     const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable')
     if(format==='image/jpeg'){ctx.fillStyle=background;ctx.fillRect(0,0,width,height)}
     ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high'
     ctx.drawImage(img,0,0,width,height)
     const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,format,quality/100))
     if(!blob||blob.type!==format)throw Error('Your browser cannot export this format')
     const ext=format==='image/jpeg'?'jpg':format==='image/png'?'png':'webp'
     const filename=`${file.name.replace(/\.[^.]+$/,'')}-aslns.${ext}`
     const originalUrl=URL.createObjectURL(file),outputUrl=URL.createObjectURL(blob)
     urls.current.push(originalUrl,outputUrl)
     completed.push({id,source:file,originalUrl,outputUrl,blob,filename,width,height,originalWidth,originalHeight})
    }catch(e){errors.push(`${file.name}: ${e instanceof Error?e.message:'Conversion failed'}`)}
   }
   setItems(completed);setPreviewIndex(0);setCompare(50)
   setNotice(errors.length?`${completed.length}/${files.length} converted. ${errors.join(' | ')}`:`Successfully converted ${completed.length} image${completed.length===1?'':'s'}.`)
  }finally{running.current=false;setBusy(false)}
 }
 const saveZip=async()=>{
  if(!items.length||packing)return
  setPacking(true)
  try{const blob=await zipFiles(items.map(r=>({name:r.filename,blob:r.blob})));download(blob,'aslns-converted-images.zip');setNotice('ZIP download requested.')}
  catch{setNotice('ZIP creation failed. Try individual downloads.')}
  finally{setPacking(false)}
 }
 const totalBefore=items.reduce((sum,r)=>sum+r.source.size,0),totalAfter=items.reduce((sum,r)=>sum+r.blob.size,0)
 const change=totalBefore?(totalAfter/totalBefore-1)*100:0
 const current=items[previewIndex]||items[0]
 return <div className="th-fields">
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><div className="th-kicker">ASLNS / CREATIVE FORMAT SYSTEMS</div><h3 style={{fontSize:'clamp(24px,4vw,34px)',margin:'6px 0'}}>Image Converter <span style={{color:'#a78bfa'}}>3.0 ✦</span></h3><p className="th-hint">One image. A new dimension. Transform formats without leaving your browser.</p></div><span style={{...mini,fontSize:11,color:'#86efac'}}>◉ PRIVATE · ON-DEVICE</span></div>
  <div style={panel}><div className="th-kicker">01 / YOUR CREATIVE COLLECTION</div><div className="th-file" role="button" tabIndex={0} aria-label="Choose images or drop images" onClick={()=>picker.current?.click()} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();picker.current?.click()}}} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={e=>{e.preventDefault();setDragging(false)}} onDrop={e=>{e.preventDefault();setDragging(false);add(Array.from(e.dataTransfer.files))}} style={{cursor:'pointer',textAlign:'center',padding:'clamp(24px,5vw,45px)',marginTop:14,border:dragging?'2px dashed #c4b5fd':'1px dashed rgba(167,139,250,.5)',borderRadius:18,background:'radial-gradient(circle at 50% 0%,rgba(167,139,250,.15),transparent 70%)'}}><div style={{fontSize:35,marginBottom:8}}>▧</div><strong>DROP IMAGES INTO THE FORMAT STUDIO</strong><p className="th-hint">or click to browse · 30 images maximum · 35 MB per image</p><input ref={picker} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>{add(Array.from(e.target.files||[]));e.target.value=''}}/></div>{files.length>0&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginTop:14}}><span className="th-hint">✦ {files.length} images · {readableSize(files.reduce((sum,f)=>sum+f.size,0))}</span><button type="button" className="th-secondary" disabled={busy} onClick={()=>{setFiles([]);release();setNotice('Collection cleared.')}}>Clear collection ×</button></div>}</div>
  <div style={panel}><div className="th-kicker">02 / SELECT YOUR CONVERSION STYLE</div><p className="th-hint">Pick a creative preset or fine-tune your export.</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:10,margin:'15px 0 20px'}}>{([['web','✦ WEB READY','Modern WebP'],['social','◈ SOCIAL READY','1920 px JPG'],['print','◇ FULL QUALITY','Original-size PNG'],['transparent','▧ ALPHA STUDIO','Transparent PNG'],['custom','⚙ CUSTOM','Your own settings']] as [ConverterPreset,string,string][]).map(([id,name,desc])=><button key={id} type="button" className="th-secondary" aria-pressed={preset===id} onClick={()=>applyPreset(id)} style={{...mini,textAlign:'left',borderColor:preset===id?'#a78bfa':'rgba(167,139,250,.26)',background:preset===id?'rgba(167,139,250,.21)':'rgba(167,139,250,.06)'}}><strong style={{fontSize:12}}>{name}</strong><span style={{display:'block',fontSize:11,opacity:.7,marginTop:6}}>{desc}</span></button>)}</div><div className="th-split"><label>Output format<StudioSelect value={format} onChange={e=>{setFormat(e.target.value as typeof format);setPreset('custom');release()}}><option value="image/webp">WebP · Modern web</option><option value="image/jpeg">JPG · Universal</option><option value="image/png">PNG · Lossless</option></StudioSelect></label><label>Resolution<StudioSelect value={resize?'limited':'original'} onChange={e=>{setResize(e.target.value==='limited');setPreset('custom');release()}}><option value="original">Preserve original dimensions</option><option value="limited">Limit maximum dimension</option></StudioSelect></label></div>{resize&&<label>Maximum width or height<StudioSelect value={maxDimension} onChange={e=>{setMaxDimension(Number(e.target.value));setPreset('custom');release()}}>{[640,1080,1600,1920,2560,4096,8192].map(v=><option key={v} value={v}>{v} px</option>)}</StudioSelect></label>}{format!=='image/png'&&<div style={{marginTop:15}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><strong style={{fontSize:13}}>Output quality</strong><strong style={{color:'#c4b5fd'}}>{quality}%</strong></div><input aria-label="Output quality" type="range" min="10" max="100" value={quality} style={{width:'100%',margin:0}} onChange={e=>{setQuality(Number(e.target.value));setPreset('custom');release()}}/><div style={{display:'flex',justifyContent:'space-between',fontSize:11,opacity:.7,marginTop:7}}><span>SMALLER FILE</span><span>HIGHER FIDELITY</span></div></div>}{format==='image/jpeg'&&<div style={{marginTop:16}}><label>Background for transparent pixels<div style={{display:'flex',alignItems:'center',gap:12,marginTop:8}}><input aria-label="JPG background color" type="color" value={background} onChange={e=>{setBackground(e.target.value);setPreset('custom');release()}} style={{width:55,height:42,padding:2,flex:'0 0 55px'}}/><span style={{fontSize:13}}>{background.toUpperCase()}</span></div></label></div>}<button type="button" disabled={!files.length||busy} onClick={()=>{void convert()}} style={{width:'100%',marginTop:20}}>{busy?'✦ Transforming your images…':`✦ Convert ${files.length||''} image${files.length===1?'':'s'} ↗`}</button><p className="th-hint" style={{marginTop:12}}>All processing happens locally. PNG preserves transparency; JPG replaces transparency with your selected background. PNG ignores the quality slider. Animated images export as a static frame; metadata may be removed.</p></div>
  {items.length>0&&<><div style={panel}><div className="th-kicker">03 / TRANSFORMATION REPORT</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:10,marginTop:15}}>{[['ORIGINAL',readableSize(totalBefore)],['CONVERTED',readableSize(totalAfter)],['SIZE CHANGE',`${change>0?'+':''}${change.toFixed(1)}%`],['FILES',String(items.length)]].map(([label,value])=><div key={label} style={{...mini,textAlign:'center',padding:16}}><div style={{fontSize:10,letterSpacing:1.5,opacity:.7}}>{label}</div><strong style={{display:'block',fontSize:21,color:label==='SIZE CHANGE'?(change<=0?'#86efac':'#fbbf24'):'#e9d5ff',marginTop:8}}>{value}</strong></div>)}</div><p className="th-hint" style={{marginTop:12}}>Conversion changes the file format, not necessarily its size. A larger output is normal for some formats.</p></div><div style={panel}><div className="th-kicker">04 / BEFORE & AFTER VIEWFINDER</div><label>Choose image<StudioSelect value={current.id} onChange={e=>{setPreviewIndex(items.findIndex(r=>r.id===Number(e.target.value)));setCompare(50)}}>{items.map(r=><option key={r.id} value={r.id}>{r.source.name}</option>)}</StudioSelect></label><div style={{position:'relative',width:'100%',height:'clamp(220px,48vw,400px)',overflow:'hidden',borderRadius:16,background:'repeating-conic-gradient(#28243b 0% 25%,#1a1729 0% 50%) 50% / 24px 24px',marginTop:12}}><img src={current.originalUrl} alt="Original image" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain'}}/><div style={{position:'absolute',inset:0,clipPath:`inset(0 0 0 ${compare}%)`}}><img src={current.outputUrl} alt="Converted image" style={{width:'100%',height:'100%',objectFit:'contain'}}/></div><div style={{position:'absolute',top:0,bottom:0,left:`${compare}%`,width:2,background:'#ffffff',boxShadow:'0 0 10px #000',pointerEvents:'none'}}/><span style={{position:'absolute',top:10,left:10,...mini,fontSize:10}}>ORIGINAL</span><span style={{position:'absolute',top:10,right:10,...mini,fontSize:10}}>CONVERTED</span></div><input type="range" aria-label="Before and after comparison slider" min="0" max="100" value={compare} onChange={e=>setCompare(Number(e.target.value))} style={{width:'100%',marginTop:16}}/><p className="th-hint">{current.originalWidth} × {current.originalHeight} original → {current.width} × {current.height} converted.</p></div><div style={panel}><div className="th-kicker">05 / EXPORT YOUR CREATIONS</div><div style={{display:'grid',gap:10,margin:'15px 0'}}>{items.map(r=><div key={r.id} style={{...mini,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div style={{minWidth:0,flex:'1 1 180px'}}><strong style={{overflowWrap:'anywhere',fontSize:13}}>{r.source.name}</strong><div className="th-hint">{r.source.type||'Unknown'} → {r.blob.type} · {readableSize(r.source.size)} → {readableSize(r.blob.size)}</div></div><button type="button" className="th-secondary" onClick={()=>download(r.blob,r.filename)}>↓ Download</button></div>)}</div><button type="button" disabled={packing} onClick={()=>{void saveZip()}} style={{width:'100%'}}>{packing?'✦ Preparing archive…':'↓ Download all as ZIP ↗'}</button></div></>}
  <p role="status" className="th-hint">{notice||'Ready to transform. No uploads. No accounts. Just creativity.'}</p>
 </div>
}

type QRLevel = 'L'|'M'|'Q'|'H'
type QRKind = 'website'|'text'|'email'|'wifi'
type QRTheme = {name:string;foreground:string;background:string;accent:string}
const qrThemes:QRTheme[]=[
 {name:'Obsidian',foreground:'#141027',background:'#ffffff',accent:'#a78bfa'},
 {name:'Midnight',foreground:'#102448',background:'#eef7ff',accent:'#64b5ff'},
 {name:'Forest',foreground:'#123c30',background:'#f3fff7',accent:'#68d6a3'},
 {name:'Rose Gold',foreground:'#63364c',background:'#fff5f6',accent:'#e8a2b6'},
 {name:'Monochrome',foreground:'#101010',background:'#ffffff',accent:'#c0c0c0'},
 {name:'Royal',foreground:'#39205e',background:'#faf3ff',accent:'#d2a4ff'}
]
const qrEscapeWifi=(v:string)=>v.replace(/([\\;,:"])/g,'\\$1')
function QRTool(){
 const [kind,setKind]=useState<QRKind>('website')
 const [value,setValue]=useState('https://aslns.online')
 const [email,setEmail]=useState('')
 const [subject,setSubject]=useState('')
 const [wifiName,setWifiName]=useState('')
 const [wifiPassword,setWifiPassword]=useState('')
 const [wifiSecurity,setWifiSecurity]=useState('WPA')
 const [wifiHidden,setWifiHidden]=useState(false)
 const [size,setSize]=useState(512)
 const [fg,setFg]=useState('#141027')
 const [bg,setBg]=useState('#ffffff')
 const [accent,setAccent]=useState('#a78bfa')
 const [theme,setTheme]=useState('Obsidian')
 const [level,setLevel]=useState<QRLevel>('H')
 const [margin,setMargin]=useState(4)
 const [logo,setLogo]=useState<string|null>(null)
 const [caption,setCaption]=useState('SCAN TO EXPLORE')
 const [showCaption,setShowCaption]=useState(true)
 const [svg,setSvg]=useState('')
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [busy,setBusy]=useState(false)
 const payload=kind==='wifi'?`WIFI:T:${wifiSecurity};S:${qrEscapeWifi(wifiName)};P:${qrEscapeWifi(wifiPassword)};H:${wifiHidden?'true':'false'};;`:kind==='email'?`mailto:${email.trim()}${subject?'?subject='+encodeURIComponent(subject):''}`:value
 const invalid=kind==='wifi'?!wifiName.trim():kind==='email'?!email.trim()||!/^\S+@\S+\.\S+$/.test(email.trim()):!value.trim()
 useEffect(()=>{
  let alive=true
  if(invalid){setSvg('');setError('Complete the content fields to generate your QR code.');return}
  QRCode.toString(payload,{type:'svg',width:size,margin,color:{dark:fg,light:bg},errorCorrectionLevel:logo?'H':level}).then(markup=>{
   const viewBox=markup.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
   const units=viewBox?Number(viewBox[1]):size
   const logoSize=units*.16,backSize=units*.20
   const logoSvg=logo?`<rect x="${(units-backSize)/2}" y="${(units-backSize)/2}" width="${backSize}" height="${backSize}" rx="${units*.018}" fill="${bg}"/><image x="${(units-logoSize)/2}" y="${(units-logoSize)/2}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet" href="${logo}"/>`:''
   if(alive){setSvg(markup.replace('</svg>',`${logoSvg}</svg>`));setError('')}
  }).catch(e=>{if(alive){setSvg('');setError(e instanceof Error?e.message:'QR generation failed.')}})
  return()=>{alive=false}
 },[payload,invalid,size,margin,fg,bg,level,logo])
 const preview=svg?`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`:''
 const chooseTheme=(t:QRTheme)=>{setFg(t.foreground);setBg(t.background);setAccent(t.accent);setTheme(t.name)}
 const loadLogo=(file?:File)=>{
  if(!file)return
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setNotice('Use a PNG, JPG, or WebP logo.');return}
  if(file.size>2*1024*1024){setNotice('Choose a logo smaller than 2 MB.');return}
  const reader=new FileReader()
  reader.onload=()=>{if(typeof reader.result==='string'){setLogo(reader.result);setLevel('H');setNotice('Logo added. Check scanning before publishing.')}}
  reader.onerror=()=>setNotice('Unable to read the logo.')
  reader.readAsDataURL(file)
 }
 const captionText=caption.trim().slice(0,48)
 const makePoster=()=>{
  if(!svg)return ''
  const label=showCaption&&captionText?captionText:''
  const height=size+(label?Math.round(size*.19):0)
  const qrSvg=svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'')
  const safe=label.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${height}" viewBox="0 0 ${size} ${height}"><rect width="100%" height="100%" fill="${bg}"/><svg x="0" y="0" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${qrSvg}</svg>${label?`<text x="${size/2}" y="${size+Math.round(size*.095)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${Math.round(size*.035)}" letter-spacing="${Math.round(size*.004)}" fill="${fg}">${safe}</text>`:''}</svg>`
 }
 const saveSvg=()=>{const poster=makePoster();if(poster)download(new Blob([poster],{type:'image/svg+xml;charset=utf-8'}),'aslns-qr-studio.svg')}
 const savePng=async()=>{
  const poster=makePoster();if(!poster||busy)return
  setBusy(true);setNotice('Rendering your design…')
  const url=URL.createObjectURL(new Blob([poster],{type:'image/svg+xml;charset=utf-8'}))
  try{
   const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Could not render the design.'));img.src=url})
   const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable.')
   ctx.drawImage(image,0,0)
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'))
   if(!blob)throw Error('PNG export failed.')
   download(blob,'aslns-qr-studio.png');setNotice('PNG download requested. Test the exported QR code with your camera.')
  }catch(e){setNotice(e instanceof Error?e.message:'PNG export failed.')}
  finally{URL.revokeObjectURL(url);setBusy(false)}
 }
 const luminance=(hex:string)=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));return c[0]*.2126+c[1]*.7152+c[2]*.0722}
 const contrast=(Math.max(luminance(fg),luminance(bg))+.05)/(Math.min(luminance(fg),luminance(bg))+.05)
 const warn=contrast<4.5||luminance(fg)>=luminance(bg)
 const chip:React.CSSProperties={border:'1px solid rgba(167,139,250,.28)',borderRadius:12,padding:'12px 15px',background:'rgba(167,139,250,.08)',cursor:'pointer',color:'inherit'}
 return <div className="th-fields">
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><div className="th-kicker">ASLNS / CREATIVE SYSTEMS</div><h3 style={{margin:'5px 0',fontSize:'clamp(22px,4vw,32px)'}}>QR Code Studio <span style={{color:accent}}>3.0 ✦</span></h3><p className="th-hint">Craft your code. Make every scan memorable.</p></div><span style={{...chip,fontSize:12}}>✦ LIVE DESIGN ENGINE</span></div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:9}}>{([['website','↗ Website'],['text','✎ Text'],['email','✉ Email'],['wifi','⌁ Wi-Fi']] as [QRKind,string][]).map(([id,name])=><button key={id} type="button" className={kind===id?'':'th-secondary'} style={{...chip,borderColor:kind===id?accent:'rgba(167,139,250,.28)',background:kind===id?`${accent}24`:undefined}} onClick={()=>setKind(id)}>{name}</button>)}</div>
  {kind==='website'&&<label>Website URL<input type="url" value={value} onChange={e=>setValue(e.target.value)} placeholder="https://example.com"/></label>}
  {kind==='text'&&<label>Message<textarea rows={3} value={value} onChange={e=>setValue(e.target.value)} maxLength={2000} placeholder="Write something worth sharing"/></label>}
  {kind==='email'&&<><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="hello@example.com"/></label><label>Subject (optional)<input value={subject} onChange={e=>setSubject(e.target.value)} maxLength={150} placeholder="Let's collaborate"/></label></>}
  {kind==='wifi'&&<><label>Network name (SSID)<input value={wifiName} onChange={e=>setWifiName(e.target.value)} maxLength={100} placeholder="Your Wi-Fi name"/></label><label>Security<StudioSelect value={wifiSecurity} onChange={e=>setWifiSecurity(e.target.value)}><option value="WPA">WPA / WPA2 / WPA3 Personal</option><option value="WEP">WEP</option><option value="nopass">Open network</option></StudioSelect></label>{wifiSecurity!=='nopass'&&<label>Wi-Fi password<input type="text" value={wifiPassword} onChange={e=>setWifiPassword(e.target.value)} maxLength={100} placeholder="Network password"/></label>}<label><input type="checkbox" checked={wifiHidden} onChange={e=>setWifiHidden(e.target.checked)}/> Hidden network</label><p className="th-hint">Anyone with this QR can access the encoded Wi-Fi credentials. Share carefully.</p></>}
  <div><div className="th-kicker" style={{marginBottom:12}}>01 / SELECT YOUR AESTHETIC</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>{qrThemes.map(t=><button key={t.name} type="button" className="th-secondary" onClick={()=>chooseTheme(t)} style={{...chip,textAlign:'left',borderColor:theme===t.name?t.accent:'rgba(167,139,250,.28)',background:theme===t.name?`${t.accent}18`:undefined}}><span style={{display:'inline-flex',gap:4,verticalAlign:'middle',marginRight:8}}><i style={{width:15,height:15,borderRadius:'50%',background:t.foreground,border:'1px solid #888'}}/><i style={{width:15,height:15,borderRadius:'50%',background:t.background,border:'1px solid #888'}}/></span>{t.name}</button>)}</div></div>
  <div className="th-split"><label>Code color<input type="color" value={fg} onChange={e=>{setFg(e.target.value);setTheme('Custom')}}/></label><label>Canvas color<input type="color" value={bg} onChange={e=>{setBg(e.target.value);setTheme('Custom')}}/></label></div>
  <div className="th-split"><label>Export resolution<StudioSelect value={size} onChange={e=>setSize(Number(e.target.value))}><option value={256}>256 px</option><option value={512}>512 px</option><option value={1024}>1024 px</option><option value={2048}>2048 px</option></StudioSelect></label><label>Error correction<StudioSelect value={logo?'H':level} disabled={!!logo} onChange={e=>setLevel(e.target.value as QRLevel)}><option value="L">Low</option><option value="M">Medium</option><option value="Q">Quartile</option><option value="H">High</option></StudioSelect></label></div>
  <label>Quiet zone<StudioSelect value={margin} onChange={e=>setMargin(Number(e.target.value))}><option value={4}>Standard / 4 modules</option><option value={6}>Spacious / 6 modules</option><option value={2}>Compact / 2 modules</option></StudioSelect></label>
  <div className="th-split"><label>Center logo (optional)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{loadLogo(e.target.files?.[0]);e.target.value=''}}/></label><div style={{alignSelf:'end'}}>{logo&&<button type="button" className="th-secondary" onClick={()=>{setLogo(null);setNotice('Logo removed.')}}>Remove logo ×</button>}</div></div>
  <label><input type="checkbox" checked={showCaption} onChange={e=>setShowCaption(e.target.checked)}/> Add a caption below the code</label>
  {showCaption&&<label>Caption<input value={caption} onChange={e=>setCaption(e.target.value)} maxLength={48} placeholder="SCAN TO EXPLORE"/></label>}
  <div style={{border:'1px solid rgba(167,139,250,.35)',borderRadius:24,padding:'clamp(16px,4vw,28px)',background:'radial-gradient(circle at top,rgba(167,139,250,.18),rgba(10,8,24,.7))',textAlign:'center'}}><div className="th-kicker" style={{marginBottom:14}}>02 / YOUR LIVE CREATION</div><div style={{background:bg,padding:'clamp(14px,4vw,26px)',borderRadius:20,maxWidth:360,margin:'0 auto',boxShadow:`0 18px 60px ${accent}24`}}>{preview?<img src={preview} alt="Live QR code preview" style={{width:'100%',display:'block'}}/>:<div style={{color:fg,padding:35}}>Enter content to preview</div>}{showCaption&&captionText&&<div style={{color:fg,fontWeight:800,letterSpacing:2,fontSize:12,marginTop:12,overflowWrap:'anywhere'}}>{captionText}</div>}</div><p className="th-hint" style={{marginTop:14}}>LIVE PREVIEW · {size} PX · {logo?'BRANDED':'CLASSIC'} · {theme.toUpperCase()}</p></div>
  {warn&&<p role="status" style={{color:'#fbbf24'}}>⚠ Low contrast or inverted colors can reduce scanning reliability. Choose a dark code on a light background.</p>}
  {logo&&<p className="th-hint">Logo mode uses high error correction. Some scanners may still fail; verify with a phone.</p>}
  {error&&<p role="alert" className="th-hint">{error}</p>}
  <div className="th-kicker">03 / EXPORT YOUR CREATION</div><div className="th-split"><button type="button" disabled={!svg||busy} onClick={()=>{void savePng()}}>{busy?'Rendering…':'↓ Download PNG'}</button><button type="button" className="th-secondary" disabled={!svg} onClick={saveSvg}>↓ Download SVG</button></div>
  <p className="th-hint" role="status">{notice||'Created locally in your browser. Scan the downloaded design before sharing or printing.'}</p>
 </div>
}

type RGB = {r:number;g:number;b:number}
const hexRgb=(hex:string):RGB=>({r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)})
const rgbHex=({r,g,b}:RGB)=>'#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')
const rgbHsl=({r,g,b}:RGB)=>{const a=r/255,c=g/255,d=b/255,hi=Math.max(a,c,d),lo=Math.min(a,c,d),delta=hi-lo;let h=0;const l=(hi+lo)/2;const s=delta===0?0:delta/(1-Math.abs(2*l-1));if(delta){if(hi===a)h=((c-d)/delta)%6;else if(hi===c)h=(d-a)/delta+2;else h=(a-c)/delta+4;h=(h*60+360)%360}return {h,s:s*100,l:l*100}}
const hslRgb=(h:number,s:number,l:number):RGB=>{s/=100;l/=100;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let a=0,b=0,d=0;if(h<60){a=c;b=x}else if(h<120){a=x;b=c}else if(h<180){b=c;d=x}else if(h<240){b=x;d=c}else if(h<300){a=x;d=c}else{a=c;d=x}return {r:(a+m)*255,g:(b+m)*255,b:(d+m)*255}}
const colorLuminance=(hex:string)=>{const {r,g,b}=hexRgb(hex);const vals=[r,g,b].map(v=>{const c=v/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4});return vals[0]*.2126+vals[1]*.7152+vals[2]*.0722}
const colorContrast=(a:string,b:string)=>{const x=colorLuminance(a),y=colorLuminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
const colorThemes=[{name:'Nebula',colors:['#a78bfa','#6366f1','#22d3ee']},{name:'Ember',colors:['#ff6b6b','#ffb86b','#ffdf8b']},{name:'Ocean',colors:['#0ea5e9','#22d3ee','#0f766e']},{name:'Botanical',colors:['#34d399','#84cc16','#14532d']},{name:'Noir',colors:['#e2e8f0','#94a3b8','#334155']},{name:'Aurora',colors:['#f472b6','#a78bfa','#38bdf8']}]
function ColorTool(){
 const [hex,setHex]=useState('#a78bfa'),[second,setSecond]=useState('#22d3ee'),[angle,setAngle]=useState(135),[harmony,setHarmony]=useState<'complementary'|'analogous'|'triadic'|'split'|'monochrome'>('analogous'),[background,setBackground]=useState('#0b1020'),[foreground,setForeground]=useState('#ffffff'),[notice,setNotice]=useState(''),[saved,setSaved]=useState<string[]>([])
 const rgb=hexRgb(hex),hsl=rgbHsl(rgb),rgbText=`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,hslText=`hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`
 const shift=(degrees:number,lightness=hsl.l,saturation=hsl.s)=>rgbHex(hslRgb((hsl.h+degrees+360)%360,saturation,lightness))
 const palette=harmony==='complementary'?[hex,shift(180),shift(180,Math.min(92,hsl.l+20)),shift(0,Math.max(12,hsl.l-20))]:harmony==='triadic'?[hex,shift(120),shift(240),shift(120,Math.min(90,hsl.l+20))]:harmony==='split'?[hex,shift(150),shift(210),shift(0,Math.min(90,hsl.l+20))]:harmony==='monochrome'?[shift(0,20),shift(0,35),hex,shift(0,65),shift(0,82)]:[shift(-60),shift(-30),hex,shift(30),shift(60)]
 const gradient=`linear-gradient(${angle}deg, ${hex}, ${second})`,ratio=colorContrast(foreground,background)
 const panel:React.CSSProperties={border:'1px solid rgba(167,139,250,.25)',borderRadius:20,padding:'clamp(14px,3vw,24px)',background:'rgba(20,16,42,.45)'}
 const small:React.CSSProperties={border:'1px solid rgba(167,139,250,.3)',borderRadius:12,padding:'10px 12px',background:'rgba(167,139,250,.08)',color:'inherit'}
 const saveText=(content:string,name:string,type='text/plain')=>download(new Blob([content],{type}),name)
 const paletteText=palette.map((v,i)=>`Color ${i+1}: ${v.toUpperCase()}`).join('\n')
 const randomize=()=>{const bytes=crypto.getRandomValues(new Uint8Array(6));setHex(rgbHex({r:bytes[0],g:bytes[1],b:bytes[2]}));setSecond(rgbHex({r:bytes[3],g:bytes[4],b:bytes[5]}));setNotice('Fresh colors generated.')}
 return <div className="th-fields">
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><div className="th-kicker">ASLNS / CREATIVE SYSTEMS</div><h3 style={{fontSize:'clamp(22px,4vw,32px)',margin:'6px 0'}}>Color Lab <span style={{color:'#a78bfa'}}>3.0 ✦</span></h3><p className="th-hint">Your personal color universe. Explore, harmonize, export.</p></div><button type="button" className="th-secondary" onClick={randomize}>✧ Surprise me</button></div>
  <div style={{...panel,background:`radial-gradient(circle at 70% 30%,${hex}45,transparent 65%),rgba(20,16,42,.7)`}}><div className="th-kicker">01 / COLOR EXPLORER</div><div style={{height:140,borderRadius:16,background:hex,margin:'14px 0',boxShadow:`0 14px 48px ${hex}35`}}/><div className="th-split"><label>Base color<input type="color" value={hex} onChange={e=>setHex(e.target.value)}/></label><label>HEX code<input value={hex.toUpperCase()} maxLength={7} onChange={e=>{const v=e.target.value.trim();if(/^#[0-9a-fA-F]{6}$/.test(v))setHex(v.toLowerCase())}} aria-label="Base color HEX"/></label></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:8}}>{[['HEX',hex.toUpperCase()],['RGB',rgbText],['HSL',hslText]].map(([label,value])=><button key={label} type="button" className="th-secondary" style={{...small,textAlign:'left',overflowWrap:'anywhere'}} onClick={()=>copy(value,setNotice)}><strong>{label}</strong><div style={{fontSize:12,marginTop:5}}>{value} · Copy</div></button>)}</div></div>
  <div style={panel}><div className="th-kicker">02 / CURATED COLOR WORLDS</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:10,marginTop:14}}>{colorThemes.map(t=><button key={t.name} type="button" className="th-secondary" style={{...small,textAlign:'left'}} onClick={()=>{setHex(t.colors[0]);setSecond(t.colors[1]);setNotice(`${t.name} colors applied.`)}}><div style={{display:'flex',height:35,overflow:'hidden',borderRadius:8,marginBottom:8}}>{t.colors.map((v,i)=><span key={i} style={{background:v,flex:1}}/>)}</div>{t.name}</button>)}</div></div>
  <div style={panel}><div className="th-kicker">03 / HARMONY GENERATOR</div><label>Color relationship<StudioSelect value={harmony} onChange={e=>setHarmony(e.target.value as typeof harmony)}><option value="analogous">Analogous</option><option value="complementary">Complementary</option><option value="triadic">Triadic</option><option value="split">Split complementary</option><option value="monochrome">Monochromatic</option></StudioSelect></label><div style={{display:'grid',gridTemplateColumns:`repeat(${palette.length},minmax(0,1fr))`,gap:5,marginTop:12}}>{palette.map((v,i)=><button type="button" key={`${i}-${v}`} aria-label={`Copy color ${v}`} title={`Copy ${v}`} onClick={()=>copy(v.toUpperCase(),setNotice)} style={{height:110,background:v,border:'1px solid rgba(255,255,255,.15)',borderRadius:10,cursor:'pointer'}}/>)}</div><div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:9}}>{palette.map((v,i)=><button key={i} type="button" className="th-secondary" style={{...small,fontSize:11,padding:8}} onClick={()=>copy(v.toUpperCase(),setNotice)}>{v.toUpperCase()}</button>)}</div><div className="th-split"><button type="button" className="th-secondary" onClick={()=>copy(paletteText,setNotice)}>Copy palette ↗</button><button type="button" className="th-secondary" onClick={()=>saveText(JSON.stringify({name:'ASLNS Color Lab',harmony,colors:palette},null,2),'aslns-palette.json','application/json')}>Export palette JSON ↓</button></div><button type="button" className="th-secondary" onClick={()=>{setSaved(old=>Array.from(new Set([...old,...palette])).slice(-24));setNotice('Palette added to your session collection.')}}>＋ Save palette to collection</button></div>
  <div style={panel}><div className="th-kicker">04 / GRADIENT ATELIER</div><div style={{height:170,borderRadius:16,background:gradient,margin:'14px 0',boxShadow:`0 15px 45px ${hex}24`}}/><div className="th-split"><label>Start color<input type="color" value={hex} onChange={e=>setHex(e.target.value)}/></label><label>End color<input type="color" value={second} onChange={e=>setSecond(e.target.value)}/></label></div><label>Direction · {angle}°<input type="range" min={0} max={360} value={angle} onChange={e=>setAngle(Number(e.target.value))}/></label><div style={{...small,fontFamily:'monospace',fontSize:12,overflowWrap:'anywhere'}}>background: {gradient};</div><div className="th-split"><button type="button" className="th-secondary" onClick={()=>copy(`background: ${gradient};`,setNotice)}>Copy CSS ↗</button><button type="button" className="th-secondary" onClick={()=>{const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0" gradientTransform="rotate(${angle-90} .5 .5)"><stop stop-color="${hex}"/><stop offset="1" stop-color="${second}"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/></svg>`;saveText(svg,'aslns-gradient.svg','image/svg+xml')}}>Download SVG ↓</button></div></div>
  <div style={panel}><div className="th-kicker">05 / ACCESSIBILITY CHECKER</div><div className="th-split"><label>Text color<input type="color" value={foreground} onChange={e=>setForeground(e.target.value)}/></label><label>Background color<input type="color" value={background} onChange={e=>setBackground(e.target.value)}/></label></div><div style={{padding:22,borderRadius:14,background,color:foreground,margin:'12px 0'}}><strong style={{fontSize:22}}>Design for everyone.</strong><p style={{color:foreground,marginTop:8}}>Readable typography makes every experience better.</p></div><strong>Contrast ratio: {ratio.toFixed(2)}:1</strong><div className="th-stats"><span>Normal text AA: {ratio>=4.5?'PASS':'FAIL'}</span><span>Large text AA: {ratio>=3?'PASS':'FAIL'}</span><span>Normal text AAA: {ratio>=7?'PASS':'FAIL'}</span></div><p className="th-hint">WCAG contrast thresholds: 4.5:1 for normal AA, 3:1 for large AA, and 7:1 for normal AAA. Contrast is one accessibility consideration.</p></div>
  {!!saved.length&&<div style={panel}><div className="th-kicker">06 / YOUR SESSION COLLECTION</div><p className="th-hint">Saved in this tab until you leave the tool.</p><div style={{display:'flex',flexWrap:'wrap',gap:8}}>{saved.map(v=><button key={v} type="button" title={`Use ${v}`} onClick={()=>setHex(v)} style={{width:48,height:48,background:v,border:'2px solid rgba(255,255,255,.5)',borderRadius:12,cursor:'pointer'}}/>)}</div><button type="button" className="th-secondary" onClick={()=>setSaved([])}>Clear collection</button></div>}
  <p role="status" className="th-hint">{notice||'Everything runs locally in your browser. Tap any color or code to copy.'}</p>
 </div>
}

type PasswordMode='random'|'passphrase'|'bulk'
const passwordWords=['amber','anchor','apple','arrow','atlas','autumn','bamboo','beacon','berry','blossom','breeze','brook','canyon','cedar','cherry','cinder','cobalt','comet','coral','cosmos','crystal','dawn','delta','desert','drift','eagle','echo','ember','falcon','fern','flame','forest','frost','galaxy','garden','glacier','golden','harbor','hazel','horizon','island','ivory','jasmine','jewel','juniper','lagoon','lantern','lemon','lilac','lunar','maple','marble','meadow','meteor','midnight','misty','moon','moss','mountain','nebula','oasis','ocean','olive','onyx','opal','orbit','orchid','otter','pearl','pebble','pine','planet','plum','prairie','prism','quartz','raven','river','rose','saffron','sage','shadow','silver','skyline','solar','sparrow','spruce','star','stone','summit','sunrise','sunset','thunder','tiger','timber','topaz','valley','velvet','violet','wave','willow','winter','zephyr']
const secureIndex=(max:number)=>{if(!Number.isSafeInteger(max)||max<1)throw Error('Invalid random range');const limit=Math.floor(0x100000000/max)*max;const buffer=new Uint32Array(1);let n=0;do{crypto.getRandomValues(buffer);n=buffer[0]}while(n>=limit);return n%max}
const secureShuffle=(items:string[])=>{for(let i=items.length-1;i>0;i--){const j=secureIndex(i+1);[items[i],items[j]]=[items[j],items[i]]}return items}
function PasswordTool(){
 const [mode,setMode]=useState<PasswordMode>('random')
 const [length,setLength]=useState(20),[upper,setUpper]=useState(true),[lower,setLower]=useState(true),[digits,setDigits]=useState(true),[symbols,setSymbols]=useState(true),[avoid,setAvoid]=useState(true)
 const [wordCount,setWordCount]=useState(5),[separator,setSeparator]=useState('-'),[capitalize,setCapitalize]=useState(true),[wordNumber,setWordNumber]=useState(true)
 const [bulkCount,setBulkCount]=useState(10),[passwords,setPasswords]=useState<string[]>([]),[revealed,setRevealed]=useState(true),[notice,setNotice]=useState(''),[copied,setCopied]=useState(-1)
 const groups=[upper?'ABCDEFGHIJKLMNOPQRSTUVWXYZ':'',lower?'abcdefghijklmnopqrstuvwxyz':'',digits?'0123456789':'',symbols?'!@#$%^&*_-+=?':''].map(s=>avoid?s.replace(/[O0Il1|]/g,''):s).filter(Boolean)
 const pool=groups.join('')
 const bits=mode==='passphrase'?wordCount*Math.log2(passwordWords.length)+(wordNumber?Math.log2(100):0):length*Math.log2(pool.length||1)
 const strength=bits>=100?'EXCEPTIONAL':bits>=75?'STRONG':bits>=50?'GOOD':bits>=35?'MODERATE':'LOW'
 const accent=strength==='EXCEPTIONAL'?'#86efac':strength==='STRONG'?'#34d399':strength==='GOOD'?'#a78bfa':strength==='MODERATE'?'#fbbf24':'#fb7185'
 const panel:React.CSSProperties={border:'1px solid rgba(167,139,250,.28)',borderRadius:20,padding:'clamp(16px,3vw,24px)',background:'linear-gradient(140deg,rgba(35,25,66,.64),rgba(12,12,30,.75))'}
 const createRandom=()=>{if(!groups.length)throw Error('Enable at least one character group.');if(length<groups.length)throw Error('Length is too short for all selected groups.');const chars=groups.map(g=>g[secureIndex(g.length)]);while(chars.length<length)chars.push(pool[secureIndex(pool.length)]);return secureShuffle(chars).join('')}
 const createPhrase=()=>{const words=Array.from({length:wordCount},()=>{const w=passwordWords[secureIndex(passwordWords.length)];return capitalize?w[0].toUpperCase()+w.slice(1):w});if(wordNumber)words.push(String(secureIndex(100)).padStart(2,'0'));return words.join(separator)}
 const generate=()=>{try{if(!globalThis.crypto?.getRandomValues)throw Error('Secure randomness is unavailable. Use HTTPS.');const count=mode==='bulk'?bulkCount:1;const next=Array.from({length:count},()=>mode==='passphrase'?createPhrase():createRandom());setPasswords(next);setCopied(-1);setNotice(`${count} ${mode==='passphrase'?'passphrase':'password'}${count>1?'s':''} generated on your device using cryptographic randomness.`)}catch(e){setNotice(e instanceof Error?e.message:'Unable to generate securely.')}}
 const clear=()=>{setPasswords([]);setCopied(-1);setNotice('Generated values cleared from this screen. Previously copied values may remain in your clipboard.')}
 const copyOne=async(v:string,i:number)=>{try{await navigator.clipboard.writeText(v);setCopied(i);setNotice('Copied. Clear your clipboard after use, especially on shared devices.')}catch{setNotice('Clipboard access denied. Select the value to copy manually.')}}
 const saveAll=()=>{if(!passwords.length)return;download(new Blob([passwords.join('\n')+'\n'],{type:'text/plain;charset=utf-8'}),'aslns-passwords.txt');setNotice('Text file downloaded. Store it securely and delete it when no longer needed.')}
 const modeChoices:[PasswordMode,string,string][]=[['random','✳ RANDOM','Custom secure strings'],['passphrase','◈ PASSPHRASE','Memorable word combinations'],['bulk','▦ BULK','Multiple unique passwords']]
 return <div className="th-fields">
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><div className="th-kicker">ASLNS / SECURITY SYSTEMS</div><h3 style={{fontSize:'clamp(23px,4vw,33px)',margin:'6px 0'}}>Password Studio <span style={{color:'#a78bfa'}}>3.0 ✦</span></h3><p className="th-hint">A private space to create stronger credentials.</p></div><span style={{border:'1px solid rgba(52,211,153,.35)',color:'#86efac',borderRadius:999,padding:'8px 13px',fontSize:11,letterSpacing:1}}>◉ LOCAL GENERATION</span></div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:10}}>{modeChoices.map(([id,name,desc])=><button key={id} type="button" className="th-secondary" aria-pressed={mode===id} onClick={()=>{setMode(id);setPasswords([]);setNotice('')}} style={{textAlign:'left',borderRadius:16,padding:15,border:mode===id?'1px solid #a78bfa':'1px solid rgba(167,139,250,.2)',background:mode===id?'rgba(167,139,250,.2)':'rgba(167,139,250,.05)'}}><strong>{name}</strong><span style={{display:'block',fontSize:11,opacity:.7,marginTop:6}}>{desc}</span></button>)}</div>
  <div style={panel}><div className="th-kicker">01 / CONFIGURE YOUR KEY</div>
  {mode!=='passphrase'?<>
    <div style={{marginTop:18}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:12}}>
        <span style={{fontSize:13,fontWeight:650}}>Character length</span>
        <strong style={{fontSize:22,color:'#c4b5fd',fontVariantNumeric:'tabular-nums'}}>{length}</strong>
      </div>
      <input aria-label="Password character length" type="range" min="8" max="128" value={length} style={{display:'block',width:'100%',margin:0}} onChange={e=>{setLength(Number(e.target.value));setPasswords([])}}/>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,opacity:.7,marginTop:9}}><span>8</span><span>64</span><span>128</span></div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',columnGap:22,rowGap:14,marginTop:22}}>
      {([[upper,setUpper,'ABC · Uppercase'],[lower,setLower,'abc · Lowercase'],[digits,setDigits,'123 · Numbers'],[symbols,setSymbols,'#@! · Symbols']] as [boolean,(v:boolean)=>void,string][]).map(([v,set,label])=>
        <label key={label} style={{display:'flex',flexDirection:'row',justifyContent:'flex-start',alignItems:'center',gap:12,margin:0,textAlign:'left',cursor:'pointer',fontSize:13,fontWeight:600}}>
          <input type="checkbox" checked={v} style={{width:17,height:17,flex:'0 0 17px',margin:0,accentColor:'#a78bfa'}} onChange={e=>{set(e.target.checked);setPasswords([])}}/>
          <span>{label}</span>
        </label>
      )}
    </div>
    <label style={{display:'flex',flexDirection:'row',justifyContent:'flex-start',alignItems:'center',gap:12,margin:'22px 0 0',textAlign:'left',cursor:'pointer',fontSize:13}}>
      <input type="checkbox" checked={avoid} style={{width:17,height:17,flex:'0 0 17px',margin:0,accentColor:'#a78bfa'}} onChange={e=>{setAvoid(e.target.checked);setPasswords([])}}/>
      <span>Avoid visually ambiguous characters (O, 0, I, l, 1)</span>
    </label>
    {!groups.length&&<p role="alert" style={{color:'#fbbf24'}}>Select at least one character group.</p>}
  </>:<>
    <label>Words per passphrase · <strong>{wordCount}</strong><input type="range" min="4" max="10" value={wordCount} onChange={e=>{setWordCount(Number(e.target.value));setPasswords([])}}/></label>
    <label>Word separator<StudioSelect value={separator} onChange={e=>{setSeparator(e.target.value);setPasswords([])}}><option value="-">Hyphen —</option><option value=".">Period ·</option><option value="_">Underscore _</option><option value=" ">Space</option></StudioSelect></label>
    <div style={{display:'grid',gap:12,margin:'14px 0'}}>
      <label style={{display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'flex-start',gap:12,textAlign:'left',margin:0}}><input type="checkbox" checked={capitalize} style={{width:17,height:17,margin:0,accentColor:'#a78bfa'}} onChange={e=>{setCapitalize(e.target.checked);setPasswords([])}}/><span>Capitalize words</span></label>
      <label style={{display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'flex-start',gap:12,textAlign:'left',margin:0}}><input type="checkbox" checked={wordNumber} style={{width:17,height:17,margin:0,accentColor:'#a78bfa'}} onChange={e=>{setWordNumber(e.target.checked);setPasswords([])}}/><span>Add random number</span></label>
    </div>
    <p className="th-hint">Passphrases use a built-in word list of {passwordWords.length} words. For highly sensitive accounts, use longer random passwords or a dedicated password manager.</p>
  </>}
  {mode==='bulk'&&<label>Number of passwords · <strong>{bulkCount}</strong><input type="range" min="2" max="30" value={bulkCount} onChange={e=>{setBulkCount(Number(e.target.value));setPasswords([])}}/></label>}</div>
  <div style={{...panel,background:'radial-gradient(circle at 90% 0%,rgba(167,139,250,.17),transparent 65%),rgba(12,12,30,.85)'}}><div className="th-kicker">02 / SECURITY METER</div><div style={{display:'flex',alignItems:'baseline',gap:12,margin:'12px 0 6px',flexWrap:'wrap'}}><strong style={{fontSize:27,color:accent}}>{strength}</strong><span className="th-hint">~{Math.floor(bits)} bits estimated entropy</span></div><div style={{height:9,borderRadius:99,background:'rgba(255,255,255,.1)',overflow:'hidden'}}><div style={{width:`${Math.min(100,bits/110*100)}%`,height:'100%',background:`linear-gradient(90deg,#a78bfa,${accent})`,borderRadius:99,transition:'width .3s'}}/></div><p className="th-hint" style={{marginTop:12}}>This is a theoretical estimate based on the selected generation settings, not a guarantee of account security. Unique passwords and multi-factor authentication matter.</p></div>
  <button type="button" disabled={mode!=='passphrase'&&!groups.length} onClick={generate}>✳ Generate {mode==='bulk'?`${bulkCount} passwords`:mode==='passphrase'?'passphrase':'secure password'} ↗</button>
  {!!passwords.length&&<div style={panel}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div className="th-kicker">03 / GENERATED RESULTS · {passwords.length}</div><button type="button" className="th-secondary" onClick={()=>setRevealed(v=>!v)}>{revealed?'◉ Hide':'◎ Reveal'} values</button></div><div style={{display:'grid',gap:9,marginTop:14}}>{passwords.map((p,i)=><div key={i} style={{display:'flex',gap:8,alignItems:'center',border:'1px solid rgba(167,139,250,.2)',borderRadius:13,padding:9,background:'rgba(0,0,0,.18)'}}><span style={{fontSize:11,opacity:.55,minWidth:20}}>{String(i+1).padStart(2,'0')}</span><input aria-label={`Generated ${mode==='passphrase'?'passphrase':'password'} ${i+1}`} readOnly type={revealed?'text':'password'} value={p} onFocus={e=>e.target.select()} style={{flex:1,minWidth:0,background:'transparent',border:'none',color:'inherit',fontFamily:'monospace',fontSize:13}}/><button type="button" className="th-secondary" onClick={()=>{void copyOne(p,i)}} style={{flexShrink:0}}>{copied===i?'✓ Copied':'Copy ↗'}</button></div>)}</div><div className="th-split" style={{marginTop:12}}>{passwords.length>1&&<button type="button" className="th-secondary" onClick={saveAll}>↓ Export TXT</button>}<button type="button" className="th-secondary" onClick={clear}>✕ Clear results</button></div></div>}
  <p className="th-hint" role="status">{notice||'No password history is stored by this tool. Generated values stay in this browser tab until cleared or the page is closed.'}</p>
  <p className="th-hint">Security tip: Never reuse passwords. Save them in a trusted password manager. A downloaded text file or clipboard copy may be accessible to other applications.</p>
 </div>
}


export default function ToolsHub(){const [active,setActive]=useState<ToolId|null>(null),[query,setQuery]=useState(''),[category,setCategory]=useState('ALL');

const [mobile,setMobile]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width: 760px)').matches);

const [lite,setLite]=useState(()=>typeof window!=='undefined'&&(window.matchMedia('(max-width: 760px)').matches||window.matchMedia('(prefers-reduced-motion: reduce)').matches));

useEffect(()=>{const mq=window.matchMedia('(max-width: 760px)');const sync=()=>{setMobile(mq.matches);if(!mq.matches)setLite(false);else setLite(true)};mq.addEventListener('change',sync);return()=>mq.removeEventListener('change',sync)},[]);

useEffect(()=>{document.title='Free Online Tools | AMSOULNESS';return()=>{document.title='AMSOULNESS | Emmanuel Cherian'}},[]);const selected=cards.find(c=>c.id===active);const filtered=cards.filter(c=>(category==='ALL'||c.tag===category)&&`${c.name} ${c.desc}`.toLowerCase().includes(query.toLowerCase()));return <main className={`th th-v13 ${mobile&&lite?'th-lite':''}`}><style>{studioStyles}</style><ImmersiveMotion enabled={!lite}/><MotionFX enabled={!lite && (typeof window==="undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches)}/><CosmicCanvas active={!lite}/><div className="th-atmosphere" aria-hidden="true"><div className="th-energy-core"/><div className="th-portal th-portal-outer"/><div className="th-portal th-portal-middle"/><div className="th-portal th-portal-inner"/><div className="th-light-ribbon th-light-ribbon-a"/><div className="th-light-ribbon th-light-ribbon-b"/><div className="th-satellite th-satellite-a"/><div className="th-satellite th-satellite-b"/><div className="th-aurora th-a"/><div className="th-aurora th-b"/><div className="th-aurora th-c"/><div className="th-stars">{Array.from({length:42},(_,i)=><i key={i} style={{left:`${(i*37.13)%100}%`,top:`${(i*61.77)%100}%`,animationDelay:`-${(i%9)*.7}s`}}/>)}</div><div className="th-gridlight"/><div className="th-nebula"/><div className="th-prism th-prism-one"/><div className="th-prism th-prism-two"/><div className="th-wave th-wave-a"/><div className="th-wave th-wave-b"/><div className="th-particle-cloud">{Array.from({length:130},(_,i)=><i key={i} style={{left:`${(i*73.31+13)%100}%`,top:`${(i*47.91+7)%100}%`,animationDelay:`-${(i*1.37)%18}s`,animationDuration:`${7+(i%13)}s`,width:i%9===0?3:1.5,height:i%9===0?3:1.5}}/>)}</div><div className="th-beam th-beam-one"/><div className="th-beam th-beam-two"/><div className="th-orbit th-orbit-one"/><div className="th-orbit th-orbit-two"/><div className="th-meteors">{Array.from({length:9},(_,i)=><i key={i} style={{left:`${(i*17.7+9)%100}%`,top:`${(i*13.7+5)%80}%`,animationDelay:`-${i*2.6}s`}}/>)}</div><div className="th-sparks">{Array.from({length:28},(_,i)=><i key={i} style={{left:`${(i*29.3+4)%100}%`,top:`${(i*43.7+9)%100}%`,animationDelay:`-${i*.53}s`}}/>)}</div></div><header className="th-nav th-nav-v21">

  <div className="th-nav-v21-main">

    <a className="th-v21-identity" href="/" aria-label="AMSOULNESS portfolio homepage">

      <span className="th-v21-emblem" aria-hidden="true"><span>A</span><i/></span>

      <span className="th-v21-name"><strong>AMSOUL<span>NESS.</span></strong><small>CREATIVE SYSTEMS <b>✦</b> DIGITAL UNIVERSE</small></span>

    </a>

    <div className="th-v21-location" aria-label="Current section"><span className="th-v21-live"/> <span>THE TOOL LAB</span><span className="th-v21-slash">/ 001</span></div>

    <nav className="th-v21-actions" aria-label="Tools page navigation">

      {mobile&&<button className="th-v21-mode" type="button" aria-pressed={!lite} aria-label={lite?'Enable cinematic effects':'Enable smooth mobile mode'} onClick={()=>setLite(v=>!v)}><span aria-hidden="true">{lite?'⚡':'✦'}</span><span>{lite?'SMOOTH':'CINEMATIC'}</span></button>}

      <a className="th-v21-return" href="/"><span className="th-v21-return-icon" aria-hidden="true">←</span><span>PORTFOLIO</span></a>

    </nav>

  </div>

  <div className="th-v21-track" aria-hidden="true"><span/></div>

</header><div className="th-wrap"><div className="th-hero"><div className="th-hero-circuit" aria-hidden="true"><span/><span/><span/><span/></div><div className="th-halo" aria-hidden="true"><div/></div><div className="th-eyebrow"><span className="th-dot"/> ASLNS / THE CREATIVE TOOLKIT</div><h1 className="th-kinetic-title th-v20-title"><span className="th-v20-line">TOOLS FOR</span><span className="th-v20-line th-v20-gradient">BIG IDEAS<span className="th-title-period">.</span></span></h1><p>Six powerful tools for creators and developers. Simple, fast, and ready when inspiration strikes.</p><div className="th-hero-manifesto"><span className="th-manifesto-line"/> <span>YOUR NEXT BIG IDEA STARTS HERE</span> <span className="th-manifesto-line"/></div><div className="th-hero-rule"/><div className="th-hero-meta"><span>✦ 6 CREATIVE ESSENTIALS</span><span>✦ MADE FOR EVERY SCREEN</span><span>✦ BUILT FOR CREATORS</span></div></div>{active&&selected?<section className="th-workspace"><button type="button" className="th-back th-studio-back" onClick={()=>{setActive(null);window.scrollTo({top:0,behavior:"smooth"})}}><span className="th-studio-back-icon" aria-hidden="true">↖</span><span>RETURN TO THE LAB<span className="th-studio-back-sub">EXPLORE ALL SIX TOOLS</span></span></button><div className="th-workspace-heading"><span className="th-big-icon">{selected.icon}</span><div><div className="th-kicker">ASLNS LAB / {selected.tag}</div><h2>{selected.name}</h2><p>{selected.desc}</p></div></div><div className="th-panel">{active==='compress'&&<ImageTool/>}{active==='convert'&&<ConverterTool/>}{active==='qr'&&<QRTool/>}{active==='color'&&<ColorTool/>}{active==='password'&&<PasswordTool/>}{active==='whatsapp'&&<WhatsAppProfileTool/>}</div></section>:<><div className="th-toolbar"><label className="th-search"><span>⌕</span><input aria-label="Search tools" placeholder="What will you create today?" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="th-filters">{['ALL','CREATOR','DESIGN','UTILITY','SECURITY'].map(c=><button key={c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{cap(c.toLowerCase())}</button>)}</div></div><div className="th-collection-heading"><div className="th-collection-kicker">/ EXPLORE THE LAB</div><h2 className="th-v20-section-title">Find your <em>creative edge.</em></h2><p>Little tools. Limitless possibilities.</p></div><div className="th-grid">{filtered.map((tool,i)=><button className="th-card th-v22-card" style={{animationDelay:`${Math.min(i,7)*85}ms`}} key={tool.id} onClick={()=>{setActive(tool.id);window.scrollTo({top:0,behavior:'auto'})}}><div className="th-card-top"><span className="th-card-icon">{tool.icon}</span><span className="th-card-number">{String(i+1).padStart(2,'0')} / {String(cards.length).padStart(2,'0')}</span></div><div className="th-tag">{tool.tag} / CREATIVE LAB</div><h2 className="th-card-title">{tool.name}</h2><p>{tool.desc}</p><div className="th-card-bottom">LAUNCH EXPERIENCE <span>↗</span></div></button>)}</div>{!filtered.length&&<p className="th-empty">Nothing in this orbit yet. Try a different search.</p>}</>}<footer className="th-footer"><span>© 2026 AMSOULNESS / ASLNS</span><span>BUILT FOR THE CURIOUS · <a href="/">BACK TO PORTFOLIO ↗</a></span></footer></div></main>}
