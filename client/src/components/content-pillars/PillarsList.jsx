import { useTheme } from '../../ThemeContext'
import PillarChip from './PillarChip'

export default function PillarsList({
  pillars,
  editingId,
  editName,
  selectedPillarId,
  actions,
}) {
  const { theme } = useTheme()

  if (pillars.length === 0) {
    return <p className={`text-xs ${theme.muted}`}>No content pillars yet. Create one below.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {pillars.map((pillar) => (
        <div key={pillar.id} className="flex items-center gap-1">
          <PillarChip
            pillar={pillar}
            isSelected={selectedPillarId === pillar.id}
            isEditing={editingId === pillar.id}
            editName={editName}
            onEditNameChange={actions.setEditName}
            onSelect={actions.selectPillar}
            onStartEditing={actions.startEditing}
            onCancelEditing={actions.cancelEditing}
            onRename={actions.renamePillar}
            onDelete={actions.removePillar}
          />
        </div>
      ))}
    </div>
  )
}
