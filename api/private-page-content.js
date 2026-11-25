import { hasPrivateSession } from './_private-session.js'

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed.' })
  }
  const sessionSecret = process.env.PRIVATE_PAGE_SESSION_SECRET
  if (!sessionSecret || !hasPrivateSession(req, sessionSecret)) return res.status(401).json({ error: 'Enter the password to open this keepsake.' })
  let content
  try {
    content = JSON.parse(process.env.PRIVATE_PAGE_CONTENT || '')
  } catch {
    return res.status(503).json({ error: 'The keepsake is unavailable right now.' })
  }
  if (!content || typeof content !== 'object' || !['firstDate', 'secondDate', 'thirdDate', 'firstMemory', 'secondMemory', 'note', 'ending'].every(key => typeof content[key] === 'string')) {
    return res.status(503).json({ error: 'The keepsake is unavailable right now.' })
  }
  return res.status(200).json({ content })
}
