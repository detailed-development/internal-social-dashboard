export default function StyleGuideStatusBar({ saving, saved, error, primaryClassName }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button type="submit" disabled={saving} className={primaryClassName}>
        {saving ? 'Saving…' : 'Save Style Guide'}
      </button>
      {saved && <span className="text-sm text-green-600 font-medium">Saved</span>}
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  )
}
