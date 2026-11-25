import { Readable } from 'node:stream'
import { get } from '@vercel/blob'
import { hasPrivateSession } from './_private-session.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Accept-Ranges', 'bytes')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const sessionSecret = process.env.PRIVATE_PAGE_SESSION_SECRET
  if (!sessionSecret || !hasPrivateSession(req, sessionSecret)) return res.status(401).end()

  try {
    const result = await get('our-space/butterfly.mp4', { access: 'private' })
    if (!result || result.statusCode !== 200 || !result.stream) return res.status(404).end()

    const chunks = []
    for await (const chunk of Readable.fromWeb(result.stream)) chunks.push(chunk)
    const video = Buffer.concat(chunks)
    const range = req.headers.range

    res.setHeader('Content-Type', 'video/mp4')
    res.setHeader('Content-Disposition', 'inline; filename="butterfly.mp4"')

    if (typeof range === 'string') {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
      if (!match || (!match[1] && !match[2])) {
        res.setHeader('Content-Range', `bytes */${video.length}`)
        return res.status(416).end()
      }

      const suffixLength = Number(match[2])
      const start = match[1] ? Number(match[1]) : Math.max(0, video.length - suffixLength)
      const end = match[1] && match[2] ? Number(match[2]) : video.length - 1
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= video.length) {
        res.setHeader('Content-Range', `bytes */${video.length}`)
        return res.status(416).end()
      }

      const boundedEnd = Math.min(end, video.length - 1)
      const body = video.subarray(start, boundedEnd + 1)
      res.setHeader('Content-Range', `bytes ${start}-${boundedEnd}/${video.length}`)
      res.setHeader('Content-Length', String(body.length))
      res.status(206)
      return res.end(body)
    }

    res.setHeader('Content-Length', String(video.length))
    res.status(200)
    return res.end(video)
  } catch {
    return res.status(503).end()
  }
}
