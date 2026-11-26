import { useEffect, useRef } from 'react'

const TAU = Math.PI * 2
const GLYPHS = ' .,:~+*^01|/\\-_#()x1il!;:rtfjcvxz=+aeoun0{}[]<>08B$#&%Q'
const FORE: [number, number][] = [[0, .06], [.3, .42], [.78, .62], [1.02, .52], [.9, .2], [.5, 0]]
const HIND: [number, number][] = [[0, -.02], [.5, -.04], [.68, -.3], [.5, -.6], [.22, -.66], [.04, -.3]]
const smooth = (n: number) => { const x = Math.max(0, Math.min(1, n)); return x * x * (3 - 2 * x) }
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

type Fly = { born: number; home: [number, number, number]; reach: number; w: number[]; ph: number[]; beat: number; size: number }
type Mark = { x: number; y: number; z: number; shade: number; body: boolean }

function inside(x: number, y: number, polygon: [number, number][]) {
  let hit = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [x0, y0] = polygon[i], [x1, y1] = polygon[j]
    if ((y0 > y) !== (y1 > y) && x < (x1 - x0) * (y - y0) / (y1 - y0 + 1e-9) + x0) hit = !hit
  }
  return hit
}

function makeWingPoints() {
  const out: { x: number; y: number; core: number }[] = []
  for (let i = 0; i < 300; i++) {
    let x = 0, y = 0, tries = 0
    do { x = hash(i * 7 + tries * 13 + 2) * 1.05; y = hash(i * 11 + tries * 19 + 5) * 1.32 - .68; tries++ }
    while (!inside(x, y, FORE) && !inside(x, y, HIND) && tries < 60)
    if (tries < 60) out.push({ x, y, core: Math.exp(-((x - .1) ** 2 + y ** 2) * 3) })
  }
  return out
}

function makeFlock(): Fly[] {
  const golden = .618034
  return Array.from({ length: 22 }, (_, i) => {
    const depth = -5 + 7 * ((i * golden) % 1) ** 1.6, d = 6 - depth
    const home: [number, number, number] = [(((i * golden * 2.3) % 1) - .5) * 2 * d * .345 * .7,
      .4 + (((i * .37 + .2) % 1) - .62) * 2 * d * .307 * .7, depth]
    if (d < 5) home[1] = Math.max(home[1], .4 - d * .307 * .25)
    const fly: Fly = { born: 3 + i * .45 + .2 * Math.sin(i * 3.1), home, reach: d * .345 * .7,
      w: [0, 1, 2].map(k => .25 + hash(i * 9 + k + 4) * .3), ph: [0, 1, 2].map(k => hash(i * 13 + k + 29) * TAU),
      beat: 2.6 + hash(i * 17 + 3) * 1, size: .17 + hash(i * 23 + 7) * .07 }
    if (i === 7) { fly.home = [.55, .45, 2.6]; fly.reach = .7 }
    return fly
  })
}

const WINGS = makeWingPoints()
const FLOCK = makeFlock()
const PALETTE = ['#779fc8', '#8bb9e6', '#b2e4ff', '#d6f1ff', '#effaff']

function flyPosition(f: Fly, t: number): [number, number, number] {
  const a = t - f.born, [w0, w1, w2] = f.w, [p0, p1, p2] = f.ph, r = f.reach
  const roam: [number, number, number] = [f.home[0] + Math.sin(w0 * t + p0) * r * 1.6 + Math.sin(w1 * 2.3 * t) * r * .2,
    f.home[1] + Math.sin(w1 * t + p1) * r * .75 + Math.sin(w2 * 3.1 * t + p2) * .1,
    f.home[2] + Math.sin(w2 * t + p2) * 1.3]
  const u = smooth(a / 2.8), swirl = .5 * Math.sin(Math.PI * u), angle = a * 2.2 + p0
  return [1.7 * (1 - u) + roam[0] * u + Math.cos(angle) * swirl, .55 * (1 - u) + roam[1] * u, roam[2] * u + Math.sin(angle) * swirl]
}

