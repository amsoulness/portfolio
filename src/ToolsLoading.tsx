import { DoomsdayOnly, NormalOnly } from './DoomsdaySeason'
import './ToolsLoading.css'

export default function ToolsLoading({ message = 'Opening the Tool Lab' }: { message?: string }) {
  return (
    <div className="tools-loading-inline" role="status" aria-live="polite" aria-label={message}>
      <div className="tools-loading-mark" aria-hidden="true"><NormalOnly><span>A</span></NormalOnly><DoomsdayOnly><span>&#9672;</span></DoomsdayOnly></div>
      <DoomsdayOnly><span className="doom-loading-caption">DOOMSDAY / ENTERING THE NEXT CHAPTER</span></DoomsdayOnly><p>{message}<span className="tools-loading-dots">...</span></p>
    </div>
  )
}
