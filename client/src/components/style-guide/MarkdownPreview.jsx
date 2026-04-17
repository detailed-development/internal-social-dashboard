import { useTheme } from '../../ThemeContext'

export default function MarkdownPreview({ markdown }) {
  const { theme } = useTheme()

  if (!markdown) {
    return <p className={`text-sm italic ${theme.muted}`}>Fill in the form to see the preview.</p>
  }

  return (
    <pre className={`text-xs leading-relaxed whitespace-pre-wrap font-mono ${theme.body}`}>
      {markdown}
    </pre>
  )
}
