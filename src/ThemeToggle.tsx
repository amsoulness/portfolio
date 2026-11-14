import { Moon, Sun } from 'lucide-react'

export type SiteTheme = 'light' | 'dark'

export default function ThemeToggle({ theme, onToggle, className = '' }: {
  theme: SiteTheme
  onToggle: () => void
  className?: string
}) {
  const light = theme === 'light'
  return <button
    type="button"
    className={`site-theme-toggle ${className}`.trim()}
    onClick={onToggle}
    aria-label={`Switch to ${light ? 'dark' : 'light'} mode`}
    aria-pressed={light}
    title={`Switch to ${light ? 'dark' : 'light'} mode`}
  >
    <span className="site-theme-toggle-icon" aria-hidden="true">{light ? <Sun size={17}/> : <Moon size={17}/>}</span>
    <span className="site-theme-toggle-label">{light ? 'LIGHT' : 'DARK'}</span>
  </button>
}
