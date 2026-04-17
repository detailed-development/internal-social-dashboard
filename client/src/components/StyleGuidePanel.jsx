import { useTheme } from '../ThemeContext'
import { useStyleGuideForm } from '../hooks/useStyleGuideForm'
import StyleGuideFormFields from './style-guide/StyleGuideFormFields'
import StyleGuideStatusBar from './style-guide/StyleGuideStatusBar'
import PromptMarkdownPanel from './style-guide/PromptMarkdownPanel'

export default function StyleGuidePanel({ clientSlug }) {
  const { theme } = useTheme()
  const {
    form,
    promptMarkdown,
    manualOverride,
    loading,
    saving,
    saved,
    error,
    actions,
  } = useStyleGuideForm(clientSlug)

  if (loading) {
    return <p className={`text-sm ${theme.muted} p-4`}>Loading style guide…</p>
  }

  return (
    <form onSubmit={actions.save}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <StyleGuideFormFields form={form} onFieldChange={actions.setField} />
          <StyleGuideStatusBar
            saving={saving}
            saved={saved}
            error={error}
            primaryClassName={`px-4 py-2 text-sm font-medium rounded-lg ${theme.btnPrimary}`}
          />
        </div>

        <PromptMarkdownPanel
          promptMarkdown={promptMarkdown}
          manualOverride={manualOverride}
          onManualOverrideChange={actions.handleManualOverrideChange}
          onManualMarkdownChange={actions.setManualMarkdown}
          onCopy={actions.copyMarkdown}
          onDownload={actions.downloadMarkdown}
        />
      </div>
    </form>
  )
}
