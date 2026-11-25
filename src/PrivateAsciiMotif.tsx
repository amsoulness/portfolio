import { useEffect, useRef } from 'react'

type Motif = 'ring' | 'rose' | 'daisy' | 'cat' | 'heart' | 'butterfly'

const privateArtwork: Partial<Record<Motif, string>> = {
  ring: '/api/private-art?art=ring',
  rose: '/api/private-art?art=rose',
  daisy: '/api/private-art?art=daisy',
  cat: '/api/private-art?art=cat',
  heart: '/api/private-art?art=heart',
}

type Point = { x: number; y: number; z: number; char: string; order?: number; part?: 'band' | 'prong' | 'gem' }

const GLYPHS = ' .,:;+=*xX#@'
const smoothReveal = (value: number) => { const x = Math.max(0, Math.min(1, value)); return x * x * (3 - 2 * x) }

function makePoints(motif: Motif): Point[] {
  const points: Point[] = []
  const add = (x: number, y: number, z: number, char = '*') => points.push({ x, y, z, char })

  if (motif === 'ring') {
    return makeDiamondRing()
  }

  if (motif === 'rose' || motif === 'daisy') {
    const petals = motif === 'rose' ? 7 : 12
    for (let p = 0; p < petals; p++) {
      const base = p * Math.PI * 2 / petals
      for (let t = .12; t < 1.4; t += .09) for (let u = -.8; u <= .8; u += .13) {
        const radius = motif === 'rose' ? .1 + t * .31 + .09 * Math.sin(t * 4 + p) : .22 + .23 * t
        const spread = motif === 'rose' ? u * (.06 + t * .11) : u * .055
        const a = base + spread + .17 * Math.sin(t * 2)
        add(radius * Math.cos(a), radius * Math.sin(a) - .06, .13 * Math.sin(t * 3 + p) + .05 * u, motif === 'rose' ? '✿' : '*')
      }
    }
    for (let y = -.1; y > -.83; y -= .035) add(.08 * Math.sin(y * 11), y, .02, '|')
    for (const side of [-1, 1]) for (let t = 0; t < 1; t += .06) add(side * t * .31, -.48 - t * .16, .05 + .04 * Math.sin(t * Math.PI), 'v')
    for (let a = 0; a < Math.PI * 2; a += .16) add(.105 * Math.cos(a), -.03 + .105 * Math.sin(a), .2, motif === 'rose' ? 'o' : '.')
  }

  if (motif === 'cat') {
    const inside = (x: number, y: number) => {
      const head = x * x / .43 + (y + .04) ** 2 / .34 < 1
      const leftEar = y > .24 && y < .86 && x > -.77 + (y - .24) * .5 && x < -.36 - (y - .24) * .15
      const rightEar = y > .24 && y < .86 && x < .77 - (y - .24) * .5 && x > .36 + (y - .24) * .15
      return head || leftEar || rightEar
    }
    for (let y = -.56; y <= .72; y += .075) for (let x = -.66; x <= .66; x += .065) if (inside(x, y)) add(x, y, .1 * Math.cos(x * 5) + .08 * Math.sin(y * 6), 'm')
    for (let x = -.72; x <= .72; x += .06) add(x, .82 - Math.abs(x) * .12, .12, '^')
    for (const x of [-.24, .24]) { add(x, -.08, .25, '◆'); add(x, -.1, .29, '*') }
    for (let a = 0; a < Math.PI * 2; a += .18) add(.65 * Math.cos(a), -.2 + .42 * Math.sin(a), -.05, 'o')
    for (let y = -.54; y < -.27; y += .045) add(.66, y, -.03, '/')
  }

  if (motif === 'heart') {
    for (let u = 0; u < Math.PI * 2; u += .045) for (let v = 0; v < Math.PI; v += .12) {
      const x = .72 * Math.sin(v) ** 3 * Math.cos(u)
      const y = (.58 * Math.cos(v) - .22 * Math.cos(2 * v) - .1 * Math.cos(3 * v) - .04 * Math.cos(4 * v))
      add(x, y, .28 * Math.sin(v) * Math.sin(u), '♥')
    }
  }

  if (motif === 'butterfly') {
    for (const side of [-1, 1]) for (let t = .04; t <= 1; t += .035) for (let a = 0; a < Math.PI * 2; a += .09) {
      const upper = .49 * Math.sin(a)
      const lower = .28 * Math.sin(a)
      const x = side * (.06 + t * .76)
      const y = (Math.sin(a) >= 0 ? upper : lower) * t + .12 * Math.cos(t * Math.PI)
      if (Math.abs(y) < (Math.sin(a) >= 0 ? .49 * t : .28 * t)) add(x, y, .13 * Math.sin(a) + .06 * Math.cos(t * 8), '*')
    }
    for (let y = -.35; y <= .34; y += .035) add(0, y, .22, '|')
    for (let t = 0; t < 1; t += .05) { add(-.06 * t, .34 + .2 * t, .18, '/'); add(.06 * t, .34 + .2 * t, .18, '\\') }
  }
  return points
}

