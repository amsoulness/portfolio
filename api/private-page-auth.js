import { timingSafeEqual } from 'node:crypto'
import { issuePrivateSession } from './_private-session.js'

const attempts = new Map()
const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 8

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const requestOrigin = req.headers.origin
  const requestHost = req.headers.host
  if (!requestOrigin || !requestHost || new URL(requestOrigin).host !== requestHost) {
    return res.status(403).json({ error: 'Open this page directly to continue.' })
  }
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    return res.status(415).json({ error: 'Unsupported request.' })
  }

  const expected = process.env.PRIVATE_PAGE_PASSWORD
  if (!expected) return res.status(503).json({ error: 'The private-page lock is not configured yet.' })

  const forwarded = req.headers['x-forwarded-for']
  const clientKey = (typeof forwarded === 'string' ? forwarded.split(',')[0] : 'unknown').trim()
  const now = Date.now()
  const record = attempts.get(clientKey)
  if (record && record.expiresAt > now && record.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many tries. Please wait a few minutes and try again.' })
  }
  if (!record || record.expiresAt <= now) attempts.set(clientKey, { count: 0, expiresAt: now + WINDOW_MS })

  const supplied = typeof req.body?.password === 'string' && req.body.password.length <= 128
    ? Buffer.from(req.body.password, 'utf8')
    : Buffer.alloc(0)
  const expectedBytes = Buffer.from(expected, 'utf8')
  const matches = supplied.length === expectedBytes.length && timingSafeEqual(supplied, expectedBytes)
  if (!matches) {
    const current = attempts.get(clientKey)
    attempts.set(clientKey, { count: (current?.count ?? 0) + 1, expiresAt: current?.expiresAt ?? now + WINDOW_MS })
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((attempts.get(clientKey)?.expiresAt - now) / 1000))))
    return res.status(401).json({ error: 'That password didn’t open this little space. Try again.' })
  }

  attempts.delete(clientKey)
  issuePrivateSession(res, expected)
  return res.status(200).json({ authenticated: true })
}
