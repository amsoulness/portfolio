import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { hasPrivateSession } from './_private-session.js'

const artworks = {
  ring: 'diamond_ring.gif',
  rose: 'rose.gif',
  cat: 'cat_knight.gif',
  heart: 'i_love_you.gif',
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }
  const secret = process.env.PRIVATE_PAGE_SESSION_SECRET
  if (!secret || !hasPrivateSession(req, secret)) return res.status(401).end()
  const filename = artworks[req.query?.art]
  if (!filename) return res.status(404).end()
  try {
    const data = await readFile(join(process.cwd(), 'api', 'private-art-assets', filename))
    res.setHeader('Content-Type', 'image/gif')
    res.setHeader('Content-Length', String(data.length))
    return res.status(200).end(data)
  } catch {
    return res.status(503).end()
  }
}
