import { useTheme } from '../../ThemeContext'
import { PILLAR_COLORS } from '../../hooks/useContentPillars'

export default function CreatePillarForm({
  newName,
  newColor,
  creating,
  onNameChange,
  onColorChange,
  onSubmit,
}) {
  const { theme } = useTheme()

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 flex-wrap">
      <input
        value={newName}
        onChange={(event) => onNameChange(event.target.value)}
        placeholder="New pillar name…"
        className={`text-sm rounded-lg border px-3 py-1.5 focus:outline-none flex-1 min-w-[160px] ${theme.input}`}
      />

      <div className="flex gap-1">
        {PILLAR_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onColorChange(color)}
            className={`w-5 h-5 rounded-full transition-transform ${newColor === color ? 'scale-125 ring-2 ring-offset-1 ring-current' : ''}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <button
        type="submit"
        disabled={creating || !newName.trim()}
        className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${theme.btnPrimary}`}
      >
        {creating ? '…' : 'Add'}
      </button>
    </form>
  )
}
