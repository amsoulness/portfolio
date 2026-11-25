import { useEffect, useRef } from 'react'

type Motif = 'ring' | 'rose' | 'daisy' | 'cat' | 'heart' | 'butterfly'

type Point = { x: number; y: number; z: number; char: string }

const GLYPHS = ' .,:;+=*xX#@'

function makePoints(motif: Motif): Point[] {
  const points: Point[] = []
  const add = (x: number, y: number, z: number, char = '*') => points.push({ x, y, z, char })

  if (motif === 'ring') {
    for (let a = 0; a < Math.PI * 2; a += .065) for (let b = 0; b < Math.PI * 2; b += .24) {
      const r = .57 + .14 * Math.cos(b)
      add(r * Math.cos(a), r * Math.sin(a) * .72, .14 * Math.sin(b) + .1 * Math.cos(a), 'o')
    }
    for (let a = 0; a < Math.PI * 2; a += .14) add(.22 * Math.cos(a), -.47 + .18 * Math.sin(a), .25, '+')
    for (let a = 0; a < Math.PI * 2; a += .18) add(.22 * Math.cos(a), -.69 + .12 * Math.sin(a), .28, '◇')
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

export default function PrivateAsciiMotif({ motif, label }: { motif: Motif; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const points = makePoints(motif)
    let animation = 0
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
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      context.clearRect(0, 0, w, h)
      const angle = time * .00034
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const scale = Math.min(w, h) * .37
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.font = `700 ${Math.max(7, Math.min(12, scale / 24))}px ui-monospace, monospace`
      const ordered = points.map(point => {
        const x = point.x * cos - point.z * sin
        const z = point.x * sin + point.z * cos
        const y = point.y
        const camera = 2.8 / (2.8 - z)
        return { ...point, px: w / 2 + x * scale * camera, py: h / 2 - y * scale * camera, depth: z, camera }
      }).sort((a, b) => a.depth - b.depth)
      for (const point of ordered) {
        const brightness = Math.max(.25, Math.min(1, .45 + point.depth * .45))
        const glyph = GLYPHS[Math.round(brightness * (GLYPHS.length - 1))]
        context.globalAlpha = brightness
        context.fillStyle = colors[motif]
        context.shadowColor = colors[motif]
        context.shadowBlur = point.depth > 0 ? 8 : 2
        context.fillText(point.char === '✿' || point.char === '♥' || point.char === '◇' ? point.char : glyph, point.px, point.py)
      }
      context.globalAlpha = 1
      context.shadowBlur = 0
      animation = requestAnimationFrame(draw)
    }
    animation = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(animation); observer.disconnect() }
  }, [motif])

  return <canvas ref={canvasRef} className={`private-ascii-motif private-ascii-${motif}`} role="img" aria-label={label}/>
}
