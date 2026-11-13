import './ToolsLoading.css'

export default function ToolsLoading() {
  return (
    <div className="tools-loading-inline" role="status" aria-live="polite" aria-label="Opening the ASLNS Tools Lab">
      <div className="tools-loading-mark" aria-hidden="true"><span>A</span></div>
      <p>Opening the Tool Lab<span className="tools-loading-dots">...</span></p>
    </div>
  )
}
