import './ToolsLoading.css'

const orbitTools = ['✦', '◈', '⌘', '◉', '⌁', '✳']

export default function ToolsLoading() {
  return (
    <main className="tools-loading" role="status" aria-live="polite" aria-label="Opening the ASLNS Tools Lab">
      <header className="tools-loading-topbar">
        <a className="tools-loading-brand" href="/" aria-label="AMSOULNESS home">
          <span className="tools-loading-brand-mark">A<span>✦</span></span>
          <span>AMSOULNESS<small>CREATIVE SYSTEMS</small></span>
        </a>
        <span className="tools-loading-index">DIGITAL UNIVERSE <i /> 001</span>
      </header>

      <section className="tools-loading-center" aria-label="Loading Tools Hub">
        <div className="tools-loading-orbit" aria-hidden="true">
          <span className="tools-loading-ring tools-loading-ring-one" />
          <span className="tools-loading-ring tools-loading-ring-two" />
          <span className="tools-loading-core">A</span>
          {orbitTools.map((tool, index) => <span className={`tools-loading-orbit-icon orbit-icon-${index + 1}`} key={index}>{tool}</span>)}
        </div>
        <div className="tools-loading-kicker"><span /> THE TOOL LAB / INITIALIZING</div>
        <h1>Ideas are<br /><em>coming to life.</em></h1>
        <p>Opening your creative toolkit</p>
        <div className="tools-loading-progress" aria-hidden="true"><span /></div>
        <div className="tools-loading-footnote"><span>PREPARING YOUR WORKSPACE</span><span>✦ &nbsp; PLEASE WAIT</span></div>
      </section>

      <footer className="tools-loading-footer"><span>ASLNS / CREATIVE TOOLKIT</span><span>MADE FOR THE CURIOUS <b>✦</b></span></footer>
    </main>
  )
}
