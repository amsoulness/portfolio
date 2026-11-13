const ToolsHub = lazy(() => import('./ToolsHub'))
import ToolsLoading from './ToolsLoading'
import { lazy, Suspense, useCallback, useEffect, useRef, useState, useTransition } from 'react'
import type { ReactNode, CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'

const normalizeSitePath = (path: string) => path.replace(/\/$/, '') || '/'

const GITHUB = 'https://github.com/amsoulness'
const LINKEDIN = 'https://linkedin.com/in/aslns/'
const EMAIL = 'mailto:godblessyou20061@gmail.com'
// WhatsApp number with country code, digits only.
const WHATSAPP_NUMBER = '918848060663'

const skills = ['Python','Java','JavaScript','C','CSS','Node.js','Problem Solving','Cybersecurity','AI Fundamentals','Creative Development']
const skillDetails:Record<string,{category:string,description:string,accent:string,mark:string}> = {
 Python:{category:'LANGUAGE',description:'Automation & scripting',accent:'#ffd34e',mark:'01'},
 Java:{category:'LANGUAGE',description:'Object-oriented systems',accent:'#f16e60',mark:'02'},
 JavaScript:{category:'WEB ENGINE',description:'Interactive experiences',accent:'#f7df1e',mark:'03'},
 C:{category:'LANGUAGE',description:'Core programming',accent:'#79b9ff',mark:'04'},
 CSS:{category:'WEB DESIGN',description:'Visual styling & layouts',accent:'#5cc8ff',mark:'05'},
 'Node.js':{category:'RUNTIME',description:'Backend development',accent:'#7bd46b',mark:'06'},
 'Problem Solving':{category:'MINDSET',description:'Logic & critical thinking',accent:'#c2a1ff',mark:'07'},
 Cybersecurity:{category:'SECURITY',description:'Digital protection',accent:'#72e5d1',mark:'08'},
 'AI Fundamentals':{category:'ARTIFICIAL INTELLIGENCE',description:'Models & emerging tools',accent:'#f09de9',mark:'09'},
 'Creative Development':{category:'CREATIVE TECH',description:'Code meets design',accent:'#ffb67a',mark:'10'},
}
const creativeProjects = [
 {title:'Cinematic Edits',category:'CREATIVE / CINEMATIC',description:'Movie, web-series and anime edits with deliberate pacing, sound design, transitions and cinematic visual effects.',tags:['After Effects','Storytelling','VFX']},
 {title:'Reels & Short-Form',category:'CREATIVE / SOCIAL',description:'Fast-paced social edits combining kinetic typography, rhythmic cuts and engaging visual storytelling.',tags:['Reels','Motion','Editing']},
 {title:'Independent Client Work',category:'CREATIVE / CLIENTS',description:'Independent video editing assignments, including creative work connected with Dubai.',tags:['Post-production','Clients','Creative']}
]
const editingTools = [
 {name:'Adobe After Effects',level:'Intermediate to advanced',progress:82},
 {name:'Adobe Premiere Pro',level:'Basic',progress:42},
 {name:'DaVinci Resolve',level:'Beginner',progress:25}
]
const experiences = [
  { date:'30 MAR — 20 MAY 2026', title:'Cyber Security Internship', company:'Adzink Studio', description:'Participated in cybersecurity internship activities and practical assignments.' },
  { date:'19 — 23 OCT 2024', title:'AI Project Development', company:'AccelerateX', description:'Completed a five-day program focused on AI modelling, data processing and implementation.' },
  { date:'INDEPENDENT CREATIVE PRACTICE', title:'Self-Taught Video Editor', company:'AMSOULNESS / ASLNS', description:'Approximately five years of creative exploration in movie, web-series, anime, social and independent client edits.' },
  { date:'2024 — 2027 (EXPECTED)', title:'Bachelor of Computer Applications', company:'Al Azhar College of Arts and Science', description:'Mahatma Gandhi University, Kerala.' }
]

// Official product sites and reputable learning resources. Each link opens separately.
const resourceLinks: Record<string,string> = {
  Python:'https://www.python.org/', Java:'https://www.java.com/', JavaScript:'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
  C:'https://en.cppreference.com/w/c', CSS:'https://developer.mozilla.org/en-US/docs/Web/CSS', 'Node.js':'https://nodejs.org/',
  'Problem Solving':'https://en.wikipedia.org/wiki/Problem_solving', Cybersecurity:'https://www.cisa.gov/',
  'AI Fundamentals':'https://en.wikipedia.org/wiki/Artificial_intelligence',
  'Creative Development':'https://developer.mozilla.org/en-US/docs/Learn_web_development',
  'Adobe After Effects':'https://www.adobe.com/products/aftereffects.html',
  'Adobe Premiere Pro':'https://www.adobe.com/products/premiere.html',
  'DaVinci Resolve':'https://www.blackmagicdesign.com/products/davinciresolve',
  'After Effects':'https://www.adobe.com/products/aftereffects.html',
  'VFX':'https://en.wikipedia.org/wiki/Visual_effects',
  'Storytelling':'https://en.wikipedia.org/wiki/Storytelling',
  'Reels':'https://www.instagram.com/',
  'Motion':'https://en.wikipedia.org/wiki/Motion_graphics',
  'Editing':'https://en.wikipedia.org/wiki/Video_editing',
  'Post-production':'https://en.wikipedia.org/wiki/Post-production',
  'Clients':'https://en.wikipedia.org/wiki/Freelancer',
  'Creative':'https://en.wikipedia.org/wiki/Creativity',
  'Automation':'https://en.wikipedia.org/wiki/Automation',
}
type Inspiration = { category:string; title:string; subtitle:string; url:string; wiki?:string; image?:string; credit?:string; creditUrl?:string; monogram:string }
const inspirations: Inspiration[] = [
 {category:'MOVIES',title:'Avengers: Doomsday',subtitle:'Marvel Studios · Film',url:'https://en.wikipedia.org/wiki/Avengers:_Doomsday',wiki:'Avengers: Doomsday',monogram:'A'},
 {category:'WEB SERIES',title:'Game of Thrones',subtitle:'HBO · Fantasy series',url:'https://en.wikipedia.org/wiki/Game_of_Thrones',wiki:'Game of Thrones',image:'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/The_castle_walls_of_the_set_for_Game_of_Thrones_%2852205003529%29.jpg/960px-The_castle_walls_of_the_set_for_Game_of_Thrones_%2852205003529%29.jpg',credit:'Steve Jurvetson · CC BY 2.0',creditUrl:'https://commons.wikimedia.org/wiki/File:The_castle_walls_of_the_set_for_Game_of_Thrones_(52205003529).jpg',monogram:'G'},
 {category:'ANIME',title:'Attack on Titan',subtitle:'Anime · Dark fantasy',url:'https://en.wikipedia.org/wiki/Attack_on_Titan_(TV_series)',wiki:'Attack on Titan (TV series)',image:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Bymurene_i_Attack_on_Titan.jpg/960px-Bymurene_i_Attack_on_Titan.jpg',credit:'EliasEgeMel · CC BY-SA 4.0',creditUrl:'https://commons.wikimedia.org/wiki/File:Bymurene_i_Attack_on_Titan.jpg',monogram:'進'},
 {category:'ANIME',title:'Solo Leveling',subtitle:'Anime · Action fantasy',url:'https://en.wikipedia.org/wiki/Solo_Leveling',wiki:'Solo Leveling',monogram:'S'},
 {category:'K-DRAMA',title:'Guardian: The Lonely and Great God',subtitle:'Goblin · Korean drama',url:'https://en.wikipedia.org/wiki/Guardian:_The_Lonely_and_Great_God',wiki:'Guardian: The Lonely and Great God',monogram:'G'},
 {category:'MUSIC',title:'Angel',subtitle:'Massive Attack · Mezzanine',url:'https://en.wikipedia.org/wiki/Mezzanine_(album)',wiki:'Mezzanine (album)',monogram:'♫'},
 {category:'MUSIC',title:'Lilith',subtitle:'Saint Avangeline · Music',url:'https://www.youtube.com/results?search_query=Saint+Avangeline+Lilith',monogram:'♪'},
 {category:'BOOKS',title:'The Culture Code',subtitle:'Daniel Coyle · Book',url:'https://en.wikipedia.org/wiki/Daniel_Coyle_(author)',wiki:'Daniel Coyle (author)',monogram:'C'},
 {category:'TECHNOLOGY',title:'ChatGPT',subtitle:'OpenAI · AI assistant',url:'https://chatgpt.com/',wiki:'ChatGPT',monogram:'✳'},
 {category:'TECHNOLOGY',title:'Gemini',subtitle:'Google · AI assistant',url:'https://gemini.google.com/',wiki:'Gemini (chatbot)',monogram:'✦'},
 {category:'VIDEO EDITING',title:'Adobe After Effects',subtitle:'Motion graphics · VFX',url:'https://www.adobe.com/products/aftereffects.html',monogram:'Ae'},
]
// Online artwork: Wikimedia article thumbnails, Open Library book covers,
// Apple Music catalog artwork, and official product imagery.
// Cards keep their illustrated fallback if a provider has no usable image.
async function getInspirationImage(item:Inspiration, signal:AbortSignal):Promise<string|null> {
  if(item.image)return item.image
  try {
    if(item.category==='BOOKS'){
      const r=await fetch('https://openlibrary.org/search.json?title=The%20Culture%20Code&author=Daniel%20Coyle&limit=5',{signal})
      if(r.ok){const d=await r.json();const match=(d.docs||[]).find((x:{cover_i?:number,title?:string})=>x.cover_i&&x.title?.toLowerCase().includes('culture code'));if(match?.cover_i)return `https://covers.openlibrary.org/b/id/${match.cover_i}-L.jpg?default=false`}
    }
    if(item.title==='ChatGPT')return 'https://cdn.simpleicons.org/openai/74AA9C'
    if(item.title==='Gemini')return 'https://cdn.simpleicons.org/googlegemini/8E75B2'
    if(item.title==='Adobe After Effects')return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/aftereffects/aftereffects-original.svg'
    if(item.title==='Game of Thrones'||item.title==='Attack on Titan'){
      // Try the page summary image first; fall back to the MediaWiki pageimages API below.
      const page=item.title==='Game of Thrones'?'Game_of_Thrones':'Attack_on_Titan_(TV_series)'
      try{
        const res=await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${page}`,{signal,headers:{Accept:'application/json'}})
        if(res.ok){const data=await res.json();const art=data.originalimage?.source||data.thumbnail?.source;if(art)return art}
      }catch(e){if(signal.aborted)return null}
    }
    if(item.category==='MUSIC'){
      const term=item.title==='Angel'?'Massive Attack Angel':'Saint Avangeline Lilith'
      const r=await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=20`,{signal})
      if(r.ok){const d=await r.json();const match=(d.results||[]).find((x:{artistName?:string,trackName?:string,artworkUrl100?:string})=>x.artistName?.toLowerCase().includes(item.title==='Angel'?'massive attack':'saint avangeline')&&x.trackName?.toLowerCase().includes(item.title.toLowerCase()));if(match?.artworkUrl100)return match.artworkUrl100.replace('100x100bb','600x600bb')}
    }
    if(item.wiki){
      const params=new URLSearchParams({action:'query',format:'json',origin:'*',prop:'pageimages',piprop:'thumbnail',pilicense:'any',pithumbsize:'800',titles:item.wiki})
      const r=await fetch(`https://en.wikipedia.org/w/api.php?${params}`,{signal})
      if(r.ok){const d=await r.json();const page=Object.values(d.query?.pages||{})[0] as {thumbnail?:{source?:string}}|undefined;if(page?.thumbnail?.source)return page.thumbnail.source}
    }
  }catch(e){if(signal.aborted)return null}
  return null
}
function InspirationCard({item,index}:{item:Inspiration,index:number}) {
  const [image,setImage]=useState<string|null>(null)
  const [failed,setFailed]=useState(false)
  useEffect(()=>{
    const controller=new AbortController()
    setFailed(false)
    getInspirationImage(item,controller.signal).then(url=>{if(!controller.signal.aborted)setImage(url)})
    return ()=>controller.abort()
  },[item.title])
  const logo=item.title==='ChatGPT'||item.title==='Gemini'||item.title==='Adobe After Effects'
  return <motion.div className="inspiration-card" role="group"
    initial={{opacity:0,y:25}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.12}}
    transition={{duration:.45,delay:Math.min(index%4,3)*.07}} whileHover={{y:-9,scale:1.025}} whileTap={{scale:.965}}>
    <div className={`inspiration-art inspiration-art-${index%6}${logo?' inspiration-logo-art':''}`}>
      <a className="inspiration-art-link" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Explore ${item.title} in a new tab`}>
        {image&&!failed?<img src={image} alt={`${item.title} artwork`} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<div className="inspiration-monogram" aria-hidden="true">{item.monogram}</div>}
        <span className="inspiration-shine" aria-hidden="true"/>
        <span className="inspiration-category">{item.category}</span>
      </a>
      {item.credit&&item.creditUrl&&<a className="inspiration-credit" href={item.creditUrl} target="_blank" rel="noopener noreferrer" aria-label={`Image credit and license: ${item.credit}`}>{item.credit}</a>}
    </div>
    <a className="inspiration-info inspiration-info-link" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Explore ${item.title} in a new tab`}><strong>{item.title}</strong><span>{item.subtitle}</span><span className="inspiration-arrow" aria-hidden="true">↗</span></a>
  </motion.div>
}
function ResourceTag({name}:{name:string}) {
  const url=resourceLinks[name]
  return url ? <a className="tag resource-tag" href={url} target="_blank" rel="noopener noreferrer" aria-label={`Learn about ${name} (opens in a new tab)`}>{name} <span aria-hidden="true">↗</span></a> : <span className="tag">{name}</span>
}

