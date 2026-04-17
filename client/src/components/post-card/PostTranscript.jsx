import { useTheme } from '../../ThemeContext'

export default function PostTranscript({ isOpen, onToggle, text }) {
  const { theme } = useTheme()

  if (!text) {
    return null
  }

  return (
    <div className={`pt-2 border-t ${theme.cardDivider}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${theme.transcriptToggle}`}
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        Transcript
        <svg
          className={`w-3 h-3 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <p className={`mt-2 text-xs leading-relaxed rounded-lg p-3 ${theme.transcriptPanel}`}>
          {text}
        </p>
      )}
    </div>
  )
}
