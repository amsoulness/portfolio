import { Readable } from 'node:stream'
import { get } from '@vercel/blob'
import { hasPrivateSession } from './_private-session.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }
  const sessionSecret = process.env.PRIVATE_PAGE_SESSION_SECRET
  if (!sessionSecret || !hasPrivateSession(req, sessionSecret)) return res.status(401).end()

  try {
    const result = await get('our-space/song.mpeg', { access: 'private' })
    if (!result || result.statusCode !== 200 || !result.stream) return res.status(404).end()
    res.setHeader('Content-Type', result.blob.contentType || 'audio/mpeg')
    res.setHeader('Content-Disposition', 'inline; filename="our-song.mpeg"')
    if (Number.isSafeInteger(result.blob.size)) res.setHeader('Content-Length', String(result.blob.size))
    res.status(200)
    return Readable.fromWeb(result.stream).pipe(res)
  } catch {
    return res.status(503).end()
  }
}
