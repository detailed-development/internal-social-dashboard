import { useTheme } from '../../ThemeContext'
import MarkdownPreview from './MarkdownPreview'

export default function PromptMarkdownPanel({
  promptMarkdown,
  manualOverride,
  onManualOverrideChange,
  onManualMarkdownChange,
  onCopy,
  onDownload,
}) {
  const { theme } = useTheme()
  const textareaClass = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-y ${theme.focusRing} ${theme.input} font-mono text-xs`

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className={`text-xs font-semibold uppercase tracking-wide ${theme.subtext}`}>Prompt Markdown</p>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={manualOverride}
              onChange={(event) => onManualOverrideChange(event.target.checked)}
              className="rounded"
            />
            <span className={`text-xs ${theme.muted}`}>Manual edit</span>
          </label>

          <button
            type="button"
            onClick={onCopy}
            disabled={!promptMarkdown}
            className={`text-xs font-medium ${theme.muted} hover:opacity-80 disabled:opacity-40`}
          >
            Copy
          </button>

          <button
            type="button"
            onClick={onDownload}
            disabled={!promptMarkdown}
            className={`text-xs font-medium ${theme.detailsLink} disabled:opacity-40`}
          >
            Download .md
          </button>
        </div>
      </div>

      {manualOverride ? (
        <textarea
          value={promptMarkdown}
          onChange={(event) => onManualMarkdownChange(event.target.value)}
          rows={28}
          className={textareaClass}
        />
      ) : (
        <div className={`rounded-xl border p-4 min-h-[300px] ${theme.card}`}>
          <MarkdownPreview markdown={promptMarkdown} />
        </div>
      )}
    </div>
  )
}