// Browser canvas adaptation of the ASLNS diamond_ring.py point-cloud animation.
// It keeps the scripted 3D band, prongs, faceted stone, progressive reveal, and orbiting light.
function makeDiamondRing(): Point[] {
  const points: Point[] = []
  const tau = Math.PI * 2
  const bandRadius = .55
  const add = (x: number, y: number, z: number, order: number, part: Point['part'], char = '*') => points.push({ x, y, z, order, part, char })

  // Gold band: denser glyphs along its silhouette create the 3D ASCII volume.
  for (let a = 0; a < tau; a += .046) {
    const order = Math.abs(Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2))) / Math.PI
    const tube = .065 * (1 - .35 * Math.max(0, Math.sin(a)) ** 6)
    for (let b = 0; b < tau; b += .22) {
      const radius = bandRadius + tube * Math.cos(b)
      add(radius * Math.cos(a), radius * Math.sin(a), tube * 1.5 * Math.sin(b), order, 'band', 'o')
    }
  }

  // Four sculpted prongs rise from the band and hold the stone in place.
  for (let i = 0; i < 4; i++) {
    const a = tau * (i + .5) / 4
    const base = [.08 * Math.cos(a), bandRadius + .02, .08 * Math.sin(a)]
    const tip = [.265 * Math.cos(a), .97, .265 * Math.sin(a)]
    for (let step = 0; step <= 28; step++) {
      const u = step / 28
      const x = base[0] + (tip[0] - base[0]) * u
      const y = base[1] + (tip[1] - base[1]) * u
      const z = base[2] + (tip[2] - base[2]) * u
      const order = 1 + (y - bandRadius) / (.97 - bandRadius) * .25
      for (let k = 0; k < 8; k++) {
        const spin = tau * k / 8
        add(x + .018 * Math.cos(spin), y, z + .018 * Math.sin(spin), order, 'prong', '+')
      }
    }
  }

  // Triangular, alternating facets form a tapered diamond with a bright table.
  const girdleY = .88, girdleR = .25, tableY = 1, tableR = .135, culetY = .66
  const triangle = (a: number[], b: number[], c: number[], face: number) => {
    const divisions = 5
    for (let row = 0; row <= divisions; row++) for (let col = 0; col <= divisions - row; col++) {
      const u = row / divisions, v = col / divisions
      const p = a.map((value, i) => value + (b[i] - value) * u + (c[i] - value) * v)
      const order = 1.25 + (p[1] - culetY) / (tableY - culetY) * .45
      add(p[0], p[1], p[2], order, 'gem', face % 3 === 0 ? '◇' : '*')
    }
  }
  for (let i = 0; i < 16; i++) {
    const a0 = tau * i / 16, a1 = tau * (i + 1) / 16
    const g0 = [girdleR * Math.cos(a0), girdleY, girdleR * Math.sin(a0)]
    const g1 = [girdleR * Math.cos(a1), girdleY, girdleR * Math.sin(a1)]
    const t0 = [tableR * Math.cos(a0), tableY, tableR * Math.sin(a0)]
    const t1 = [tableR * Math.cos(a1), tableY, tableR * Math.sin(a1)]
    const culet = [0, culetY, 0]
    triangle(g0, g1, t0, i * 4)
    triangle(g1, t1, t0, i * 4 + 1)
    triangle(g0, g1, culet, i * 4 + 2)
    triangle([0, tableY, 0], t0, t1, i * 4 + 3)
  }

  return points
}

