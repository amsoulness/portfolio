import './ToolsLoading.css'

export default function ToolsLoading({ message = 'Opening the Tool Lab' }: { message?: string }) {
  return (
    <div className="tools-loading-inline" role="status" aria-live="polite" aria-label={message}>
      <div className="tools-loading-mark" aria-hidden="true"><span>A</span></div>
      <p>{message}<span className="tools-loading-dots">...</span></p>
    </div>
  )
}