const particles = Array.from({length:170}, (_,i)=>({x:(i*73+11)%100,y:(i*47+19)%100,size:1+i%3,delay:i%9*.4,duration:3+i%5}))
const comets = Array.from({length:16},(_,i)=>({left:(i*37+9)%100,delay:i*.73,duration:6+i%6}))
const extraStars=Array.from({length:210},(_,i)=>({x:(i*67+17)%100,y:(i*41+29)%100,delay:(i%17)*.31,size:i%7===0?3:1.5}))
const orbitSparks=Array.from({length:9},(_,i)=>({angle:i*40,delay:i*.32}))
const dust=Array.from({length:100},(_,i)=>({x:(i*59+13)%100,y:(i*83+7)%100,delay:(i%23)*.31,size:i%9===0?3:1}))
const ribbons=Array.from({length:8},(_,i)=>({x:(i*23+7)%100,delay:i*1.3,duration:14+i*2}))
const techImages: Record<string,string> = {
  Python:'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg',
  Java:'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg',
  JavaScript:'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg',
  C:'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/c/c-original.svg',
  CSS:'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/css3/css3-original.svg',
  'Node.js':'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg',
  'Adobe After Effects':'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/aftereffects/aftereffects-original.svg',
  'Adobe Premiere Pro':'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/premierepro/premierepro-original.svg',
}
const skillSymbols: Record<string,string> = {'Problem Solving':'◇','Cybersecurity':'⬡','AI Fundamentals':'✳','Creative Development':'✦'}
function TechIcon({name}:{name:string}) {
  const [failed,setFailed]=useState(false)
  const image=techImages[name]
  if(name==='DaVinci Resolve')return <span className="tech-icon resolve-icon" aria-hidden="true"><svg viewBox="0 0 64 64" width="44" height="44"><circle cx="32" cy="18" r="13" fill="#f5c85a"/><circle cx="19" cy="42" r="13" fill="#ed6472"/><circle cx="45" cy="42" r="13" fill="#5cc3e5"/><circle cx="32" cy="33" r="8" fill="#1c1828"/></svg></span>
  return <span className="tech-icon" aria-hidden="true">{image&&!failed?<img src={image} alt="" loading="lazy" onError={()=>setFailed(true)}/>:<span>{skillSymbols[name]||name.slice(0,2)}</span>}</span>
}
function ProjectArtwork({kind}:{kind:number}) {
  return <div className={`project-art art-${kind}`} aria-hidden="true">
    <div className="art-grid"/><div className="art-glow"/>
    {kind===0?<><div className="art-chat chat-a">●●●</div><div className="art-chat chat-b">✓ ✓</div><div className="art-terminal">{'{ }'} <span>BOT ACTIVE</span></div></>:
    kind===1?<><div className="art-frame frame-a"/><div className="art-frame frame-b"/><div className="art-play">▶</div><div className="art-caption">CINEMATIC / 24 FPS</div></>:
    kind===2?<><div className="art-phone"><div className="art-phone-screen">▶</div></div><div className="art-caption">SHORT FORM / MOTION</div></>:
    <><div className="art-diamond">✧</div><div className="art-caption">CREATIVE / CLIENT WORK</div></>}
  </div>
}
const streaks=Array.from({length:12},(_,i)=>({left:(i*79+7)%100,delay:i*.7,duration:5+i%5}))
function Reveal({children,delay=0}:{children:ReactNode,delay?:number}){
  const reduce=useReducedMotion()
  return <motion.div initial={reduce?false:{opacity:0,y:42,filter:'blur(5px)'}} whileInView={{opacity:1,y:0,filter:'blur(0px)'}} viewport={{once:true,amount:.12}} transition={{duration:.75,delay}}>{children}</motion.div>
}
function Heading({index,kicker,title}:{index:string,kicker:string,title:string}){
  return <Reveal><div className="section-heading"><span className="eyebrow">{index} / {kicker}</span><h2>{title}</h2><div className="rule"/></div></Reveal>
}
function MagneticLink({href,children,primary=false,external=false}:{href:string,children:ReactNode,primary?:boolean,external?:boolean}){
  const ref=useRef<HTMLAnchorElement>(null)
  const [offset,setOffset]=useState({x:0,y:0})
  const reduce=useReducedMotion()
  return <motion.a ref={ref} href={href} target={external?'_blank':undefined} rel={external?'noopener noreferrer':undefined} className={`btn ${primary?'primary':'outline'}`} animate={reduce?{}:offset} transition={{type:'spring',stiffness:180,damping:15}} whileHover={reduce?{}:{scale:1.045}} whileTap={{scale:.94}} onPointerMove={e=>{if(reduce||e.pointerType!=='mouse')return;const r=ref.current?.getBoundingClientRect();if(r)setOffset({x:(e.clientX-r.left-r.width/2)*.12,y:(e.clientY-r.top-r.height/2)*.12})}} onPointerLeave={()=>setOffset({x:0,y:0})}>{children}</motion.a>
}
function PortfolioApp(){
  const [pointer,setPointer]=useState({x:50,y:40})
  const [menuOpen,setMenuOpen]=useState(false)
  const [effectsOn,setEffectsOn]=useState(true)
  const [compact,setCompact]=useState(false)
  const [lowPower,setLowPower]=useState(false)
  const [mobileQuality,setMobileQuality]=useState<'lite'|'full'>('lite')
  const pointerFrame=useRef<number|null>(null)
  useEffect(()=>{
    const media=window.matchMedia('(max-width: 700px), (pointer: coarse)')
    const update=()=>setCompact(media.matches)
    update();media.addEventListener('change',update)
    const connection=(navigator as Navigator & {connection?:{saveData?:boolean}}).connection
    setLowPower(Boolean(connection?.saveData))
    return ()=>{media.removeEventListener('change',update);if(pointerFrame.current!==null)cancelAnimationFrame(pointerFrame.current)}
  },[])
  const [showTop,setShowTop]=useState(false)
  useEffect(()=>{
    const onScroll=()=>setShowTop(window.scrollY>650)
    onScroll()
    window.addEventListener('scroll',onScroll,{passive:true})
    return ()=>window.removeEventListener('scroll',onScroll)
  },[])
  const [ripples,setRipples]=useState<{id:number,x:number,y:number}[]>([])
  const rippleId=useRef(0)
  const rippleTimers=useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(()=>()=>rippleTimers.current.forEach(clearTimeout),[])
  const [activeCard,setActiveCard]=useState<string | null>(null)
  const reduce=useReducedMotion()
  const {scrollYProgress}=useScroll()
  const progress=useSpring(scrollYProgress,{stiffness:100,damping:28})
  const heroY=useTransform(scrollYProgress,[0,.3],[0,reduce?0:140])
  const animateEffects=effectsOn&&!reduce&&!lowPower
  const liteMode=compact&&mobileQuality==='lite'
  const fullEffects=animateEffects&&!compact
  return <main className={`site ${animateEffects?'':'effects-off'} ${compact?'compact-effects':''} ${liteMode?'lite-mode':''}`} onPointerDown={e=>{
    if(!animateEffects||liteMode||!(e.target instanceof Element))return
    const target=e.target.closest('a,button,.skill,.project,.creative-project,.inspiration-card,.editing-tool')
    const id=++rippleId.current
    setRipples(prev=>[...prev.slice(-5),{id,x:e.clientX,y:e.clientY}])
    rippleTimers.current.push(setTimeout(()=>setRipples(prev=>prev.filter(r=>r.id!==id)),750))
    if(target instanceof HTMLElement){target.classList.remove('touch-flash');void target.offsetWidth;target.classList.add('touch-flash');rippleTimers.current.push(setTimeout(()=>target.classList.remove('touch-flash'),500))}
  }} onPointerMove={e=>{
    if(!fullEffects||e.pointerType!=='mouse'||pointerFrame.current!==null)return
    const x=e.clientX,y=e.clientY
    pointerFrame.current=requestAnimationFrame(()=>{setPointer({x:x/window.innerWidth*100,y:y/window.innerHeight*100});pointerFrame.current=null})
  }}>
    <style>{`
      :root{font-family:Inter,system-ui,Arial,sans-serif;color-scheme:dark}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#050509}a{color:inherit}::selection{background:#8b5cf6;color:white}
      .site{position:relative;min-height:100vh;background:#050509;color:#f7f5ff;overflow:hidden;isolation:isolate}
      .progress{position:fixed;inset:0 0 auto;height:3px;z-index:100;transform-origin:left;background:linear-gradient(90deg,#8b5cf6,#22d3ee,#f472b6)}
      .ambient,.grid-bg,.particles{position:fixed;inset:0;pointer-events:none;z-index:0}
      .grid-bg{background-image:linear-gradient(#a78bfa0d 1px,transparent 1px),linear-gradient(90deg,#a78bfa0d 1px,transparent 1px);background-size:72px 72px;mask-image:linear-gradient(black,transparent)}
      .particle{position:absolute;border-radius:50%;background:#d8b4fe;box-shadow:0 0 12px #a78bfa}
      .nav{position:relative;z-index:20;max-width:1700px;margin:auto;padding:26px clamp(20px,6vw,100px);display:flex;align-items:center;justify-content:space-between;gap:20px}
      .logo{font-size:30px;font-weight:900;letter-spacing:-2px;text-decoration:none}.nav-links{display:flex;gap:clamp(14px,3vw,36px)}.nav-links a{font-size:11px;letter-spacing:1.5px;font-weight:700;text-decoration:none;color:#b9b6c7}.nav-links a:hover{color:#67e8f9}
      .menu-toggle{display:none;background:#171120;color:white;border:1px solid #55446b;border-radius:10px;padding:10px 14px;cursor:pointer}
      .hero{min-height:max(630px,90svh);position:relative;display:flex;align-items:center;justify-content:center;text-align:center;padding:90px 6% 110px}
      .hero-content{position:relative;z-index:2;max-width:1100px;width:100%}.eyebrow{color:#b9a1ff;font-size:clamp(10px,1.2vw,12px);font-weight:750;letter-spacing:3px;line-height:1.8}
      .hero h1{font-size:clamp(49px,10.2vw,145px);line-height:.99;letter-spacing:-.075em;font-weight:900;margin:30px 0;overflow-wrap:anywhere}
      .gradient{background:linear-gradient(100deg,#fff,#a78bfa,#22d3ee,#f472b6,#fff);background-size:280% 100%;background-clip:text;-webkit-background-clip:text;color:transparent;animation:gradient-flow 8s linear infinite}
      @keyframes gradient-flow{to{background-position:280% center}}
      .hero-description{max-width:670px;margin:0 auto 35px;color:#b4b1c4;font-size:clamp(15px,1.8vw,20px);line-height:1.9}
      .actions{display:flex;justify-content:center;flex-wrap:wrap;gap:14px}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:16px 25px;border-radius:999px;text-decoration:none;font-size:11px;font-weight:800;letter-spacing:1.2px;text-align:center}
      .primary{background:linear-gradient(115deg,#7c3aed,#a855f7);box-shadow:0 0 35px #7c3aed55}.outline{background:#11101cbb;border:1px solid #55446b;color:#e7d8ff}
      .visual-field{position:absolute;width:min(85vw,850px);aspect-ratio:1;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:1}
      .visual-ring{position:absolute;border:1px solid #a78bfa29;border-radius:50%;box-shadow:inset 0 0 30px #8b5cf608}.ring-one{inset:4%}.ring-two{inset:18%;border-style:dashed;border-color:#22d3ee30}.ring-three{inset:32%;border-color:#f472b625}
      .ring-node{position:absolute;top:50%;left:-5px;width:10px;height:10px;border-radius:50%;background:#67e8f9;box-shadow:0 0 25px #22d3ee}
      .light-orb{position:absolute;width:45%;height:45%;border-radius:50%;filter:blur(70px);opacity:.22}.orb-violet{left:4%;top:18%;background:#8b5cf6}.orb-cyan{right:0;bottom:15%;background:#22d3ee}.orb-pink{left:40%;bottom:0;background:#ec4899;width:30%;height:30%}
      .scroll-cue{position:absolute;bottom:30px;left:50%;transform:translateX(-50%);font-size:10px;letter-spacing:3px;color:#8f8b9f;white-space:nowrap}
      .section{position:relative;z-index:2;max-width:1450px;margin:auto;padding:clamp(80px,10vw,135px) clamp(20px,7vw,110px);scroll-margin-top:35px}
      .section-heading{margin-bottom:45px}.section h2{font-size:clamp(36px,6vw,76px);line-height:1.12;letter-spacing:-.055em;margin:18px 0 24px}.rule{width:100px;height:3px;background:linear-gradient(90deg,#8b5cf6,#22d3ee,transparent)}
      .about-layout{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(240px,1fr);gap:clamp(25px,5vw,80px);align-items:start}
      .about-copy p{color:#b9b6c7;font-size:clamp(16px,1.7vw,19px);line-height:1.95;margin:0 0 25px}.about-copy strong{color:#eee8ff}
      .about-panel{border:1px solid #44335e;border-radius:25px;padding:30px;background:linear-gradient(145deg,#1c1429dd,#0b0b11ee);box-shadow:0 20px 70px #0007}.about-panel h3{font-size:23px;margin:10px 0 25px}
      .fact{padding:17px 0;border-top:1px solid #3b3048}.fact small{display:block;color:#a78bfa;letter-spacing:2px;margin-bottom:8px}.fact span{color:#f0eafa;line-height:1.6}
      .skill-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px}.skill{min-height:140px;display:flex;align-items:flex-end;padding:23px;border:1px solid #3d3051;border-radius:19px;background:linear-gradient(145deg,#191223,#0b0b11);font-weight:700;font-size:clamp(14px,1.5vw,17px);overflow-wrap:anywhere}
      .project{border:1px solid #47305c;border-radius:28px;padding:clamp(27px,5vw,65px);background:radial-gradient(circle at 85% 20%,#6d28d933,transparent 45%),linear-gradient(135deg,#191122,#08080e);box-shadow:0 25px 75px #0006;transform-style:preserve-3d}
      .project h3{font-size:clamp(29px,5vw,62px);letter-spacing:-.05em;margin:22px 0}.project p{color:#b9b6c7;font-size:clamp(16px,1.8vw,19px);line-height:1.85;max-width:720px}
      .tags{display:flex;flex-wrap:wrap;gap:10px;margin-top:30px}.tag{border:1px solid #7c3aed55;background:#7c3aed20;color:#d8b4fe;border-radius:40px;padding:10px 16px;font-size:12px}
      .timeline{display:grid;gap:24px}.timeline-card{border-left:2px solid #8b5cf6;padding:15px 0 20px 30px}.timeline-card h3{font-size:clamp(22px,3vw,32px);margin:12px 0}.timeline-card p{color:#aaa6b9;line-height:1.8;max-width:730px}
      .contact{text-align:center;padding-bottom:145px}.contact h2{font-size:clamp(45px,9vw,115px)}.footer{position:relative;z-index:2;text-align:center;border-top:1px solid #24202d;padding:34px 7%;font-size:13px;color:#8b8599}
      @media(max-width:900px){.skill-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.about-layout{grid-template-columns:1fr}.visual-field{width:min(95vw,680px)}}
      @media(max-width:600px){.nav{padding:20px 6%}.menu-toggle{display:block}.nav-links{position:absolute;right:6%;top:72px;display:none;flex-direction:column;align-items:stretch;min-width:170px;padding:20px;background:#14101f;border:1px solid #443657;border-radius:15px}.nav-links.open{display:flex}.hero{min-height:670px;padding:75px 6% 110px}.hero h1{font-size:clamp(46px,12vw,72px)}.visual-field{width:100vw}.section{padding:75px 7%}.skill{min-height:115px;padding:18px}.eyebrow{letter-spacing:2px}.about-panel{padding:24px}}

      .streak{position:absolute;top:-30vh;height:130px;width:1px;transform:rotate(23deg);background:linear-gradient(transparent,#b6a6ffb3,transparent);filter:drop-shadow(0 0 7px #a78bfa)}
      .tech-icon{width:52px;height:52px;display:grid;place-items:center;border-radius:15px;background:#ffffff10;border:1px solid #ffffff19;flex-shrink:0;font-size:27px;color:#c4b5fd}.tech-icon img{width:34px;height:34px;object-fit:contain}.skill{flex-direction:column;align-items:flex-start;justify-content:space-between;gap:22px}.editing-tool-heading{display:flex;align-items:center;gap:15px;margin-bottom:14px}.editing-tool-heading strong{display:block}.editing-tool-heading span{display:block;color:#aaa6b9;font-size:12px;margin-top:4px}
      .project-art{position:relative;height:190px;margin:-6px 0 25px;border-radius:20px;overflow:hidden;background:radial-gradient(circle at 65% 50%,#5b21b64d,transparent 55%),#0b1020;border:1px solid #a78bfa33;isolation:isolate}.art-grid{position:absolute;inset:0;background-image:linear-gradient(#a78bfa13 1px,transparent 1px),linear-gradient(90deg,#a78bfa13 1px,transparent 1px);background-size:25px 25px}.art-glow{position:absolute;inset:10% 20%;background:#7c3aed50;filter:blur(55px);border-radius:50%;animation:art-pulse 5s ease-in-out infinite alternate}.art-chat{position:absolute;padding:12px 25px;background:#1e2443;border:1px solid #7dd3fc88;color:#67e8f9;border-radius:18px;font-size:23px;box-shadow:0 10px 30px #0008}.chat-a{top:22%;left:15%;animation:art-float 4s ease-in-out infinite}.chat-b{top:46%;right:15%;animation:art-float 4.5s ease-in-out infinite reverse}.art-terminal{position:absolute;bottom:15px;left:20px;color:#e0d4ff;font-weight:800;letter-spacing:2px}.art-terminal span{color:#67e8f9;font-size:11px;margin-left:12px}.art-frame{position:absolute;inset:20px 28%;border:2px solid #f0abfc88;border-radius:10px;transform:rotate(-10deg);background:linear-gradient(135deg,#c084fc55,#22d3ee22);animation:art-float 5s ease-in-out infinite}.frame-b{transform:rotate(9deg);inset:30px 23%;border-color:#67e8f988;animation-delay:-2s}.art-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:50px;color:#fff;text-shadow:0 0 30px #a78bfa}.art-caption{position:absolute;bottom:13px;left:18px;font-size:10px;letter-spacing:2px;color:#d8b4fe}.art-phone{position:absolute;width:80px;height:145px;top:18px;left:calc(50% - 40px);border:5px solid #b6a4ff;border-radius:17px;box-shadow:0 0 35px #8b5cf688;transform:rotate(-8deg);animation:art-float 5s ease-in-out infinite}.art-phone-screen{height:100%;display:grid;place-items:center;font-size:36px;background:linear-gradient(145deg,#7c3aed77,#22d3ee44);color:#fff}.art-diamond{position:absolute;top:35px;left:calc(50% - 55px);font-size:110px;color:#d8b4fe;text-shadow:0 0 35px #a78bfa;animation:art-float 5s ease-in-out infinite}@keyframes art-float{50%{translate:0 -12px}}@keyframes art-pulse{to{opacity:.35;scale:1.2}}.creative-project{min-height:450px}
      @media(max-width:600px){.project-art{height:155px}.tech-icon{width:44px;height:44px}.tech-icon img{width:29px;height:29px}}
      .editing-tools{margin-top:60px;max-width:750px}.editing-tools h3{color:#b9a1ff;font-size:13px;letter-spacing:2px;margin-bottom:26px}.editing-tool{margin:0 0 25px}.editing-tool strong{display:inline-block;margin-right:15px}.editing-tool span{color:#aaa6b9;font-size:12px}.editing-track{height:6px;background:#ffffff20;border-radius:6px;overflow:hidden;margin-top:13px}.editing-fill{height:100%;background:linear-gradient(90deg,#22d3ee,#a78bfa)}.creative-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:25px}.creative-project{min-height:330px;padding:28px}.creative-project h3{font-size:clamp(23px,2.5vw,34px)}.creative-project p{font-size:14px}.interest-grid{display:flex;flex-wrap:wrap;gap:12px}.interest{background:#191323;border:1px solid #453555;padding:15px 20px;border-radius:12px;color:#e9e3f6;font-size:13px}@media(max-width:1000px){.creative-grid{grid-template-columns:1fr}}.logo{font-size:clamp(16px,2vw,26px);letter-spacing:-1px}
      /* Touch-friendly interactions and layouts across phones, tablets, and desktop */
      .skill,.resource-heading,.resource-tag,.interest{cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
      .resource-tag{display:inline-flex;gap:7px;align-items:center;min-height:42px}.resource-tag:hover,.resource-tag:focus-visible{background:#8b5cf63b;border-color:#a78bfa}
      .resource-heading{display:flex;min-height:60px;border-radius:12px;padding:6px}.resource-heading:hover,.resource-heading:focus-visible{background:#a78bfa16}
      .skill:hover,.skill:focus-visible,.interest:hover,.interest:focus-visible{outline:1px solid #b7a1ff;box-shadow:0 14px 45px #7c3aed33}
      .project.touch-active{border-color:#a78bfa;box-shadow:0 18px 65px #7c3aed44;background:radial-gradient(circle at 80% 20%,#7c3aed45,transparent 55%),#171123}
      .btn:focus-visible,.nav-links a:focus-visible,.menu-toggle:focus-visible,.skill:focus-visible,.interest:focus-visible,.resource-tag:focus-visible{outline:2px solid #67e8f9;outline-offset:4px}
      .site{width:100%;max-width:100%;overflow-x:clip}.hero-content,.section,.project,.skill{min-width:0}.nav-links a{min-height:44px;display:inline-flex;align-items:center}
      @media(hover:none),(pointer:coarse){.btn,.nav-links a,.interest,.resource-tag{min-height:46px}.btn:active,.interest:active,.resource-tag:active,.skill:active{transform:scale(.97);filter:brightness(1.25)}.project:active{border-color:#b5a0ff}.visual-field{opacity:.85}.nav-toggle{min-width:48px;min-height:48px}.skill{min-height:120px}.hero{min-height:100svh}}
      @media(max-width:900px){.nav{padding-inline:5vw}.hero{padding-inline:5vw}.section{padding-inline:5vw}.project{padding:clamp(22px,4vw,38px)}.creative-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:650px){.creative-grid{grid-template-columns:1fr}.hero{min-height:100svh;padding-top:115px;padding-bottom:90px}.hero h1{font-size:clamp(44px,12vw,75px)}.section{padding:72px 6vw}.skill-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.skill{padding:15px;gap:13px;min-height:130px;font-size:13px}.project{padding:20px;border-radius:20px}.project-art{height:150px}.nav-links{right:5vw;left:5vw;top:70px;min-width:0}.nav-links a{padding:8px 5px}.actions{gap:10px}.btn{padding:14px 17px;font-size:10px;min-height:48px}.editing-tool-heading{gap:10px}.interest{flex:1 1 130px;text-align:center}}
      @media(max-width:380px){.skill-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero h1{font-size:43px}.eyebrow{letter-spacing:1px}}
      @media(max-width:650px){.particles .particle:nth-of-type(n+46),.particles .streak:nth-of-type(n+7){display:none}}

      /* V4: aligned logo cards and a spacious, visual inspiration gallery */
      .skill-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:20px;align-items:stretch}
      .skill{min-height:160px;align-items:center;justify-content:center;text-align:center;gap:18px;padding:24px 12px;line-height:1.5}
      .skill>span:last-child{display:block;width:100%;overflow-wrap:anywhere}
      .tech-icon{width:62px;height:62px;border-radius:18px;display:grid;place-items:center}
      .tech-icon img{width:42px;height:42px;object-fit:contain}
      .editing-tool-heading{align-items:center;gap:18px}
      .inspiration-intro{color:#b5adc5;line-height:1.7;margin:-10px 0 36px;font-size:15px}
      .inspiration-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:26px;align-items:stretch}
      .inspiration-card{display:flex;flex-direction:column;min-width:0;border:1px solid #42334f;border-radius:20px;overflow:hidden;text-decoration:none;background:linear-gradient(155deg,#1c1428,#0c0b12);box-shadow:0 14px 35px #0005;transition:border-color .25s,box-shadow .25s;isolation:isolate}
      .inspiration-card:hover,.inspiration-card:focus-visible{border-color:#b49aff;box-shadow:0 22px 55px #7c3aed30;outline-offset:4px}
      .inspiration-art{position:relative;aspect-ratio:4/4.2;overflow:hidden;display:grid;place-items:center;background:radial-gradient(circle at 28% 18%,#a855f780,transparent 48%),linear-gradient(135deg,#191032,#0d1830 65%,#04060c)}
      .inspiration-art-1{background:radial-gradient(circle at 60% 30%,#5d8ea766,transparent 60%),linear-gradient(135deg,#121e2b,#080b12)}
      .inspiration-art-2{background:radial-gradient(circle at 30% 20%,#b93c5b55,transparent 55%),linear-gradient(135deg,#24101d,#08080d)}
      .inspiration-art-3{background:radial-gradient(circle at 70% 25%,#3c81d077,transparent 55%),linear-gradient(135deg,#101a37,#070710)}
      .inspiration-art-4{background:radial-gradient(circle at 30% 30%,#a1846a77,transparent 55%),linear-gradient(135deg,#211b23,#08090e)}
      .inspiration-art-5{background:radial-gradient(circle at 60% 20%,#8e6ac077,transparent 55%),linear-gradient(135deg,#191327,#08080d)}
      .inspiration-logo-art img{width:48%!important;height:48%!important;object-fit:contain!important;filter:drop-shadow(0 12px 28px #0008)}
      .inspiration-art img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s ease}
      .inspiration-card:hover img{transform:scale(1.08)}
      .inspiration-monogram{font-size:clamp(68px,9vw,125px);font-weight:900;letter-spacing:-.1em;color:#e8d9ff;text-shadow:0 0 60px #b388ff88;transform:rotate(-7deg);opacity:.85}
      .inspiration-shine{position:absolute;inset:0;pointer-events:none;background:linear-gradient(155deg,transparent 40%,#0009)}
      .inspiration-category{position:absolute;left:15px;bottom:15px;background:#080810bb;backdrop-filter:blur(12px);border:1px solid #ffffff35;border-radius:999px;padding:8px 11px;font-size:9px;font-weight:800;letter-spacing:1.6px;color:#f4eaff}
      .inspiration-info{position:relative;display:flex;flex-direction:column;gap:8px;padding:19px 42px 23px 18px;min-height:108px}
      .inspiration-info strong{font-size:15px;line-height:1.4;color:#f8f3ff}
      .inspiration-info>span:nth-child(2){font-size:12px;color:#a9a2b7;line-height:1.5}
      .inspiration-arrow{position:absolute;right:17px;top:19px;color:#c7aaff;font-size:20px}
      @media(max-width:1100px){.inspiration-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.skill-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
      @media(max-width:750px){.inspiration-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.skill-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.skill{min-height:145px;padding:16px 8px}.tech-icon{width:50px;height:50px}.tech-icon img{width:34px;height:34px}}
      @media(max-width:430px){.inspiration-grid{gap:12px}.inspiration-info{padding:14px 30px 18px 13px;min-height:116px}.inspiration-info strong{font-size:13px}.inspiration-info>span:nth-child(2){font-size:11px}.inspiration-category{font-size:8px;left:10px;bottom:10px}.inspiration-arrow{right:11px;top:13px}.skill-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.skill{min-height:135px}}
      @media(hover:none){.inspiration-card:active{border-color:#c4a5ff;box-shadow:0 15px 40px #7c3aed44}}

      /* V6 editing tools: three evenly aligned, accessible visual cards */
      .editing-tools{max-width:none;width:100%;margin-top:74px}
      .editing-tools-title{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:23px}
      .editing-tools-title h3{margin:0;letter-spacing:2.3px;font-size:13px;color:#cbb4ff}
      .editing-tools-title>span{font-size:12px;color:#938ca6}
      .editing-tools-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;align-items:stretch}
      .editing-tools-grid>div{min-width:0;height:100%}
      .editing-tool{display:flex;flex-direction:column;justify-content:space-between;height:100%;min-height:232px;padding:24px 22px 22px;margin:0;border-radius:21px;border:1px solid #50405e;background:linear-gradient(150deg,#20172e 0%,#100e19 70%);box-shadow:0 12px 32px #0004;transition:border-color .2s,box-shadow .2s}
      .editing-tool:hover,.editing-tool:focus-within{border-color:#b49aff;box-shadow:0 20px 50px #7c3aed24}
      .editing-tool-heading.resource-heading{display:flex;align-items:center;gap:15px;min-width:0;min-height:78px;padding:0;text-decoration:none;background:transparent}
      .editing-tool-heading.resource-heading:hover{background:transparent}
      .editing-tool-heading .tech-icon{width:68px;height:68px;flex:0 0 68px;border-radius:17px;background:#ffffff0b;border:1px solid #ffffff24;display:grid;place-items:center}
      .editing-tool-heading .tech-icon img{width:44px;height:44px;object-fit:contain}
      .editing-tool-heading .resolve-icon svg{width:46px;height:46px}
      .editing-tool-copy{min-width:0;flex:1}
      .editing-tool-heading .editing-tool-copy strong{display:block;margin:0 0 7px;font-size:clamp(14px,1.4vw,17px);line-height:1.35;color:#f5f0ff;overflow-wrap:break-word}
      .editing-tool-heading .editing-tool-copy span{display:block;margin:0;font-size:12px;line-height:1.5;color:#aaa3b7;text-decoration:none}
      .editing-tool-heading .editing-external{font-size:20px;color:#c4a7ff;align-self:flex-start;margin:2px 0 0}
      .editing-progress-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:30px;margin-bottom:10px}
      .editing-progress-meta span{font-size:11px;color:#a9a2b8}
      .editing-progress-meta strong{font-size:13px;color:#d8c6ff}
      .editing-tool .editing-track{height:8px;margin:0;border-radius:100px;background:#ffffff1b}
      .editing-tool .editing-fill{border-radius:100px}
      @media(max-width:950px){.editing-tools-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}}
      @media(max-width:620px){.editing-tools-grid{grid-template-columns:1fr;gap:15px}.editing-tool{min-height:195px;padding:20px}.editing-tools-title{align-items:flex-start;flex-direction:column;gap:6px}.editing-tool-heading .tech-icon{width:60px;height:60px;flex-basis:60px}.editing-tool-heading .tech-icon img{width:40px;height:40px}.editing-progress-meta{margin-top:20px}}

      /* V7: graphical skill gallery, accessible and responsive */
      .skill-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:20px}
      .skill.skill-v7{position:relative;display:flex;flex-direction:column;align-items:stretch;justify-content:space-between;text-align:left;gap:0;isolation:isolate;min-height:270px;padding:20px;border:1px solid color-mix(in srgb,var(--skill-accent) 24%,#40354f);border-radius:24px;background:linear-gradient(155deg,#1b1528,#0a0b12 85%);overflow:hidden;text-decoration:none;box-shadow:0 12px 35px #0004;transition:border-color .25s,box-shadow .25s}
      .skill.skill-v7:hover,.skill.skill-v7:focus-visible{border-color:var(--skill-accent);box-shadow:0 20px 50px #0009,0 0 32px color-mix(in srgb,var(--skill-accent) 22%,transparent);outline-offset:3px}
      .skill-aura{position:absolute;z-index:-1;inset:0;background:radial-gradient(circle at 50% 42%,color-mix(in srgb,var(--skill-accent) 24%,transparent),transparent 55%);opacity:.85;transition:opacity .3s,transform .4s}
      .skill-v7:hover .skill-aura{opacity:1;transform:scale(1.3)}
      .skill-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;width:100%}
      .skill-category{font-size:9px;font-weight:800;letter-spacing:1.25px;line-height:1.4;color:var(--skill-accent)}
      .skill-number{font-size:10px;font-weight:700;letter-spacing:1px;color:#938aa3}
      .skill-visual{position:relative;display:grid;place-items:center;align-self:center;width:118px;height:118px;margin:12px 0 15px}
      .skill-orbit{position:absolute;inset:4px;border:1px solid color-mix(in srgb,var(--skill-accent) 45%,transparent);border-radius:50%;box-shadow:inset 0 0 22px color-mix(in srgb,var(--skill-accent) 15%,transparent);animation:skill-pulse 4s ease-in-out infinite}
      .skill-orbit:after{content:'';position:absolute;top:7px;right:12px;width:7px;height:7px;background:var(--skill-accent);border-radius:50%;box-shadow:0 0 13px var(--skill-accent)}
      .skill-v7 .tech-icon{position:relative;z-index:1;width:74px;height:74px;display:grid;place-items:center;border-radius:20px;background:linear-gradient(145deg,#2d2739,#17131e);border:1px solid #ffffff28;box-shadow:0 12px 30px #0008;font-size:37px;color:var(--skill-accent)}
      .skill-v7 .tech-icon img{width:50px;height:50px;object-fit:contain}
      .skill-bottom{display:flex;flex-direction:column;gap:7px;width:100%;padding-right:15px}
      .skill-bottom strong{font-size:15px;line-height:1.35;color:#f8f4ff;overflow-wrap:anywhere}
      .skill-description{font-size:11px;font-weight:400;color:#aaa3b9;line-height:1.5}
      .skill-launch{position:absolute;right:19px;bottom:20px;color:var(--skill-accent);font-size:20px;font-weight:500}
      @keyframes skill-pulse{0%,100%{transform:scale(.96);opacity:.65}50%{transform:scale(1.04);opacity:1}}
      @media(max-width:1150px){.skill-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:700px){.skill-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.skill.skill-v7{min-height:226px;padding:14px;border-radius:19px}.skill-visual{width:90px;height:90px;margin:8px 0}.skill-v7 .tech-icon{width:60px;height:60px;border-radius:16px}.skill-v7 .tech-icon img{width:40px;height:40px}.skill-bottom strong{font-size:13px}.skill-description{font-size:10px}.skill-category{font-size:8px;letter-spacing:.8px}.skill-launch{right:12px;bottom:14px}}
      @media(max-width:370px){.skill.skill-v7{padding:11px;min-height:212px}.skill-visual{width:80px;height:80px}.skill-bottom strong{font-size:12px}}
      @media(prefers-reduced-motion:reduce){.skill-orbit{animation:none}}

      /* V8 cinematic motion layers. Pure CSS where possible to reduce JS work. */
      .v8-aurora,.v8-comets,.v8-ripples{position:fixed;inset:0;pointer-events:none;overflow:hidden}
      .v8-aurora{z-index:0;opacity:.65}
      .v8-aurora span{position:absolute;width:45vw;height:45vw;min-width:320px;min-height:320px;border-radius:50%;filter:blur(85px);opacity:.23;will-change:transform;animation:v8-float 22s ease-in-out infinite alternate}
      .v8-aurora span:nth-child(1){top:4%;left:-15%;background:#8539ed}
      .v8-aurora span:nth-child(2){top:38%;right:-15%;background:#008fa9;animation-delay:-7s;animation-duration:28s}
      .v8-aurora span:nth-child(3){bottom:-20%;left:32%;background:#ab3b8b;animation-delay:-13s;animation-duration:32s}
      @keyframes v8-float{0%{transform:translate3d(-4%,-6%,0) scale(.85)}100%{transform:translate3d(12%,12%,0) scale(1.18)}}
      .v8-comets{z-index:1}
      .v8-comet{position:absolute;top:0;width:2px;height:85px;border-radius:99px;background:linear-gradient(to bottom,transparent,#b9a4ff66,#e2dcff);filter:drop-shadow(0 0 8px #a78bfa);transform:rotate(16deg);opacity:0}
      .v8-ripples{z-index:90}
      .v8-ripple{position:absolute;width:18px;height:18px;margin:-9px 0 0 -9px;border:2px solid #c7b0ff;border-radius:50%;box-shadow:0 0 20px #9a6bff88,inset 0 0 20px #9a6bff55;animation:v8-ripple .7s ease-out forwards}
      @keyframes v8-ripple{from{opacity:.9;transform:scale(.4)}to{opacity:0;transform:scale(7)}}
      .site :is(.btn,.skill,.project,.creative-project,.inspiration-card,.editing-tool,.resource-tag,.nav-links a){-webkit-tap-highlight-color:transparent}
      .site :is(.btn,.skill,.project,.creative-project,.inspiration-card,.editing-tool,.resource-tag,.nav-links a):focus-visible{outline:2px solid #b8a0ff;outline-offset:4px}
      .site .touch-flash{filter:brightness(1.28) saturate(1.18)!important}
      .site :is(.project,.creative-project,.inspiration-card,.editing-tool,.skill-v7){transition:box-shadow .3s ease,border-color .3s ease,filter .3s ease}
      .site :is(.project,.creative-project,.inspiration-card,.editing-tool,.skill-v7):hover{box-shadow:0 24px 55px #0008,0 0 36px #8b5cf633}
      .site :is(.project,.creative-project,.inspiration-card,.editing-tool,.skill-v7):active{filter:brightness(1.18)}
      .site .hero h1,.site .section h2{text-wrap:balance}
      .site .btn.primary{position:relative;overflow:hidden}
      .site .btn.primary:after{content:'';position:absolute;inset:-100% auto -100% -45%;width:30%;background:linear-gradient(90deg,transparent,#ffffff65,transparent);transform:rotate(20deg);animation:v8-shine 6s ease-in-out infinite;pointer-events:none}
      @keyframes v8-shine{0%,65%,100%{left:-55%}85%{left:135%}}
      @media(max-width:650px){.particles .particle:nth-of-type(n+70){display:none}.v8-comet:nth-child(n+7){display:none}.v8-aurora span{filter:blur(65px);opacity:.18}.v8-ripple{animation-duration:.55s}}
      @media(prefers-reduced-motion:reduce){.v8-aurora span,.v8-ripple,.site .btn.primary:after{animation:none!important}.v8-aurora,.v8-comets,.v8-ripples{display:none}}

      /* V9 cinematic effects: mostly CSS-driven, no additional per-frame React work */
      .v9-nebula,.v9-stars,.v9-scanlines{position:fixed;inset:0;pointer-events:none;overflow:hidden}
      .v9-nebula{z-index:0;opacity:.7}
      .v9-nebula span{position:absolute;display:block;width:40vw;height:40vw;min-width:260px;min-height:260px;border:1px solid #bba6ff1c;border-radius:45%;box-shadow:0 0 90px #7c3aed14,inset 0 0 70px #5a3ba31b;animation:v9-drift 34s linear infinite}
      .v9-nebula span:nth-child(1){left:-12%;top:15%}
      .v9-nebula span:nth-child(2){right:-12%;top:50%;animation-direction:reverse;animation-duration:45s}
      .v9-nebula span:nth-child(3){left:35%;bottom:-30%;animation-duration:52s}
      .v9-nebula span:nth-child(4){left:52%;top:-27%;animation-duration:60s}
      @keyframes v9-drift{to{transform:rotate(360deg)}}
      .v9-stars{z-index:1}
      .v9-stars i{position:absolute;border-radius:50%;background:#e2d4ff;opacity:.18;box-shadow:0 0 8px #b997ff;animation:v9-twinkle 5s ease-in-out infinite alternate}
      @keyframes v9-twinkle{0%{opacity:.12;transform:scale(.7)}50%{opacity:.6;transform:scale(1.4)}100%{opacity:.2;transform:scale(.9)}}
      .v9-scanlines{z-index:1;opacity:.08;background:repeating-linear-gradient(180deg,transparent 0 5px,#a28fc4 6px,transparent 7px);mask-image:linear-gradient(90deg,transparent,#000 50%,transparent)}
      .v9-float-controls{position:fixed;z-index:80;right:18px;bottom:20px;display:flex;flex-direction:column;gap:9px;align-items:center}
      .v9-float-btn{appearance:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;width:92px;min-height:45px;padding:9px 10px;border:1px solid #a68bdb65;border-radius:15px;color:#f7efff;background:#171126e8;backdrop-filter:blur(15px);text-decoration:none;font:600 11px/1.2 Inter,system-ui,sans-serif;box-shadow:0 7px 24px #0008,0 0 18px #8b5cf619;transition:transform .22s,background .22s,border-color .22s}
      .v9-float-btn:hover,.v9-float-btn:focus-visible{transform:translateX(-5px) scale(1.04);background:#34204e;border-color:#d2bcff}
      .v9-float-btn:active{transform:scale(.91)}
      .v9-float-btn span{white-space:nowrap}
      .v9-hero-halo{position:absolute;left:50%;top:50%;width:400px;height:400px;margin:-200px 0 0 -200px;border:1px dashed #c6adff3b;border-radius:50%;animation:v9-drift 65s linear infinite;pointer-events:none}
      .v9-hero-halo-inner{position:absolute;inset:48px;border:1px solid #63d8ff2a;border-radius:50%;box-shadow:0 0 60px #8b5cf61c}
      .v9-hero-halo>span{position:absolute;top:50%;left:50%;width:7px;height:7px;margin:-3.5px;border-radius:50%;background:#c7b5ff;box-shadow:0 0 16px #c9b0ff;animation:v9-spark 3s ease-in-out infinite alternate}
      @keyframes v9-spark{to{opacity:.22;filter:blur(2px)}}
      .site .section{position:relative}
      .site .section:not(.contact):before{content:'';position:absolute;top:0;left:0;width:90px;height:2px;background:linear-gradient(90deg,#a78bfa,#22d3ee,transparent);box-shadow:0 0 18px #a78bfa88}
      .site .section h2{position:relative}
      .site .section h2:after{content:'';position:absolute;left:0;bottom:-16px;width:70px;height:2px;background:linear-gradient(90deg,#c4a3ff,transparent);animation:v9-bar 5s ease-in-out infinite alternate}
      @keyframes v9-bar{to{width:135px;opacity:.35}}
      .site .inspiration-art:after{content:'';position:absolute;inset:-100% auto -100% -60%;width:35%;background:linear-gradient(90deg,transparent,#ffffff28,transparent);transform:rotate(25deg);transition:left .65s ease;pointer-events:none}
      .site .inspiration-card:hover .inspiration-art:after{left:150%}
      .site.effects-off .v8-aurora,.site.effects-off .v8-comets,.site.effects-off .v8-ripples,.site.effects-off .v9-nebula,.site.effects-off .v9-stars,.site.effects-off .v9-scanlines,.site.effects-off .particles,.site.effects-off .v9-hero-halo{display:none!important}
      .site.effects-off .visual-ring,.site.effects-off .light-orb,.site.effects-off .skill-orbit,.site.effects-off .btn.primary:after{animation:none!important}
      @media(max-width:650px){.v9-stars i:nth-child(n+51){display:none}.v9-nebula span:nth-child(n+3){display:none}.v9-hero-halo{transform:scale(.68);opacity:.45}.v9-float-controls{right:10px;bottom:12px;gap:7px}.v9-float-btn{width:47px;height:47px;min-height:47px;padding:8px;border-radius:50%;font-size:18px}.v9-float-btn span{display:none}.v9-scanlines{display:none}}
      @media(prefers-reduced-motion:reduce){.v9-nebula,.v9-stars,.v9-scanlines,.v9-hero-halo{display:none}.site .section h2:after{animation:none}.v9-float-btn{transition:none}}

      /* V10 adaptive particle environment: 100 extra dust motes + 8 light ribbons on desktop */
      .v10-dust,.v10-ribbons,.v10-vignette{position:fixed;inset:0;pointer-events:none;overflow:hidden}
      .v10-dust{z-index:1}
      .v10-dust i{position:absolute;border-radius:50%;background:#d3c5ff;opacity:.25;box-shadow:0 0 7px #9b80ef;animation:v10-dust-drift 7s ease-in-out infinite alternate;will-change:transform,opacity}
      @keyframes v10-dust-drift{from{opacity:.12;transform:translate3d(-5px,10px,0) scale(.8)}to{opacity:.75;transform:translate3d(10px,-15px,0) scale(1.4)}}
      .v10-ribbons{z-index:1}
      .v10-ribbons span{position:absolute;top:-35vh;width:1px;height:25vh;transform:rotate(24deg);background:linear-gradient(180deg,transparent,#a78bfa12,#c4b5fd66,transparent);filter:drop-shadow(0 0 9px #a78bfa);animation:v10-ribbon-fall linear infinite}
      @keyframes v10-ribbon-fall{from{transform:translate3d(0,-20vh,0) rotate(24deg);opacity:0}15%{opacity:.7}85%{opacity:.7}to{transform:translate3d(12vw,160vh,0) rotate(24deg);opacity:0}}
      .v10-vignette{z-index:1;box-shadow:inset 0 0 140px #0007}
      .site .skill-v7 .skill-visual{transition:transform .35s ease}
      .site .skill-v7:hover .skill-visual{transform:rotate(-8deg) scale(1.07)}
      .site .editing-tool .tech-icon{transition:transform .3s,box-shadow .3s}
      .site .editing-tool:hover .tech-icon{transform:rotate(-6deg) scale(1.07);box-shadow:0 0 25px #a78bfa44}
      .site .inspiration-card .inspiration-info strong{transition:color .3s}
      .site .inspiration-card:hover .inspiration-info strong{color:#cfbaff}
      .site.compact-effects .v9-nebula,.site.compact-effects .v9-scanlines,.site.compact-effects .v10-vignette{display:none}
      .site.compact-effects .v10-dust i{box-shadow:none;animation-duration:11s}
      .site.compact-effects .v10-ribbons span{filter:none;opacity:.35}
      .site.effects-off .v10-dust,.site.effects-off .v10-ribbons,.site.effects-off .v10-vignette{display:none}
      @media(max-width:700px){.v10-dust i:nth-child(n+27),.v10-ribbons span:nth-child(n+3){display:none}.v10-vignette{display:none}.site .skill-v7:hover .skill-visual{transform:none}}
      @media(prefers-reduced-motion:reduce){.v10-dust,.v10-ribbons,.v10-vignette{display:none}.site .skill-v7 .skill-visual,.site .editing-tool .tech-icon{transition:none}}

      /* V11: low-cost mobile presentation. Full effects remain available via button. */
      .mobile-quality-button{position:fixed;left:12px;bottom:14px;z-index:85;min-height:44px;padding:10px 14px;border:1px solid #a68bdb88;border-radius:999px;background:#171126ed;color:#f4edff;font:600 12px system-ui,sans-serif;box-shadow:0 4px 18px #0006;cursor:pointer;backdrop-filter:blur(6px)}
      .mobile-quality-button:focus-visible{outline:2px solid #c8a8ff;outline-offset:3px}
      .site.lite-mode .v8-aurora,.site.lite-mode .v8-comets,.site.lite-mode .v9-nebula,.site.lite-mode .v9-scanlines,.site.lite-mode .v9-hero-halo,.site.lite-mode .v10-dust,.site.lite-mode .v10-ribbons,.site.lite-mode .v10-vignette,.site.lite-mode .v8-ripples{display:none!important}
      .site.lite-mode .v9-stars i{animation:none;box-shadow:none;opacity:.35}
      .site.lite-mode .particles .particle{box-shadow:none!important;filter:none!important;opacity:.3}
      .site.lite-mode .ambient,.site.lite-mode .light-orb{filter:none!important;opacity:.15!important;animation:none!important}
      .site.lite-mode .grid-bg{opacity:.18}
      .site.lite-mode .skill-orbit,.site.lite-mode .visual-ring,.site.lite-mode .btn.primary:after,.site.lite-mode .section h2:after{animation:none!important}
      .site.lite-mode .skill-aura{opacity:.35}
      .site.lite-mode :is(.inspiration-card,.skill-v7,.editing-tool,.project,.creative-project){box-shadow:0 5px 16px #0004!important;backdrop-filter:none!important}
      .site.lite-mode :is(.inspiration-art img,.skill-visual,.tech-icon){transition-duration:.15s!important}
      .site.lite-mode :is(.inspiration-card,.skill-v7,.editing-tool,.project,.creative-project):active{filter:brightness(1.15)}
      @media(max-width:700px){.site.lite-mode .v9-stars i:nth-child(n+15){display:none}.site.lite-mode .particles .particle:nth-of-type(n+11){display:none}}
      @media(prefers-reduced-motion:reduce){.mobile-quality-button{display:none}}
      @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.gradient{animation:none}*,*::before,*::after{transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}

      /* V23: hide desktop quick-action stack on phones; mobile navigation handles Work/Inspire. */
      @media (max-width: 767px) {
        .site .v9-float-controls { display: none !important; }
      }

      /* V24 — Tools Hub feature launchpad */
      .tools-nav-spotlight{position:relative!important;display:inline-flex!important;align-items:center;gap:7px;padding:10px 15px!important;border:1px solid #b995ff8a!important;border-radius:999px;background:linear-gradient(120deg,#3c2266,#211339)!important;box-shadow:0 0 20px #9c65fa20;color:#f2eaff!important}
      .tools-nav-spotlight:hover{box-shadow:0 0 25px #ad80ff65;transform:translateY(-2px)}
      .tools-nav-spark{color:#d6c0ff;animation:tools-v24-spark 3s ease-in-out infinite}
      .tools-nav-new{font-size:9px;letter-spacing:1px;color:#c5a7ff}
      .tools-hero-cta{display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:48px;padding:13px 19px;border-radius:14px;text-decoration:none;font-size:12px;letter-spacing:1.1px;font-weight:850;color:#130a24!important;background:linear-gradient(110deg,#e6d9ff,#b28bff 58%,#9edaff);box-shadow:0 9px 35px #ad80ff48;transition:transform .2s,box-shadow .2s}
      .tools-hero-cta:hover{transform:translateY(-3px);box-shadow:0 14px 45px #ad80ff72}
      .tools-cta-pulse{animation:tools-v24-spark 3s ease-in-out infinite}
      /* ASLNS Digital Lab 3.0 — homepage showcase */
      .tools-featured-section{background:radial-gradient(ellipse at 75% 40%,#32205177,transparent 52%),linear-gradient(135deg,#140c24,#090914 60%,#091523)!important;border-color:#ae90f566!important;box-shadow:0 35px 100px #0009,0 0 65px #8655d91c!important}
      .tools-featured-topline{background:linear-gradient(90deg,#9b72eb12,transparent 65%)}
      .tools-featured-copy h2{letter-spacing:-.065em!important;text-wrap:balance}
      .tools-featured-chips span:first-child{background:linear-gradient(115deg,#7c3aed40,#22d3ee20);border-color:#b9a0ff99;color:#f2e9ff}
      .tools-featured-button{position:relative;overflow:hidden;isolation:isolate;border:1px solid #ffffff55;box-shadow:0 14px 40px #9864ef44, inset 0 1px #ffffff77!important}
      .tools-featured-button:before{content:'';position:absolute;z-index:-1;inset:-100% auto -100% -55%;width:32%;transform:rotate(24deg);background:linear-gradient(90deg,transparent,#fff9,transparent);transition:left .65s ease}
      .tools-featured-button:hover:before{left:140%}
      .tools-featured-button:focus-visible,.tools-featured-visual:focus-visible{outline:2px solid #c8b5ff;outline-offset:5px}
      .tools-featured-visual{background:radial-gradient(circle at 50% 45%,#503077,#1a102e 50%,#080d1c)!important;box-shadow:inset 0 0 60px #7c3aed18,0 20px 55px #0007}
      .tools-featured-mini{backdrop-filter:blur(14px);box-shadow:0 14px 32px #0007,inset 0 1px #ffffff1a}
      .tools-featured-mini:hover{filter:brightness(1.22)}
      @media(max-width:650px){.tools-featured-button{width:100%;gap:12px}.tools-featured-visual{min-height:345px}}
      @media(prefers-reduced-motion:reduce){.tools-featured-button:before{display:none}}
      .tools-featured-section{position:relative;isolation:isolate;overflow:hidden;margin:0 auto 40px;width:min(1220px,calc(100% - 44px));border:1px solid #bfa2ff55;border-radius:30px;background:linear-gradient(130deg,#1d1032f5,#0d0b1af5 55%,#111f32f5);box-shadow:0 25px 100px #0008,0 0 70px #8b5cf613;color:#f6f0ff}
      .tools-featured-section:before{content:'';position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse at 78% 43%,#9a6aff20,transparent 52%),radial-gradient(ellipse at 15% 90%,#339ad815,transparent 50%);pointer-events:none}
      .tools-featured-topline{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:21px 32px;border-bottom:1px solid #b99cff2b;font:750 10px/1.4 ui-monospace,monospace;letter-spacing:2px;color:#bba6e5}
      .tools-featured-topline i{display:inline-block;width:7px;height:7px;margin-right:7px;border-radius:50%;background:#a58aff;box-shadow:0 0 12px #ad86ff}
      .tools-featured-layout{display:grid;grid-template-columns:1.05fr 1fr;align-items:center;gap:25px;padding:65px 52px 75px}
      .tools-featured-copy{position:relative;z-index:2}
      .tools-featured-eyebrow{font:800 11px/1.5 ui-monospace,monospace;letter-spacing:3px;color:#c7aaff}
      .tools-featured-copy h2{margin:20px 0 23px;font-size:clamp(42px,5.3vw,76px);line-height:1.04;letter-spacing:-.075em;font-weight:950}
      .tools-featured-copy h2 span{background:linear-gradient(110deg,#d5baff,#aa8bff,#8ed6f6);background-clip:text;-webkit-background-clip:text;color:transparent}
      .tools-featured-description{max-width:490px;font-size:15px;line-height:1.9;color:#bcb4cc}
      .tools-featured-chips{display:flex;flex-wrap:wrap;gap:9px;margin:26px 0 29px}
      .tools-featured-chips span{font-size:10px;letter-spacing:.8px;font-weight:800;color:#d9c8fa;border:1px solid #b69af34a;background:#ad8af410;padding:9px 12px;border-radius:999px}
      .tools-featured-button{display:inline-flex;align-items:center;justify-content:space-between;gap:35px;min-height:56px;padding:12px 13px 12px 22px;border-radius:15px;background:linear-gradient(100deg,#d7bfff,#ad8afa 60%,#9edaf7);color:#1b1030!important;font-size:12px;font-weight:950;letter-spacing:1.2px;text-decoration:none;box-shadow:0 8px 30px #ad82f642;transition:transform .25s,box-shadow .25s}
      .tools-featured-button:hover{transform:translateY(-4px);box-shadow:0 14px 40px #ae87ff75}
      .tools-featured-button-arrow{display:grid;place-items:center;width:35px;height:35px;border-radius:10px;background:#25143a;color:#f5e9ff;font-size:21px}
      .tools-featured-footnote{margin-top:22px;font-size:9px;letter-spacing:1.8px;color:#9185a7}
      .tools-featured-footnote span{margin:0 7px;color:#b39bf1}
      .tools-featured-visual{position:relative;display:block;min-height:390px;overflow:hidden;border:1px solid #a98af249;border-radius:26px;background:radial-gradient(circle at 50% 45%,#402467,#120d24 52%,#080c18);text-decoration:none;transition:border-color .3s,box-shadow .3s}
      .tools-featured-visual:hover{border-color:#c2a5ff;box-shadow:0 0 60px #a56cff25}
      .tools-featured-visual-grid{position:absolute;inset:0;background-image:linear-gradient(#b9a0ff0d 1px,transparent 1px),linear-gradient(90deg,#b9a0ff0d 1px,transparent 1px);background-size:32px 32px;mask-image:radial-gradient(circle,#000,transparent 75%)}
      .tools-featured-orbit{position:absolute;width:260px;height:260px;top:50%;left:50%;border:1px dashed #c9a8ff57;border-radius:50%;transform:translate(-50%,-50%);animation:tools-v24-spin 32s linear infinite}
      .tools-featured-orbit-b{width:340px;height:340px;border-color:#80c6fa35;animation-direction:reverse;animation-duration:48s}
      .tools-featured-orbit:after{content:'';position:absolute;top:9%;left:16%;width:7px;height:7px;border-radius:50%;background:#d6c1ff;box-shadow:0 0 17px #b991ff}
      .tools-featured-center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:150px;height:150px;border-radius:35px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:1px solid #d4baff99;background:linear-gradient(145deg,#53327a,#25183d);box-shadow:0 0 50px #a16aff45,inset 0 1px #fff3}
      .tools-featured-center>span{font-size:34px;color:#e2caff}.tools-featured-center strong{font-size:27px;font-weight:950;letter-spacing:-1px;color:#fff}.tools-featured-center small{font-size:9px;letter-spacing:3px;color:#cdb5f8}
      .tools-featured-mini{position:absolute;z-index:2;display:flex;flex-direction:column;gap:4px;min-width:130px;padding:12px 15px;border:1px solid #bb9aff77;border-radius:14px;background:#1d1536ed;box-shadow:0 8px 30px #0007;animation:tools-v24-float 6s ease-in-out infinite}
      .tools-featured-mini>span{font-size:21px;color:#c9adff}.tools-featured-mini strong{font-size:11px;letter-spacing:1.5px;color:#f4eaff}.tools-featured-mini small{font-size:8px;letter-spacing:.6px;color:#a99abf}
      .tools-featured-mini-a{top:10%;left:5%}.tools-featured-mini-b{right:4%;top:17%;animation-delay:-2s}.tools-featured-mini-c{left:9%;bottom:9%;animation-delay:-4s}
      .tools-featured-visual-hint{position:absolute;right:15px;bottom:17px;color:#a8d5f8;font-size:9px;letter-spacing:1.4px;font-weight:800}
      .tools-featured-marquee{overflow:hidden;border-top:1px solid #ae8cff31;padding:15px 0;background:#09071688}
      .tools-featured-marquee>div{width:max-content;white-space:nowrap;font:800 10px/1.5 ui-monospace,monospace;letter-spacing:2px;color:#bca9df;animation:tools-v24-marquee 40s linear infinite}
      .tools-featured-marquee b{margin:0 22px;color:#a88bff}
      @keyframes tools-v24-spark{50%{opacity:.5;transform:scale(.75)}}
      @keyframes tools-v24-spin{to{transform:translate(-50%,-50%) rotate(360deg)}}
      @keyframes tools-v24-float{50%{translate:0 -12px}}
      @keyframes tools-v24-marquee{to{transform:translateX(-45%)}}
      @media(max-width:900px){.tools-featured-layout{grid-template-columns:1fr;padding:45px 32px;gap:35px}.tools-featured-visual{min-height:340px}}
      @media(max-width:650px){.tools-featured-section{width:calc(100% - 24px);border-radius:22px}.tools-featured-topline{padding:16px;font-size:8px;letter-spacing:1px}.tools-featured-topline span:last-child{display:none}.tools-featured-layout{padding:32px 20px 37px;gap:25px}.tools-featured-copy h2{font-size:clamp(38px,10vw,56px)}.tools-featured-description{font-size:14px}.tools-featured-chips{gap:7px}.tools-featured-chips span{font-size:9px}.tools-featured-button{width:100%;gap:8px;font-size:11px;letter-spacing:.4px}.tools-featured-visual{min-height:285px}.tools-featured-orbit{width:190px;height:190px}.tools-featured-orbit-b{width:260px;height:260px}.tools-featured-center{width:112px;height:112px;border-radius:25px}.tools-featured-center>span{font-size:26px}.tools-featured-center strong{font-size:20px}.tools-featured-mini{min-width:0;padding:9px 10px}.tools-featured-mini strong{font-size:9px}.tools-featured-mini small{font-size:7px}.tools-featured-mini-a{top:6%;left:3%}.tools-featured-mini-b{top:9%;right:3%}.tools-featured-mini-c{left:4%;bottom:6%}.tools-featured-visual-hint{font-size:8px}.tools-featured-footnote{font-size:8px;letter-spacing:.6px}.tools-nav-spotlight{padding:11px!important}}
      @media(max-width:370px){.tools-featured-mini{display:none}.tools-featured-copy h2{font-size:36px}}
      @media(prefers-reduced-motion:reduce){.tools-featured-orbit,.tools-featured-mini,.tools-featured-marquee>div,.tools-nav-spark,.tools-cta-pulse{animation:none!important}}

      /* V26 — calmer hero, only two primary actions */
      .hero-actions-v26{display:flex;justify-content:center;align-items:center;gap:14px;max-width:700px;margin-inline:auto}
      .hero-actions-v26 .btn,.hero-actions-v26 .tools-hero-cta{min-height:54px;box-sizing:border-box;white-space:nowrap}
      .hero-actions-v26 .tools-hero-cta{border-radius:999px;padding:16px 25px}
      .hero .hero-description{max-width:720px;text-wrap:pretty;line-height:1.8}
      @media(max-width:650px){.hero-actions-v26{flex-direction:column;gap:12px;max-width:340px}.hero-actions-v26 .btn,.hero-actions-v26 .tools-hero-cta{width:100%;min-height:52px}.hero .hero-description{font-size:clamp(15px,4vw,18px);line-height:1.75;padding-inline:5px}}

      /* V27 — Online brand images for contact links */
      .contact-actions-v27{gap:14px;max-width:960px;margin-inline:auto}
      .contact-actions-v27 .btn{display:inline-flex;align-items:center;justify-content:center;gap:11px;min-height:58px;padding:15px 23px;white-space:nowrap;transition:box-shadow .25s,border-color .25s}
      .contact-actions-v27 .btn:hover{box-shadow:0 10px 35px #a78bfa38;border-color:#c4a5ff}
      .contact-brand-icon{display:block;flex:none;width:22px;height:22px;object-fit:contain}
      .contact-actions-v27 .btn.primary{background:linear-gradient(110deg,#7640d9,#9b52e8);color:#fff}
      .contact-actions-v27 .btn span[aria-hidden]{margin-left:2px;font-size:15px}
      @media(max-width:650px){.contact-actions-v27{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.contact-actions-v27 .btn{min-width:0;white-space:normal;min-height:62px;padding:11px 8px;font-size:9px;letter-spacing:.2px;gap:7px}.contact-brand-icon{width:20px;height:20px}}
      @media(max-width:370px){.contact-actions-v27{grid-template-columns:1fr}.contact-actions-v27 .btn{font-size:11px}}
      .inspiration-art{position:relative}
      .inspiration-art-link{position:absolute;inset:0;display:grid;place-items:center;color:inherit;text-decoration:none}
      .inspiration-info-link{position:relative;display:flex;flex-direction:column;min-width:0;color:inherit;text-decoration:none}
      .inspiration-credit{position:absolute;right:8px;bottom:8px;z-index:3;max-width:calc(100% - 16px);padding:5px 7px;border:1px solid #ffffff35;border-radius:7px;background:#090711d9;color:#f1eaff;font:500 8px/1.35 var(--font-mono,monospace);text-decoration:none;backdrop-filter:blur(8px)}
      .inspiration-credit:hover{border-color:#d6bcff;color:#fff}
    `}</style>
    <motion.div className="progress" style={{scaleX:progress}}/>
    <div className="ambient" style={{background:`radial-gradient(circle at ${pointer.x}% ${pointer.y}%,rgba(124,58,237,.24),transparent 37%),radial-gradient(circle at 85% 65%,rgba(34,211,238,.09),transparent 36%)`}}/>
    <div className="grid-bg"/>
    {compact&&<button type="button" className="mobile-quality-button" onClick={()=>setMobileQuality(v=>v==='lite'?'full':'lite')} aria-label={`Switch to ${mobileQuality==='lite'?'full':'smooth'} mobile graphics`} title="Mobile graphics quality">{mobileQuality==='lite'?'⚡ Smooth mode':'✦ Full effects'}</button>}
    <div className="v8-aurora" aria-hidden="true"><span/><span/><span/></div>
    <div className="v8-comets" aria-hidden="true">{comets.slice(0,liteMode?0:compact?3:16).map((c,i)=><motion.span key={i} className="v8-comet" style={{left:`${c.left}%`}} animate={!animateEffects||liteMode?{}:{y:['-15vh','115vh'],opacity:[0,.75,0]}} transition={{duration:c.duration,delay:c.delay,repeat:Infinity,ease:'linear'}}/>)}</div>
    <div className="v8-ripples" aria-hidden="true">{ripples.map(r=><span key={r.id} className="v8-ripple" style={{left:r.x,top:r.y}}/>)}</div>
    <div className="v9-nebula" aria-hidden="true"><span/><span/><span/><span/></div>
    <div className="v9-stars" aria-hidden="true">{extraStars.slice(0,liteMode?14:compact?45:210).map((star,i)=><i key={i} style={{left:`${star.x}%`,top:`${star.y}%`,width:star.size,height:star.size,animationDelay:`-${star.delay}s`}}/>)}</div>
    <div className="v9-scanlines" aria-hidden="true"/>
    <div className="v10-dust" aria-hidden="true">{dust.slice(0,liteMode?0:compact?26:100).map((d,i)=><i key={i} style={{left:`${d.x}%`,top:`${d.y}%`,width:d.size,height:d.size,animationDelay:`-${d.delay}s`}}/>)}</div>
    <div className="v10-ribbons" aria-hidden="true">{ribbons.slice(0,liteMode?0:compact?2:8).map((r,i)=><span key={i} style={{left:`${r.x}%`,animationDelay:`-${r.delay}s`,animationDuration:`${r.duration}s`}}/>)}</div>
    <div className="v10-vignette" aria-hidden="true"/>
    <div className="particles" aria-hidden="true">{streaks.slice(0,liteMode?0:compact?3:streaks.length).map((streak,i)=><motion.span key={`streak-${i}`} className="streak" style={{left:`${streak.left}%`}} animate={!animateEffects||liteMode?{}:{y:[-200,1500],opacity:[0,.75,0]}} transition={{duration:streak.duration,delay:streak.delay,repeat:Infinity,ease:"linear"}}/>)}{particles.slice(0,liteMode?10:compact?38:170).map((p,i)=><motion.span key={i} className="particle" style={{left:`${p.x}%`,top:`${p.y}%`,width:p.size,height:p.size}} animate={!animateEffects||liteMode?{}:{y:[0,-35,0],opacity:[.15,.9,.15],scale:[1,1.7,1]}} transition={{duration:p.duration,delay:p.delay,repeat:Infinity,ease:'easeInOut'}}/>)}</div>
    <div className="v9-float-controls" aria-label="Portfolio quick actions">
      <a href="#projects" className="v9-float-btn" aria-label="Jump to projects" title="Explore projects">✦<span>Work</span></a>
      <a href="#inspiration" className="v9-float-btn" aria-label="Jump to my personal favorites" title="My favorite picks">✧<span>My Picks</span></a>
      <button type="button" className="v9-float-btn" onClick={()=>setEffectsOn(v=>!v)} aria-pressed={effectsOn} title={effectsOn?'Pause decorative effects':'Enable decorative effects'}>{effectsOn?'◉':'◎'}<span>{effectsOn?'FX on':'FX off'}</span></button>
      {showTop&&<button type="button" className="v9-float-btn v9-top" onClick={()=>window.scrollTo({top:0,behavior:reduce?'auto':'smooth'})} aria-label="Back to top" title="Back to top">↑<span>Top</span></button>}
    </div>
    <nav className="nav">
      <motion.a href="#home" className="logo" whileHover={reduce?{}:{scale:1.12,rotate:-6}}>AMSOUL<span style={{color:'#a78bfa'}}>NESS.</span></motion.a>
      <button className="menu-toggle" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>☰</button>
      <div className={`nav-links ${menuOpen?'open':''}`}>
        <a href="#about" onClick={()=>setMenuOpen(false)}>ABOUT</a>
        <a href="#skills" onClick={()=>setMenuOpen(false)}>SKILLS</a>
        <a href="#projects" onClick={()=>setMenuOpen(false)}>WORK</a>
        <a href="#inspiration" onClick={()=>setMenuOpen(false)}>MY PICKS</a>
        <a href="/tools" className="tools-nav-spotlight" onClick={()=>setMenuOpen(false)}><span className="tools-nav-spark">✦</span> TOOLS <span className="tools-nav-new">EXPLORE ↗</span></a>
        <a href="#experience" onClick={()=>setMenuOpen(false)}>EXPERIENCE</a><a href="#contact" onClick={()=>setMenuOpen(false)}>CONTACT ↗</a>
      </div>
    </nav>
    <section id="home" className="hero">
      <div className="visual-field" aria-hidden="true">
        <motion.div className="visual-ring ring-one" animate={reduce?{}:{rotate:360}} transition={{duration:32,repeat:Infinity,ease:'linear'}}><span className="ring-node"/></motion.div>
        <motion.div className="visual-ring ring-two" animate={reduce?{}:{rotate:-360}} transition={{duration:44,repeat:Infinity,ease:'linear'}}><span className="ring-node"/></motion.div>
        <motion.div className="visual-ring ring-three" animate={reduce?{}:{rotate:360}} transition={{duration:56,repeat:Infinity,ease:'linear'}}/>
        <motion.div className="light-orb orb-violet" animate={reduce?{}:{x:[0,35,0],y:[0,-25,0]}} transition={{duration:9,repeat:Infinity}}/>
        <motion.div className="light-orb orb-cyan" animate={reduce?{}:{x:[0,-30,0],y:[0,30,0]}} transition={{duration:11,repeat:Infinity}}/>
        <div className="light-orb orb-pink"/>
        <div className="v9-hero-halo" aria-hidden="true"><div className="v9-hero-halo-inner"/>{orbitSparks.map((spark,i)=><span key={i} style={{transform:`rotate(${spark.angle}deg) translateY(-190px)`,animationDelay:`-${spark.delay}s`}}/>)}</div>
      </div>
      <motion.div className="hero-content" style={{y:heroY}}>
        <motion.p className="eyebrow" initial={reduce?false:{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.8}}>✦ DEVELOPER × CREATIVE EDITOR</motion.p>
        <h1>{['Emmanuel','Cherian.'].map((word,i)=><div key={word} style={{overflow:'hidden',paddingBottom:9}}><motion.span className={i===1?'gradient':''} style={{display:'inline-block'}} initial={reduce?false:{y:'110%',opacity:0}} animate={{y:'0%',opacity:1}} transition={{duration:1.1,delay:.25+i*.25,ease:[.22,1,.36,1]}}>{word}</motion.span></div>)}</h1>
        <Reveal delay={.4}><p className="hero-description">I’m Emmanuel — a BCA student, aspiring software developer, and self-taught video editor. Through AMSOULNESS / ASLNS, I blend code, technology, and cinematic storytelling to turn ideas into experiences.</p></Reveal>
        <div className="actions hero-actions-v26"><MagneticLink href="#projects" primary>EXPLORE MY WORK ↗</MagneticLink><a href="/tools" className="tools-hero-cta"><span className="tools-cta-pulse">✦</span> EXPLORE 5 CREATIVE TOOLS <span aria-hidden="true">↗</span></a></div>
      </motion.div>
      <motion.div className="scroll-cue" animate={reduce?{}:{y:[0,10,0]}} transition={{duration:2,repeat:Infinity}}>SCROLL TO EXPLORE ↓</motion.div>
    </section>
    <section className="tools-featured-section" id="featured-tools" aria-labelledby="tools-featured-title">
      <div className="tools-featured-topline"><span><i/> AMSOULNESS / DIGITAL LAB</span><span>FEATURED EXPERIENCE — 001</span></div>
      <div className="tools-featured-layout">
        <div className="tools-featured-copy">
          <p className="tools-featured-eyebrow">✦ MORE THAN A PORTFOLIO</p>
          <h2 id="tools-featured-title">YOUR IDEAS.<br/><span>OUR TOOLKIT.</span></h2>
          <p className="tools-featured-description">Five focused tools in one creative lab. Update a WhatsApp profile photo, compress and convert images, design QR codes, explore color and create secure passwords — all in your browser.</p>
          <div className="tools-featured-chips"><span>✧ 5 CREATIVE TOOLS</span><span>◇ NO SIGN-UP</span><span>⚡ BUILT FOR CREATORS</span></div>
          <a href="/tools" className="tools-featured-button"><span>EXPLORE THE DIGITAL LAB</span><span className="tools-featured-button-arrow">↗</span></a>
          <p className="tools-featured-footnote">INSTANT ACCESS <span>•</span> BUILT TO CREATE <span>•</span> EXPLORE MORE</p>
        </div>
        <a href="/tools" className="tools-featured-visual" aria-label="Open the AMSOULNESS Tools Hub">
          <div className="tools-featured-visual-grid" aria-hidden="true"/>
          <div className="tools-featured-orbit tools-featured-orbit-a" aria-hidden="true"/>
          <div className="tools-featured-orbit tools-featured-orbit-b" aria-hidden="true"/>
          <div className="tools-featured-center" aria-hidden="true"><span>✦</span><strong>ASLNS</strong><small>TOOLS LAB</small></div>
          <div className="tools-featured-mini tools-featured-mini-a"><span>◈</span><strong>IMAGE</strong><small>COMPRESS / CONVERT</small></div>
          <div className="tools-featured-mini tools-featured-mini-b"><span>▧</span><strong>QR STUDIO</strong><small>DESIGN / EXPORT</small></div>
          <div className="tools-featured-mini tools-featured-mini-c"><span>◎</span><strong>WHATSAPP DP</strong><small>PROFILE PHOTO / FULL IMAGE</small></div>
          <span className="tools-featured-visual-hint">CLICK TO EXPLORE ↗</span>
        </a>
      </div>
      <div className="tools-featured-marquee" aria-hidden="true"><div>WHATSAPP DP STUDIO <b>✦</b> IMAGE STUDIO <b>✦</b> QR CODE STUDIO <b>✦</b> COLOR LAB <b>✦</b> PASSWORD STUDIO <b>✦</b> WHATSAPP DP STUDIO <b>✦</b> IMAGE STUDIO <b>✦</b> QR CODE STUDIO <b>✦</b> COLOR LAB <b>✦</b> PASSWORD STUDIO <b>✦</b></div></div>
    </section>
    <section id="about" className="section">
      <Heading index="01" kicker="THE PERSON" title="Two worlds. One mindset."/>
      <div className="about-layout">
        <div className="about-copy">
          <Reveal><p>I'm <strong>Emmanuel Cherian</strong>, a Bachelor of Computer Applications student at <strong>Al Azhar College of Arts and Science</strong>, affiliated with Mahatma Gandhi University, Kerala. I'm an aspiring software developer who enjoys turning ideas into functional applications.</p></Reveal>
          <Reveal delay={.08}><p>I'm also a self-taught video editor working under <strong>AMSOULNESS / ASLNS</strong>, with interests in cinematic edits, anime, web-series, reels and creative storytelling. I enjoy experimenting with technologies and solving real-world problems.</p></Reveal>
          <Reveal delay={.14}><p>I developed a <strong>WhatsApp Automation Bot</strong> using Java and Python, with automated replies, status downloading and additional messaging automation features.</p></Reveal>
          <Reveal delay={.2}><p>My learning journey includes a <strong>Cyber Security Internship at Adzink Studio</strong> and an <strong>AI Project Development program at AccelerateX</strong>.</p></Reveal>
        </div>
        <Reveal delay={.15}><motion.aside className="about-panel" whileHover={reduce?{}:{y:-8,boxShadow:'0 25px 80px #7c3aed30'}}>
          <span className="eyebrow">QUICK PROFILE</span><h3>Beyond the code.</h3>
          <div className="fact"><small>BASED IN</small><span>Kerala, India</span></div>
          <div className="fact"><small>EDUCATION</small><span>BCA · Expected 2027</span></div>
          <div className="fact"><small>FOCUS</small><span>Software Development · Automation · AI</span></div>
          <div className="fact"><small>INTERESTS</small><span>Technology · Programming · Music · Reading</span></div>
        </motion.aside></Reveal>
      </div>
    </section>
    <section id="skills" className="section">
      <Heading index="02" kicker="CAPABILITIES" title="Technical × creative."/>
      <div className="skill-grid">{skills.map((skill,i)=><motion.a key={skill} href={resourceLinks[skill]} target="_blank" rel="noopener noreferrer" aria-label={`Explore ${skill} in a new tab`} className="skill skill-v7" style={{'--skill-accent':skillDetails[skill].accent} as CSSProperties} initial={reduce?false:{opacity:0,y:38,scale:.94}} whileInView={{opacity:1,y:0,scale:1}} viewport={{once:true,amount:.12}} transition={{duration:.55,delay:(i%5)*.055}} whileHover={reduce?{}:{y:-9,scale:1.025}} whileTap={{scale:.96}}>
  <span className="skill-aura" aria-hidden="true"/><span className="skill-top"><span className="skill-category">{skillDetails[skill].category}</span><span className="skill-number">{skillDetails[skill].mark}</span></span>
  <span className="skill-visual"><span className="skill-orbit" aria-hidden="true"/><TechIcon name={skill}/></span>
  <span className="skill-bottom"><strong>{skill}</strong><span className="skill-description">{skillDetails[skill].description}</span></span><span className="skill-launch" aria-hidden="true">↗</span>
</motion.a>)}</div>
      <div className="editing-tools"><div className="editing-tools-title"><h3>VIDEO EDITING TOOLS</h3><span>My creative toolkit</span></div><div className="editing-tools-grid">{editingTools.map(tool=><Reveal key={tool.name}><motion.div className="editing-tool" whileHover={reduce?{}:{y:-6}} whileTap={reduce?{}:{scale:.985}}><a className="editing-tool-heading resource-heading" href={resourceLinks[tool.name]} target="_blank" rel="noopener noreferrer" aria-label={`Open official ${tool.name} website`}><TechIcon name={tool.name}/><div className="editing-tool-copy"><strong>{tool.name}</strong><span>{tool.level}</span></div><span className="editing-external" aria-hidden="true">↗</span></a><div className="editing-progress-meta"><span>Experience level</span><strong>{tool.progress}%</strong></div><div className="editing-track"><motion.div className="editing-fill" initial={reduce?false:{width:0}} whileInView={{width:`${tool.progress}%`}} viewport={{once:true}} transition={{duration:1.2}}/></div></motion.div></Reveal>)}</div></div>
    </section>
    <section id="projects" className="section">
      <Heading index="03" kicker="FEATURED WORK" title="Ideas in motion."/>
      <Reveal><motion.article className={`project ${activeCard==='WhatsApp Automation Bot'?'touch-active':''}`} onTap={()=>setActiveCard(activeCard==='WhatsApp Automation Bot'?null:'WhatsApp Automation Bot')} whileTap={reduce?{}:{scale:.985}} whileHover={reduce?{}:{y:-10,rotateX:2,rotateY:-2,boxShadow:'0 35px 100px #7c3aed33'}} style={{transformPerspective:1000}}>
        <ProjectArtwork kind={0}/><span className="eyebrow">001 / AUTOMATION ENGINEERING</span><h3>WhatsApp Automation Bot</h3>
        <p>Developed and implemented a WhatsApp automation application using Java and Python. The project features automated replies, status downloading and messaging automation functionality.</p>
        <div className="tags"><ResourceTag name="Java"/><ResourceTag name="Python"/><ResourceTag name="Automation"/></div>
      </motion.article></Reveal>
      <div className="creative-grid">{creativeProjects.map((project,i)=><Reveal key={project.title} delay={i*.08}><motion.article className={`project creative-project ${activeCard===project.title?'touch-active':''}`} onTap={()=>setActiveCard(activeCard===project.title?null:project.title)} whileTap={reduce?{}:{scale:.985}} whileHover={reduce?{}:{y:-10,rotateX:2,rotateY:-2,boxShadow:'0 35px 100px #7c3aed33'}}><ProjectArtwork kind={i+1}/><span className="eyebrow">{project.category}</span><h3>{project.title}</h3><p>{project.description}</p><div className="tags">{project.tags.map(tag=><ResourceTag key={tag} name={tag}/>)}</div></motion.article></Reveal>)}</div>
    </section>
    <section id="experience" className="section">
      <Heading index="04" kicker="EXPERIENCE & EDUCATION" title="Learning by doing."/>
      <div className="timeline">{experiences.map((item,i)=><Reveal key={item.title} delay={i*.12}><motion.div className="timeline-card" whileHover={reduce?{}:{x:12}}><span className="eyebrow">{item.date}</span><h3>{item.title}</h3><strong style={{color:'#a78bfa'}}>{item.company}</strong><p>{item.description}</p></motion.div></Reveal>)}</div>
    </section>
    <section className="section" id="inspiration"><Heading index="05" kicker="THE PERSONAL COLLECTION" title="The things I stand by."/><p className="inspiration-intro">A curated collection of my favorites. From unforgettable stories to music, books, and technology—these are the things I personally love, admire, and recommend. Tap any card to explore.</p><div className="inspiration-grid">{inspirations.map((item,i)=><InspirationCard key={item.title} item={item} index={i}/>)}</div></section>
    <section id="contact" className="section contact">
      <Reveal><span className="eyebrow">06 / LET’S CONNECT</span><h2>Let's create<br/><span className="gradient">something bold.</span></h2>
      <p style={{color:'#b4b1c4',fontSize:19,lineHeight:1.8,marginBottom:40}}>Open to conversations about software development, creative editing, collaboration and new opportunities. The fastest way to reach me is WhatsApp.</p>
      <div className="actions contact-actions-v27">
        <MagneticLink href={`https://wa.me/${WHATSAPP_NUMBER}`} primary external><img className="contact-brand-icon" src="https://cdn.simpleicons.org/whatsapp/FFFFFF" alt="" loading="lazy"/> MESSAGE ON WHATSAPP <span aria-hidden="true">↗</span></MagneticLink>
        <MagneticLink href={EMAIL}><svg className="contact-brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="3"/><path d="m3.5 6 8.5 7 8.5-7"/></svg> SEND AN EMAIL <span aria-hidden="true">↗</span></MagneticLink>
        <MagneticLink href={GITHUB} external><img className="contact-brand-icon" src="https://cdn.simpleicons.org/github/FFFFFF" alt="" loading="lazy"/> GITHUB <span aria-hidden="true">↗</span></MagneticLink>
        <MagneticLink href={LINKEDIN} external><img className="contact-brand-icon" src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/linkedin/linkedin-original.svg" alt="" loading="lazy" onError={e=>{e.currentTarget.style.display="none"}}/> LINKEDIN <span aria-hidden="true">↗</span></MagneticLink>
      </div></Reveal>
    </section>
    <footer className="footer">© 2026 AMSOULNESS / ASLNS — EMMANUEL CHERIAN · BUILT WITH CURIOSITY & CREATIVITY ✳</footer>
  </main>
}

