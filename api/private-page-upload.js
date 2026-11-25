import { timingSafeEqual } from 'node:crypto'
import { put } from '@vercel/blob'

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }
  const expected = process.env.PRIVATE_PAGE_UPLOAD_KEY
  const supplied = req.headers['x-upload-key']
  if (!expected || typeof supplied !== 'string') return res.status(401).json({ error: 'Unauthorized.' })
  const expectedBytes = Buffer.from(expected)
  const suppliedBytes = Buffer.from(supplied)
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) return res.status(401).json({ error: 'Unauthorized.' })
  const encoded = req.body?.data
  if (typeof encoded !== 'string' || encoded.length > 1_700_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return res.status(400).json({ error: 'Invalid audio upload.' })
  const audio = Buffer.from(encoded, 'base64')
  if (audio.length < 8_000 || audio.length > 1_300_000) return res.status(400).json({ error: 'Invalid audio size.' })
  try {
    await put('our-space/song.mpeg', audio, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'audio/mpeg',
    })
    return res.status(200).json({ uploaded: true })
  } catch {
    return res.status(500).json({ error: 'Could not store the private soundtrack.' })
  }
}
