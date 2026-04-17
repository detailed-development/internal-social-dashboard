import { useTheme } from '../../ThemeContext'

export default function PillarChip({
  pillar,
  isSelected,
  isEditing,
  editName,
  onEditNameChange,
  onSelect,
  onStartEditing,
  onCancelEditing,
  onRename,
  onDelete,
}) {
  const { theme } = useTheme()

  if (isEditing) {
    return (
      <form onSubmit={(event) => {
        event.preventDefault()
        onRename(pillar.id)
      }} className="flex items-center gap-1">
        <input
          autoFocus
          value={editName}
          onChange={(event) => onEditNameChange(event.target.value)}
          className={`text-xs rounded-lg border px-2 py-1 focus:outline-none w-28 ${theme.input}`}
        />
        <button type="submit" className={`text-xs px-2 py-1 rounded-lg ${theme.btnPrimary}`}>
          Save
        </button>
        <button
          type="button"
          onClick={onCancelEditing}
          className={`text-xs px-2 py-1 rounded-lg border ${theme.btnCancel}`}
        >
          ✕
        </button>
      </form>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(pillar.id)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
          isSelected
            ? 'text-white border-transparent shadow-sm'
            : `${theme.code} ${theme.body} border-transparent`
        }`}
        style={isSelected ? { backgroundColor: pillar.color || '#6366f1' } : undefined}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: pillar.color || '#6366f1' }}
        />
        {pillar.name}
        <span className={`${isSelected ? 'text-white/70' : theme.muted} text-[10px]`}>
          {pillar._count?.posts ?? 0}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onStartEditing(pillar)}
        className={`text-[10px] px-1.5 py-0.5 rounded ${theme.navItemInactive}`}
        title="Rename"
      >
        ✎
      </button>

      <button
        type="button"
        onClick={() => onDelete(pillar.id)}
        className="text-[10px] px-1.5 py-0.5 rounded text-red-400 hover:text-red-600"
        title="Delete pillar"
      >
        ✕
      </button>
    </>
  )
}
