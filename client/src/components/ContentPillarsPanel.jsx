import { useTheme } from '../ThemeContext'
import { useContentPillars } from '../hooks/useContentPillars'
import ContentPillarsHeader from './content-pillars/ContentPillarsHeader'
import PillarsList from './content-pillars/PillarsList'
import CreatePillarForm from './content-pillars/CreatePillarForm'
import PillarPostAssignments from './content-pillars/PillarPostAssignments'
import PillarAnalyticsPanel from './content-pillars/PillarAnalyticsPanel'

export default function ContentPillarsPanel({
  clientId,
  posts = [],
  onFilterChange,
  onPillarsChange,
  onPostPillarChange,
}) {
  const { theme } = useTheme()
  const pillarsState = useContentPillars({
    clientId,
    onFilterChange,
    onPillarsChange,
    onPostPillarChange,
  })

  const {
    pillars,
    loading,
    open,
    newName,
    newColor,
    creating,
    editingId,
    editName,
    selectedPillarId,
    assigningPostId,
    activePillar,
    actions,
  } = pillarsState

  if (loading) return null

  return (
    <>
      {pillars.length > 0 && (
        <div className="col-span-full mb-4">
          <PillarAnalyticsPanel pillars={pillars} posts={posts} />
        </div>
      )}

      <div className={`border rounded-xl overflow-hidden ${theme.card}`}>
        <ContentPillarsHeader
          count={pillars.length}
          isOpen={open}
          selectedPillar={activePillar}
          onToggle={actions.toggleOpen}
        />

        {open && (
          <div className={`border-t px-5 py-4 space-y-4 ${theme.cardDivider}`}>
            <p className={`text-xs ${theme.muted}`}>
              Content Pillars are saved to the database for this client, so they are shared across users and are not removed when a browser clears localStorage.
            </p>

            <PillarsList
              pillars={pillars}
              editingId={editingId}
              editName={editName}
              selectedPillarId={selectedPillarId}
              actions={actions}
            />

            <CreatePillarForm
              newName={newName}
              newColor={newColor}
              creating={creating}
              onNameChange={actions.setNewName}
              onColorChange={actions.setNewColor}
              onSubmit={actions.createPillar}
            />

            <PillarPostAssignments
              posts={posts}
              selectedPillarId={selectedPillarId}
              activePillarName={activePillar?.name}
              assigningPostId={assigningPostId}
              onToggleAssignment={actions.togglePostAssignment}
            />
          </div>
        )}
      </div>
    </>
  )
}