export default function App(){
  const [path, setPath] = useState(() => normalizeSitePath(window.location.pathname))
  const [isPending, startTransition] = useTransition()
  const [navigationPulse, setNavigationPulse] = useState(false)
  const navigationTimer = useRef<number | undefined>(undefined)

  const pulseNavigation = useCallback(() => {
    setNavigationPulse(true)
    window.clearTimeout(navigationTimer.current)
    navigationTimer.current = window.setTimeout(() => setNavigationPulse(false), 760)
  }, [])

  useEffect(() => {
    const syncPath = () => {
      pulseNavigation()
      startTransition(() => setPath(normalizeSitePath(window.location.pathname)))
    }
    window.addEventListener('popstate', syncPath)
    return () => {
      window.removeEventListener('popstate', syncPath)
      window.clearTimeout(navigationTimer.current)
    }
  }, [pulseNavigation])

  const handleNavigation = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]')
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return
    const destination = new URL(link.href, window.location.href)
    if (destination.origin !== window.location.origin) return
    const nextPath = normalizeSitePath(destination.pathname)

    if (destination.hash && nextPath === path) {
      const section = document.getElementById(decodeURIComponent(destination.hash.slice(1)))
      if (!section) return
      event.preventDefault()
      window.history.pushState({}, '', `${destination.pathname}${destination.search}${destination.hash}`)
      pulseNavigation()
      section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
      return
    }

    if (!['/', '/tools'].includes(nextPath)) return
    if (nextPath === path) return
    event.preventDefault()
    window.history.pushState({}, '', `${destination.pathname}${destination.search}`)
    window.scrollTo({ top: 0, behavior: 'instant' })
    pulseNavigation()
    startTransition(() => setPath(nextPath))
  }

  return <div className="site-navigation-shell" onClick={handleNavigation}>
    {(isPending || navigationPulse) && <div className="site-navigation-progress" role="status" aria-label="Navigating the website">
      <div className="site-navigation-progress-track"><span /></div>
      <div className="site-navigation-progress-label"><span className="site-navigation-orbit" aria-hidden="true"><i /></span><span>ASLNS / TRANSITION</span><b aria-hidden="true">✦</b></div>
    </div>}
    {path === '/tools'
      ? <Suspense fallback={<ToolsLoading/>}><ToolsHub/></Suspense>
      : <PortfolioApp/>}
  </div>
}
