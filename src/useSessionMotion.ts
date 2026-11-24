import { useEffect } from 'react'
import './SessionMotion.css'

export default function useSessionMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.as-session')
    if (!root || !('IntersectionObserver' in window)) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const seen = new WeakSet<Element>()
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.setAttribute('data-revealed', 'true')
        observer.unobserve(entry.target)
      }
    }, { threshold: 0.06 })
    const discover = () => {
      root.querySelectorAll<HTMLElement>('.as-session-heading,.as-pair-panel,.as-deploy-panel,.as-plugin-heading,.as-plugin-toolbar,.as-plugin-card,.as-session-faq,.as-render-heading,.as-render-stages,.as-render-card').forEach((element, index) => {
        if (seen.has(element)) return
        seen.add(element)
        if (preference.matches) return
        element.style.setProperty('--reveal-delay', `${Math.min(index % 3, 2) * 65}ms`)
        element.setAttribute('data-motion-reveal', 'true')
        observer.observe(element)
      })
    }
    discover()
    const changes = new MutationObserver(discover)
    changes.observe(root, { childList: true, subtree: true })
    const onPreference = () => {
      if (preference.matches) root.querySelectorAll('[data-motion-reveal]').forEach(el => el.setAttribute('data-revealed', 'true'))
    }
    preference.addEventListener('change', onPreference)
    return () => { observer.disconnect(); changes.disconnect(); preference.removeEventListener('change', onPreference); root.querySelectorAll('[data-motion-reveal]').forEach(el => { el.removeAttribute('data-motion-reveal'); el.removeAttribute('data-revealed') }) }
  }, [])
}
