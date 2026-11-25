export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }
  const requestOrigin = req.headers.origin
  const requestHost = req.headers.host
  if (!requestOrigin || !requestHost || new URL(requestOrigin).host !== requestHost) return res.status(403).end()
  const secure = process.env.VERCEL ? '; Secure' : ''
  res.setHeader('Set-Cookie', `aslns_private_session=; HttpOnly; SameSite=Strict; Path=/api/; Max-Age=0${secure}`)
  return res.status(204).end()
}
