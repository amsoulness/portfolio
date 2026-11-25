import { createHmac, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'aslns_private_session'
const SESSION_MS = 30 * 60 * 1000

function signature(expiresAt, secret) {
  return createHmac('sha256', secret).update(String(expiresAt)).digest('hex')
}

export function issuePrivateSession(res, secret) {
  const expiresAt = Date.now() + SESSION_MS
  const value = `${expiresAt}.${signature(expiresAt, secret)}`
  const secure = process.env.VERCEL ? '; Secure' : ''
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Strict; Path=/api/; Max-Age=${SESSION_MS / 1000}${secure}`)
}

export function hasPrivateSession(req, secret) {
  const cookies = typeof req.headers.cookie === 'string' ? req.headers.cookie.split(';') : []
  const entry = cookies.map(value => value.trim()).find(value => value.startsWith(`${COOKIE_NAME}=`))
  if (!entry) return false
  const token = entry.slice(COOKIE_NAME.length + 1)
  const [expiry, suppliedSignature] = token.split('.')
  const expiresAt = Number(expiry)
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || !suppliedSignature) return false
  const expected = Buffer.from(signature(expiresAt, secret), 'hex')
  const supplied = Buffer.from(suppliedSignature, 'hex')
  return expected.length === supplied.length && timingSafeEqual(expected, supplied)
}