/** Browser canvas rendition of butterfly.py: a 3D ASCII flock, glass-opening sequence and trailing light. */
export default function PrivateButterflyScene({ label }: { label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: false })
    if (!canvas || !ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0, visible = false, width = 1, height = 1, lastFrame = 0, elapsed = 0
    let cols = 1, rows = 1, cellW = 6, cellH = 10
    let zbuf = new Float32Array(1), light = new Float32Array(1), chars = new Uint8Array(1), body = new Uint8Array(1)
    const resize = () => {
      const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = Math.max(1, rect.width); height = Math.max(1, rect.height)
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.max(22, Math.floor(width / 6)); rows = Math.max(10, Math.floor(height / 10)); cellW = width / cols; cellH = height / rows
      zbuf = new Float32Array(cols * rows); light = new Float32Array(cols * rows); chars = new Uint8Array(cols * rows); body = new Uint8Array(cols * rows)
    }
    const sizeObserver = new ResizeObserver(resize); sizeObserver.observe(canvas); resize()

    const marksFor = (t: number) => {
      const marks: Mark[] = []
      FLOCK.forEach((f, i) => {
        const age = t - f.born
        if (age < 0) return
        const p0 = flyPosition(f, t - .25), p1 = flyPosition(f, t + .25), pos = flyPosition(f, t)
        const yaw = Math.max(-.75, Math.min(.75, (p1[0] - p0[0]) * 1.6)), beat = f.beat * t + f.ph[0]
        const flap = .5 + .5 * Math.sin(beat * TAU), lift = -.3 + 1.55 * flap, c = Math.cos(lift), s = Math.sin(lift)
        const size = f.size * (.15 + .85 * smooth(age)), glow = smooth(age / .5) * Math.max(.6, Math.min(1, 1.4 - (6 - pos[2]) / 16))
        const cy = pos[1] - .035 * Math.cos(beat * TAU)
        const push = (x: number, y: number, z: number, shade: number, isBody = false) => {
          // Match the source's pitch, bank and yaw transforms before perspective projection.
          const pc = Math.cos(-1.15), ps = Math.sin(-1.15)
          const py = pc * y - ps * z, pz = ps * y + pc * z
          const bc = Math.cos(yaw * .6), bs = Math.sin(yaw * .6)
          const bx = bc * x - bs * py, by = bs * x + bc * py
          const ang = Math.PI + yaw, wx = Math.cos(ang) * bx + Math.sin(ang) * pz, wz = -Math.sin(ang) * bx + Math.cos(ang) * pz
          const worldX = wx + pos[0], worldY = by + cy, worldZ = wz + pos[2], depth = 6 - worldZ
          if (depth <= .2) return
          const aspect = (cols * cellW) / (rows * cellH), col = Math.floor((.5 + worldX / depth * 1.45) * cols), row = Math.floor((.5 - (worldY - .4) / depth * 1.45 * aspect) * rows)
          if (col < 0 || col >= cols || row < 0 || row >= rows) return
          marks.push({ x: col, y: row, z: depth, shade: shade * glow, body: isBody })
        }
        const wingShade = (p: typeof WINGS[number]) => (.62 + .38 * p.core) * 1.15
        for (const p of WINGS) {
          const x = p.x * size, z = p.y * size
          push(x * c, x * s, z, wingShade(p)); push(-x * c, x * s, z, wingShade(p))
        }
        for (let j = 0; j < 34; j++) push(0, 0, (-.35 + .65 * j / 33) * size, 1.15, true)
        // Fine grains drift off each flight path for the same glitter-trail finish.
        const step = .11, life = 1.8
        for (let n = 0; n < Math.floor(life / step); n++) {
          const born = Math.floor(t / step) * step - n * step, particleAge = t - born
          if (born <= f.born + .3 || particleAge < 0 || particleAge >= life) continue
          const seed = i * 1500 + Math.round(born / step) * 17 + n * 7
          const driftX = (hash(seed + 1) - .5) * 1.1, driftY = (hash(seed + 2) - .5) * .6
          const [gx, gy, gz] = flyPosition(f, born)
          push(gx + driftX * particleAge + (hash(seed + 3) - .5) * .18, gy + driftY * particleAge - .09 * particleAge ** 2, gz + (hash(seed + 4) - .5) * particleAge, .85 * (1 - particleAge / life), false)
        }
      })
      return marks
    }

    const drawCracks = (t: number) => {
      const impactX = width * .84, impactY = height * .47, impact = [ .72, 1.32, 1.92, 2.52 ].filter(v => t >= v).length
      if (t < .2) return
      ctx.save(); ctx.translate(impactX, impactY)
      const first = Math.min(1, Math.max(0, (t - .2) / .14))
      ctx.strokeStyle = 'rgba(207,232,255,.75)'; ctx.lineWidth = .75
      for (let side = 0; side < 2; side++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo((side ? 1 : -1) * width * .08 * first, Math.sin(t * 7 + side) * height * .02); ctx.stroke() }
      for (let k = 0; k < 10; k++) {
        const when = [.72, 1.32, 1.92, 2.52][Math.min(3, Math.floor(k / 3))]
        const progress = Math.max(0, Math.min(1, (t - when) / .18))
        if (!progress) continue
        const a = TAU * k / 10 + (hash(k + 51) - .5) * .15, len = Math.min(width * .26, width * (.12 + hash(k + 80) * .15)) * progress
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 8)
        let x = Math.cos(a) * 10, y = Math.sin(a) * 8
        for (let s = 1; s <= 8; s++) { const bend = (hash(k * 10 + s) - .5) * height * .035; x = Math.cos(a) * (10 + len * s / 8) - Math.sin(a) * bend; y = Math.sin(a) * (8 + len * s / 8) + Math.cos(a) * bend; ctx.lineTo(x, y) }
        ctx.strokeStyle = `rgba(198,229,255,${.5 + .1 * impact})`; ctx.stroke()
      }
      if (t > 1.9) { ctx.beginPath(); ctx.arc(0, 0, Math.min(width, height) * (.04 + Math.min(.12, (t - 1.9) * .09)), 0, TAU); ctx.strokeStyle = 'rgba(230,244,255,.55)'; ctx.stroke() }
      if (t > 2.54) {
        ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(0, 0, Math.min(width, height) * .11, 0, TAU); ctx.fill()
        ctx.globalCompositeOperation = 'source-over'
        for (let i = 0; i < 22; i++) { const age = (t - 2.54 - i * .035); if (age < 0 || age > .95) continue; ctx.fillStyle = `rgba(205,231,255,${1 - age})`; ctx.fillText(i % 3 ? '.' : '*', Math.cos(i * 2.4) * (8 + age * 54), Math.sin(i * 2.4) * (7 + age * 45) + age * age * 24) }
      }
      ctx.restore()
    }

    const render = (time: number) => {
      raf = 0
      if (!visible || document.hidden) return
      if (!reduced.matches && time - lastFrame < 40) { raf = requestAnimationFrame(render); return }
      lastFrame = time
      const t = reduced.matches ? 9 : elapsed
      if (!reduced.matches) elapsed = (elapsed + .04) % 20
      ctx.fillStyle = 'rgba(2,3,8,.46)'; ctx.fillRect(0, 0, width, height)
      if (elapsed < .06 || t < .04) { ctx.fillStyle = '#020308'; ctx.fillRect(0, 0, width, height) }
      zbuf.fill(99); light.fill(0); chars.fill(0); body.fill(0)
      const marks = marksFor(t).sort((a, b) => b.z - a.z)
      for (const m of marks) {
        const idx = m.y * cols + m.x
        if (m.z < zbuf[idx]) { zbuf[idx] = m.z; light[idx] = Math.max(.18, Math.min(1, m.shade)); body[idx] = m.body ? 2 : 1; chars[idx] = Math.floor(hash(idx + Math.floor(t * 8) + Math.round(m.z * 13)) * GLYPHS.length) }
      }
      // Find the silhouette boundary so the output reads like a 3D ASCII render, not a flat sprite.
      ctx.font = `${Math.max(6, Math.min(10, cellH * .82))}px ui-monospace,Consolas,monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const idx = y * cols + x, type = body[idx]
        if (!type) continue
        const edge = !body[idx - 1] || !body[idx + 1] || !body[idx - cols] || !body[idx + cols]
        const lum = light[idx], glyph = edge ? (x > 0 && x < cols - 1 ? (y > 0 && y < rows - 1 ? '+' : '|') : '|') : GLYPHS[chars[idx]]
        const color = type === 2 ? '#f6fcff' : PALETTE[Math.min(4, Math.floor(lum * 5))]
        ctx.globalAlpha = Math.max(.28, Math.min(1, lum * (edge ? .9 : .83)))
        ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = edge ? 5 : 2
        ctx.fillText(glyph, (x + .5) * cellW, (y + .5) * cellH)
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0
      drawCracks(t)
      // The original's two bloom passes become compact, canvas-safe additive light.
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .2
      const glow = ctx.createRadialGradient(width * .84, height * .47, 1, width * .84, height * .47, Math.max(width, height) * .35)
      glow.addColorStop(0, '#c9e7ff'); glow.addColorStop(.28, '#75a4ff33'); glow.addColorStop(1, '#03050b00')
      ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height); ctx.restore()
      ctx.fillStyle = '#9aa8bc'; ctx.font = '9px ui-monospace,Consolas,monospace'; ctx.textAlign = 'left'; ctx.fillText('ASLNS · @ft.aslns', 10, height - 18); ctx.fillStyle = '#ff7ab6'; ctx.fillText(`${marks.length ? '✦' : '·'} 3D ASCII BUTTERFLY`, 10, height - 7)
      if (visible && !document.hidden && !reduced.matches) raf = requestAnimationFrame(render)
    }

    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting)
      if (visible && !document.hidden && !raf) raf = requestAnimationFrame(render)
      if (!visible && raf) { cancelAnimationFrame(raf); raf = 0 }
    }, { threshold: .05 })
    observer.observe(canvas)
    const visibility = () => {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0 }
      else if (visible && !raf) raf = requestAnimationFrame(render)
    }
    document.addEventListener('visibilitychange', visibility)
    const motion = () => { if (visible && !raf) raf = requestAnimationFrame(render) }
    reduced.addEventListener('change', motion)
    return () => { cancelAnimationFrame(raf); observer.disconnect(); sizeObserver.disconnect(); document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', motion) }
  }, [])

  return <canvas ref={canvasRef} className="private-butterfly-canvas" role="img" aria-label={label}/>
}
