import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import './PageViewCounter.css'

export type TrackedPage = 'portfolio' | 'tools' | 'whatsapp' | 'image' | 'qr' | 'color' | 'password'

const API_ORIGIN = (import.meta.env.VITE_WHATSAPP_API_URL || '').replace(/\/$/, '')

export default function PageViewCounter({ page }: { page: TrackedPage }) {
  const [views, setViews] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    const storageKey = `aslns:page-viewed:${page}`

    const refresh = async (countVisit = false) => {
      const alreadyCounted = window.sessionStorage.getItem(storageKey) === '1'
      const shouldCount = countVisit && !alreadyCounted
      if (shouldCount) window.sessionStorage.setItem(storageKey, '1')
      try {
        const response = await fetch(`${API_ORIGIN}/api/analytics/views${shouldCount ? '' : `?page=${encodeURIComponent(page)}`}`, shouldCount ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page }),
          keepalive: true,
        } : undefined)
        if (!response.ok) {
          if (shouldCount) window.sessionStorage.removeItem(storageKey)
          return
        }
        const result: { page: TrackedPage; views: number } = await response.json()
        if (mounted && result.page === page && Number.isSafeInteger(result.views)) setViews(result.views)
      } catch {
        if (shouldCount) window.sessionStorage.removeItem(storageKey)
      }
    }

    void refresh(true)
    const timer = window.setInterval(() => void refresh(false), 60_000)
    return () => { mounted = false; window.clearInterval(timer) }
  }, [page])

  return <span className="aslns-view-counter" title="Aggregate page visits. No visitor identity is collected." aria-label={`${views === null ? 'Visit count unavailable' : `${views.toLocaleString()} page visits`}; no visitor identity is collected`}>
    <Eye size={14} strokeWidth={1.8} aria-hidden="true" />
    <span>{views === null ? 'VISITS · —' : `${views.toLocaleString()} PAGE VISITS`}</span>
  </span>
}
