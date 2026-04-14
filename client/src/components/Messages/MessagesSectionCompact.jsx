import { useState, useEffect } from 'react'
import { useTheme } from '../../ThemeContext'
import PlatformBadge from '../PlatformBadge'
import { hideConversation } from '../../api'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function CompactConversationRow({ convo, onHideToggle }) {
  const { theme } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const [hiding, setHiding] = useState(false)

  const sortedMessages = [...(convo.messages || [])].sort(
    (a, b) => new Date(a.sentAt) - new Date(b.sentAt)
  )
  const preview = sortedMessages[sortedMessages.length - 1]

  async function handleHide(e) {
    e.stopPropagation()
    setHiding(true)
    try {
      await hideConversation(convo.id, !convo.isHidden)
      onHideToggle(convo.id, !convo.isHidden)
    } finally {
      setHiding(false)
    }
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${theme.card} ${convo.isHidden ? 'opacity-50' : ''}`}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-opacity-50`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold ${theme.accentIconBg} ${theme.accentIconText}`}>
          {(convo.participantName || '?').charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-sm font-semibold truncate ${theme.heading}`}>
              {convo.participantName || 'Unknown sender'}
            </span>
            <PlatformBadge platform={convo.platform} />
            <span className={`text-[11px] truncate ${theme.muted}`}>@{convo.accountHandle}</span>
          </div>

          <p className={`text-sm truncate mt-0.5 ${theme.body}`}>
            {preview?.isFromPage && <span className={`mr-1 ${theme.muted}`}>You:</span>}
            {preview?.body || 'No messages yet'}
          </p>
        </div>

        <div className={`flex flex-col items-end text-[11px] flex-shrink-0 ${theme.muted}`}>
          <span>{timeAgo(convo.lastMessageAt)}</span>
          <span>{convo.messageCount} msgs</span>
        </div>
      </button>

      {expanded && (
        <div className={`border-t px-4 py-3 ${theme.cardDivider}`}>
          <div className="flex justify-between items-center mb-3">
            <div className={`text-xs ${theme.muted}`}>
              {convo.isHidden ? 'Hidden conversation' : 'Conversation thread'}
            </div>
            <button
              type="button"
              onClick={handleHide}
              disabled={hiding}
              className={`text-xs px-2.5 py-1 rounded-md border ${theme.code} ${theme.muted}`}
            >
              {hiding ? '…' : convo.isHidden ? 'Unhide' : 'Hide as spam'}
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {sortedMessages.length === 0 ? (
              <p className={`text-sm ${theme.muted}`}>No messages loaded yet.</p>
            ) : (
              sortedMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isFromPage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[78%] rounded-lg px-3 py-2 text-sm ${
                      msg.isFromPage
                        ? `${theme.btnPrimary} rounded-br-sm`
                        : `${theme.code} ${theme.body} rounded-bl-sm`
                    }`}
                  >
                    {!msg.isFromPage && (
                      <p className={`text-[11px] font-semibold mb-0.5 ${theme.muted}`}>
                        {msg.fromName || 'Unknown'}
                      </p>
                    )}
                    <p className="leading-relaxed">{msg.body}</p>
                    <p className="text-[11px] mt-1 opacity-70">{timeAgo(msg.sentAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MessagesSectionCompact({ conversations: initialConversations, loading }) {
  const { theme } = useTheme()
  const [conversations, setConversations] = useState(initialConversations ?? [])
  const [showHidden, setShowHidden] = useState(false)

  useEffect(() => {
    if (initialConversations) setConversations(initialConversations)
  }, [initialConversations])

  function handleHideToggle(id, isHidden) {
    setConversations(prev => prev.map(c => (
      c.id === id ? { ...c, isHidden } : c
    )))
  }

  const hiddenCount = conversations.filter(c => c.isHidden).length
  const visible = showHidden ? conversations : conversations.filter(c => !c.isHidden)

  if (loading) {
    return <div className={`text-sm py-10 text-center ${theme.muted}`}>Loading messages…</div>
  }

  if (!conversations.length) {
    return (
      <div className={`rounded-xl border p-10 text-center text-sm ${theme.emptyStateBg}`}>
        No messages synced yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className={`text-xs ${theme.muted}`}>
          {visible.length} conversations
          {!showHidden && hiddenCount > 0 ? ` · ${hiddenCount} hidden` : ''}
        </p>

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowHidden(v => !v)}
            className={`text-xs px-2.5 py-1 rounded-lg border ${theme.code} ${theme.muted}`}
          >
            {showHidden ? 'Hide spam' : `Show ${hiddenCount} hidden`}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {visible.map(convo => (
          <CompactConversationRow
            key={convo.id}
            convo={convo}
            onHideToggle={handleHideToggle}
          />
        ))}
      </div>
    </div>
  )
}