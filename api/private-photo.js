import { Readable } from 'node:stream'
import { get } from '@vercel/blob'
import { hasPrivateSession } from './_private-session.js'

const photos = {
  her: 'our-space/her.jpg',
  me: 'our-space/me.jpg',
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }
  const sessionSecret = process.env.PRIVATE_PAGE_SESSION_SECRET
  if (!sessionSecret || !hasPrivateSession(req, sessionSecret)) return res.status(401).end()
  const pathname = photos[req.query?.photo]
  if (!pathname) return res.status(404).end()

  try {
    const result = await get(pathname, { access: 'private' })
    if (!result || result.statusCode !== 200 || !result.stream) return res.status(404).end()
    res.setHeader('Content-Type', result.blob.contentType || 'image/jpeg')
    res.setHeader('Content-Length', String(result.blob.contentLength))
    res.status(200)
    return Readable.fromWeb(result.stream).pipe(res)
  } catch {
    return res.status(503).end()
  }
}
