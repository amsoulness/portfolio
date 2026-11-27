import { useEffect } from 'react'
import DeploymentHub from './DeploymentHub'
import ConnectionGraphic from './ConnectionGraphic'
import ThemeToggle, { type SiteTheme, type ThemePreference } from './ThemeToggle'
import useSessionMotion from './useSessionMotion'
import './SessionPage.css'
import './DeploymentHub.css'
import './PluginsPage.css'

type Props = { theme: SiteTheme; themePreference: ThemePreference; onToggleTheme: () => void }
export default function DeployPage({ theme, themePreference, onToggleTheme }: Props) {
  useSessionMotion()
  useEffect(() => { const oldTitle = document.title; document.title = 'ASLNS | WEBSITE'; return () => { document.title = oldTitle } }, [])
  return <div className="as-session as-deploy-page" data-theme={theme}><div className="as-session-glow" aria-hidden="true"/><header className="as-session-nav"><a className="as-session-brand" href="/session"><span className="as-session-monogram">A<span>·</span></span><span>AMSOULNESS<small>ASLNS / DEPLOYMENT</small></span></a><nav aria-label="Deployment navigation"><a href="/">Portfolio</a><a href="/session">Session</a><a href="/session/plugins">Plugins</a><ThemeToggle theme={theme} preference={themePreference} onToggle={onToggleTheme}/></nav></header><main className="as-session-main"><div className="as-session-heading"><span className="as-session-eyebrow">CHOOSE YOUR HOST</span><h1>Your bot.<br/><span>Anywhere.</span></h1><p>Copy your private session from the session page, then choose how to deploy.</p></div><ConnectionGraphic/><DeploymentHub session=""/></main><footer className="as-session-footer"><span>AMSOULNESS / ASLNS</span><a href="/session">Get a session</a><a href="/session/plugins">Browse plugins</a></footer></div>
}
