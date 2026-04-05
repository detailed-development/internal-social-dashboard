import { useTheme } from '../../ThemeContext'

export default function AILoadingState({ loading, error, onRetry, children }) {
  const { theme } = useTheme()

  if (loading) {
    return (
      <div className={`rounded-xl p-6 ${theme.card}`}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span className={`text-sm ${theme.muted}`}>Generating with AI...</span>
        </div>
        <div className="mt-4 space-y-3">
          <div className={`h-4 rounded w-3/4 animate-pulse ${theme.id === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}`} />
          <div className={`h-4 rounded w-1/2 animate-pulse ${theme.id === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}`} />
          <div className={`h-4 rounded w-5/6 animate-pulse ${theme.id === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}`} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700 mb-2">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-sm text-red-600 font-medium hover:text-red-800">
            Try Again
          </button>
        )}
      </div>
    )
  }

  return children
}
