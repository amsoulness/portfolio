import { useEffect, useRef } from 'react'

const TAU = Math.PI * 2
const GLYPHS = ' .,:~+*^01|/\\-_#()x'
const COUNT = 22
const rand = (seed: number) => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

/** Browser-sized adaptation of the ASLNS butterfly flock scene for the keepsake card. */
export default function PrivateButterflyScene({ label }: { label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !ctx) return

    let raf = 0
    let visible = false
    let width = 1
    let height = 1
    let lastFrame = 0
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const sizeObserver = new ResizeObserver(resize)
    sizeObserver.observe(canvas)
    resize()

    const draw = (now: number) => {
      raf = 0
      if (!visible || document.hidden) return
      if (now - lastFrame < 32 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        raf = requestAnimationFrame(draw)
        return
      }
      lastFrame = now
      const t = (now / 1000) % 20
      const s = Math.min(width, height) / 520
      const cx = width * 0.5
      const cy = height * 0.5
      ctx.clearRect(0, 0, width, height)

      // A subtle shattered-glass halo echoes the opening sequence in the source animation.
      const opening = Math.max(0, 1 - t / 3.6)
      if (opening > 0.01) {
        ctx.save()
        ctx.translate(cx + width * .31, cy - height * .06)
        ctx.strokeStyle = `rgba(190,224,255,${opening * .38})`
        ctx.lineWidth = 0.7
        for (let i = 0; i < 12; i++) {
          const a = TAU * i / 12 + rand(i + 4) * .22
          const radius = Math.min(width, height) * (.34 + rand(i + 22) * .22)
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius)
          ctx.stroke()
        }
        ctx.beginPath()
        ctx.arc(0, 0, Math.min(width, height) * (.07 + (1 - opening) * .22), 0, TAU)
        ctx.stroke()
        ctx.restore()
      }

      const butterfly = (x: number, y: number, scale: number, phase: number, yaw: number, glow: number) => {
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(yaw)
        ctx.scale(scale, scale)
        const flap = Math.sin(t * (5.5 + phase) + phase * 3)
        const open = .58 + Math.abs(flap) * .42
        ctx.globalAlpha = glow

        for (const side of [-1, 1]) {
          ctx.save()
          ctx.scale(side * open, 1)
          const grad = ctx.createLinearGradient(0, -42, 76, 46)
          grad.addColorStop(0, '#f7fdff')
          grad.addColorStop(.48, '#b2e4ff')
          grad.addColorStop(1, '#769cff')
          ctx.fillStyle = grad
          ctx.strokeStyle = '#e7f6ffcc'
          ctx.lineWidth = 1.5
          ctx.shadowColor = '#9edbff'
          ctx.shadowBlur = 12
          ctx.beginPath()
          ctx.moveTo(0, -3)
          ctx.bezierCurveTo(12, -32, 45, -53, 73, -37)
          ctx.bezierCurveTo(78, -17, 59, 3, 20, 10)
          ctx.bezierCurveTo(51, 15, 55, 38, 35, 48)
          ctx.bezierCurveTo(14, 46, 4, 22, 0, 5)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          ctx.save()
          ctx.clip()
          ctx.globalAlpha = glow * .62
          ctx.fillStyle = '#f8fdff'
          ctx.shadowBlur = 0
          ctx.font = '7px ui-monospace,monospace'
          for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 7; col++) {
              const px = 7 + col * 9 + (row % 2) * 3
              const py = -32 + row * 10
              const glyph = GLYPHS[(row * 9 + col * 5 + Math.floor(t * 3) + Math.floor(phase * 7)) % GLYPHS.length]
              ctx.fillText(glyph, px, py)
            }
          }
          ctx.restore()
          ctx.restore()
        }

        ctx.globalAlpha = glow
        ctx.strokeStyle = '#f7fbff'
        ctx.lineWidth = 3
        ctx.shadowColor = '#d7ecff'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.moveTo(0, -18); ctx.quadraticCurveTo(2, 0, 0, 20); ctx.stroke()
        ctx.lineWidth = 1.3
        ctx.beginPath()
        ctx.moveTo(-1, -13); ctx.quadraticCurveTo(-16, -31, -21, -23)
        ctx.moveTo(1, -13); ctx.quadraticCurveTo(16, -31, 21, -23)
        ctx.stroke()
        ctx.restore()
      }

      // One close butterfly gives the scene a clear focal point; the flock circles around it.
      butterfly(cx + width * .22, cy - height * .04, Math.max(.54, s * 1.06), .4, Math.sin(t * .7) * .12, .96)
      for (let i = 0; i < COUNT; i++) {
        const phase = rand(i + 11) * TAU
        const orbit = t * (.13 + rand(i + 50) * .16) + phase
        const radiusX = width * (.12 + rand(i + 5) * .45)
        const radiusY = height * (.12 + rand(i + 18) * .35)
        const x = cx + Math.cos(orbit) * radiusX + Math.sin(t * .52 + phase) * width * .06
        const y = cy + Math.sin(orbit * (.75 + rand(i + 30) * .4)) * radiusY
        const scale = Math.max(.12, s * (.24 + rand(i + 70) * .32))
        const alpha = .5 + .42 * (.5 + .5 * Math.sin(t * 1.8 + phase))
        butterfly(x, y, scale, phase, Math.sin(orbit) * .28, alpha)
      }

      // Fine drifting motes trail the wings without filling the card with clutter.
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 34; i++) {
        const phase = (t * (.08 + rand(i + 100) * .1) + rand(i + 140)) % 1
        const x = ((rand(i + 180) * width + Math.sin(t * .6 + i) * 18) % width + width) % width
        const y = height * (1 - phase)
        ctx.globalAlpha = (1 - phase) * (.18 + rand(i + 220) * .35)
        ctx.fillStyle = i % 3 ? '#c3e9ff' : '#e8d7ff'
        ctx.shadowColor = ctx.fillStyle
        ctx.shadowBlur = 8
        ctx.fillText(i % 5 === 0 ? '✦' : '.', x, y)
      }
      ctx.restore()
      if (visible && !document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) raf = requestAnimationFrame(draw)
    }

    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting)
      if (visible && !document.hidden && !raf) raf = requestAnimationFrame(draw)
      if (!visible && raf) { cancelAnimationFrame(raf); raf = 0 }
    }, { threshold: .05 })
    intersection.observe(canvas)
    const onVisibility = () => {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0 }
      else if (visible && !raf) raf = requestAnimationFrame(draw)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      intersection.disconnect()
      sizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} className="private-butterfly-canvas" role="img" aria-label={label}/>
}
