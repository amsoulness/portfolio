import { Monitor, Moon, Sun } from 'lucide-react'

export type SiteTheme = 'light' | 'dark'
export type ThemePreference = 'system' | SiteTheme

export default function ThemeToggle({ theme, preference, onToggle, className = '' }: {
  theme: SiteTheme
  preference: ThemePreference
  onToggle: () => void
  className?: string
}) {
  const label = preference === 'system' ? 'AUTO' : preference.toUpperCase()
  const icon = preference === 'system' ? <Monitor size={17}/> : theme === 'light' ? <Sun size={17}/> : <Moon size={17}/>
  const nextPreference = preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system'
  return <button
    type="button"
    className={`site-theme-toggle ${className}`.trim()}
    onClick={onToggle}
    aria-label={`Theme is ${label.toLowerCase()} (currently ${theme}). Switch to ${nextPreference} mode`}
    title={`Theme: ${label.toLowerCase()}${preference === 'system' ? `, following ${theme} system mode` : ''}. Click for ${nextPreference}`}
  >
    <span className="site-theme-toggle-icon" aria-hidden="true">{icon}</span>
    <span className="site-theme-toggle-label">{label}</span>
  </button>
}
