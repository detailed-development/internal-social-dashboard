import { useTheme } from '../../ThemeContext'

export default function ContentPillarsHeader({
  count,
  isOpen,
  selectedPillar,
  onToggle,
}) {
  const { theme } = useTheme()

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors hover:opacity-80"
    >
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${theme.heading}`}>Content Pillars</span>

        {count > 0 && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${theme.code} ${theme.muted}`}>
            {count}
          </span>
        )}

        {selectedPillar && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
            style={{ backgroundColor: selectedPillar.color || '#6366f1' }}
          >
            Filtering: {selectedPillar.name}
          </span>
        )}
      </div>

      <svg
        className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'} ${theme.muted}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  )
}