export default function PrivateAsciiMotif({ motif, label }: { motif: Motif; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  if (privateArtwork[motif]) return <img className={`private-artwork private-artwork-${motif}`} src={privateArtwork[motif]} alt={label} loading="lazy" decoding="async"/>

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const points = makePoints(motif)
    let animation = 0
    let active = false
    let startedAt: number | null = null
    let lastFrame = 0
    const colors: Record<Motif, string> = { ring: '#ffe39a', rose: '#ff7281', daisy: '#ffe49b', cat: '#ffe3ac', heart: '#ff526d', butterfly: '#d9c5ff' }
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    const draw = (time: number) => {
      animation = 0
      if ((!active && motif === 'ring') || document.hidden) return
      if (motif === 'ring' && time - lastFrame < 32) { animation = requestAnimationFrame(draw); return }
      lastFrame = time
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      context.clearRect(0, 0, w, h)
      startedAt ??= time
      const seconds = (time - startedAt) / 1000
      const loopTime = seconds % 20
      const angle = motif === 'ring' ? Math.max(0, loopTime - 6.2) * Math.PI * 2 / 12 : time * .00034
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const scale = Math.min(w, h) * (motif === 'ring' ? .43 : .37)
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.font = `700 ${Math.max(7, Math.min(motif === 'ring' ? 11 : 12, scale / (motif === 'ring' ? 31 : 24)))}px ui-monospace, monospace`
      const ordered = points.map(point => {
        const x = point.x * cos - point.z * sin
        const z = point.x * sin + point.z * cos
        const y = point.y
        const camera = 2.8 / (2.8 - z)
        return { ...point, px: w / 2 + x * scale * camera, py: h / 2 - y * scale * camera, depth: z, camera }
      }).sort((a, b) => a.depth - b.depth)
      const revealHead = loopTime < 6.2 ? Math.max(0, Math.min(1.7, (loopTime - .3) / 5.6 * 1.7)) : 1.7
      const reveal = (point: typeof ordered[number]) => motif !== 'ring' ? 1 : smoothReveal((revealHead - (point.order ?? 0)) / .07)
      if (motif === 'ring') {
        // Soft shadow and two orbiting rings echo the Python render's reflected floor and halos.
        context.save()
        context.globalAlpha = .28
        context.strokeStyle = '#c2adff'
        context.lineWidth = 1
        context.beginPath(); context.ellipse(w / 2, h * .77, scale * .42, scale * .11, -.09, 0, Math.PI * 2); context.stroke()
        context.strokeStyle = '#f5d36f'
        context.beginPath(); context.ellipse(w / 2, h * .77, scale * .33, scale * .075, .06, 0, Math.PI * 2); context.stroke()
        context.restore()
      }
      for (const point of ordered) {
        const amount = reveal(point)
        if (amount < .06) continue
        const brightness = Math.max(.2, Math.min(1, .5 + point.depth * .4))
        const glyph = GLYPHS[Math.round(brightness * (GLYPHS.length - 1))]
        const gem = point.part === 'gem'
        const color = motif !== 'ring' ? colors[motif] : gem ? (Math.sin(seconds * 4 + point.x * 32 + point.z * 28) > .72 ? '#fff8e9' : (point.x + point.z > 0 ? '#c2adff' : '#f5d36f')) : point.part === 'prong' ? '#ffe5a1' : '#f5d36f'
        context.globalAlpha = brightness * amount
        context.fillStyle = color
        context.shadowColor = gem ? '#fff3c6' : '#f5d36f'
        context.shadowBlur = gem && brightness > .7 ? 10 : 3
        context.fillText(point.char === '✿' || point.char === '♥' || point.char === '◇' ? point.char : glyph, point.px, point.py)
      }
      if (motif === 'ring') {
        const progress = Math.max(0, Math.min(1, (loopTime - .3) / 5.6))
        const flash = Math.exp(-(((loopTime - 5.9) / .22) ** 2))
        const orbitOn = Math.max(0, Math.min(1, (loopTime - 6.2) / 1.5))
        context.save()
        context.globalCompositeOperation = 'lighter'
        context.globalAlpha = .14 + flash * .75
        const glow = context.createRadialGradient(w / 2, h * .37, 1, w / 2, h * .37, scale * .72)
        glow.addColorStop(0, '#fff5d1'); glow.addColorStop(.2, '#f5d36f66'); glow.addColorStop(.52, '#ef526733'); glow.addColorStop(1, '#c2adff00')
        context.fillStyle = glow; context.fillRect(0, 0, w, h)
        context.globalAlpha = orbitOn * .62
        for (let i = 0; i < 2; i++) {
          context.strokeStyle = i === 0 ? '#c2adff' : '#f5d36f'
          context.lineWidth = 1
          context.beginPath()
          context.ellipse(w / 2, h * .41, scale * .58, scale * .19, i ? -.5 : .48, 0, Math.PI * 2)
          context.stroke()
          const a = seconds * (i ? -.7 : .9)
          const px = w / 2 + Math.cos(a) * scale * .58
          const py = h * .41 + Math.sin(a) * scale * .19
          context.globalAlpha = orbitOn * (.5 + .5 * Math.sin(seconds * 6 + i))
          context.fillStyle = i === 0 ? '#c2adff' : '#fff0a8'
          context.shadowColor = i === 0 ? '#c2adff' : '#fff0a8'; context.shadowBlur = 12
          context.fillText('*', px, py)
        }
        // A short upward drift of bright flecks follows the drawing head.
        context.shadowBlur = 8
        for (let i = 0; i < 24; i++) {
          const phase = (seconds * .23 + i * .041) % 1
          const x = w * (.22 + ((i * 37) % 58) / 100) + Math.sin(seconds * 1.8 + i) * 9
          const y = h * (.78 - phase * .72)
          context.globalAlpha = (1 - phase) * (.2 + .55 * Math.abs(Math.sin(seconds * 3 + i))) * (progress > .1 ? 1 : progress * 5)
          context.fillStyle = i % 3 ? '#f5d36f' : '#c2adff'
          context.fillText(i % 4 === 0 ? '✦' : '.', x, y)
        }
        context.restore()
      }
      context.globalAlpha = 1
      context.shadowBlur = 0
      if (active && !document.hidden) animation = requestAnimationFrame(draw)
    }
    const visibility = new IntersectionObserver(entries => {
      active = entries.some(entry => entry.isIntersecting && entry.intersectionRatio > .08)
      if (active && !document.hidden && !animation) animation = requestAnimationFrame(draw)
      if (!active && animation) { cancelAnimationFrame(animation); animation = 0 }
    }, { root: canvas.closest('.private-scene-viewport'), threshold: [.08, .2] })
    visibility.observe(canvas)
    const onVisibility = () => {
      if (document.hidden && animation) { cancelAnimationFrame(animation); animation = 0 }
      else if (!document.hidden && (active || motif !== 'ring') && !animation) animation = requestAnimationFrame(draw)
    }
    document.addEventListener('visibilitychange', onVisibility)
    if (motif !== 'ring') { active = true; animation = requestAnimationFrame(draw) }
    return () => { cancelAnimationFrame(animation); observer.disconnect(); visibility.disconnect(); document.removeEventListener('visibilitychange', onVisibility) }
  }, [motif])

  return <canvas ref={canvasRef} className={`private-ascii-motif private-ascii-${motif}`} role="img" aria-label={label}/>
}
