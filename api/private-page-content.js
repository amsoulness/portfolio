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
  let details
  try {
    content = JSON.parse(process.env.PRIVATE_PAGE_CONTENT || '')
    details = JSON.parse(process.env.PRIVATE_PAGE_DETAILS || '')
  } catch {
    return res.status(503).json({ error: 'The keepsake is unavailable right now.' })
  }
  if (!content || typeof content !== 'object' || !['firstDate', 'callDate', 'videoDate', 'secondDate', 'thirdDate', 'openingMemory', 'callMemory', 'videoMemory', 'firstMemory', 'secondMemory', 'note', 'ending'].every(key => typeof content[key] === 'string')) {
    return res.status(503).json({ error: 'The keepsake is unavailable right now.' })
  }
  const profileKeys = ['name', 'caption', 'alt', 'eyebrow', 'intro']
  const validProfile = profile => profile && typeof profile === 'object'
    && profileKeys.every(key => typeof profile[key] === 'string')
    && Array.isArray(profile.hobbies) && profile.hobbies.length <= 12
    && profile.hobbies.every(hobby => typeof hobby === 'string')
  const validMoments = Array.isArray(details?.moments) && details.moments.length === 3
    && details.moments.every(moment => moment && ['eyebrow', 'title', 'body'].every(key => typeof moment[key] === 'string'))
  if (!validProfile(details?.her) || !validProfile(details?.me) || !validMoments) {
    return res.status(503).json({ error: 'The keepsake is unavailable right now.' })
  }
  return res.status(200).json({ content, details })
}
