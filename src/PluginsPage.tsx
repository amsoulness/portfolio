import { useEffect } from 'react'
import PluginCatalog from './PluginCatalog'
import ThemeToggle, { type SiteTheme, type ThemePreference } from './ThemeToggle'
import useSessionMotion from './useSessionMotion'
import './SessionPage.css'
import './DeploymentHub.css'
import './PluginsPage.css'

type Props = { theme: SiteTheme; themePreference: ThemePreference; onToggleTheme: () => void }
export default function PluginsPage({ theme, themePreference, onToggleTheme }: Props) {
  useSessionMotion()
  useEffect(() => { const oldTitle = document.title; document.title = 'Plugins · Amsoulness / ASLNS'; return () => { document.title = oldTitle } }, [])
  return <div className="as-session as-plugins-page" data-theme={theme}><div className="as-session-glow" aria-hidden="true"/><header className="as-session-nav"><a className="as-session-brand" href="/session"><span className="as-session-monogram">A<span>·</span></span><span>AMSOULNESS<small>ASLNS / PLUGINS</small></span></a><nav aria-label="Plugin navigation"><a href="/">Portfolio</a><a href="/session">Session</a><a href="/session#deploy">Deploy</a><ThemeToggle theme={theme} preference={themePreference} onToggle={onToggleTheme}/></nav></header><main className="as-session-main"><h1 className="as-plugins-page-title">Extend your bot.</h1><PluginCatalog/></main><footer className="as-session-footer"><span>AMSOULNESS / ASLNS</span><a href="/session">Back to session & deployment</a></footer></div>
}
