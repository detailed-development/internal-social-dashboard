import { useState, useEffect } from 'react'
import { useTheme } from '../../ThemeContext'
import PlatformBadge from '../PlatformBadge'
import { hideConversation } from '../../api/index'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)   return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function ConversationRow({ convo, onHideToggle }) {
  const { theme } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const [hiding, setHiding] = useState(false)

  const sortedMessages = [...convo.messages].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
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
    <div className={`border rounded-xl overflow-hidden ${theme.card} ${convo.isHidden ? 'opacity-50' : ''}`}>
      {/* Conversation header / preview row */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className={`w-full text-left px-5 py-4 flex items-start gap-4 transition-colors hover:bg-opacity-50 ${expanded ? theme.cardDivider : ''}`}
      >
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm ${theme.accentIconBg} ${theme.accentIconText}`}>
          {(convo.participantName || '?').charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm ${theme.heading}`}>
              {convo.participantName || 'Unknown sender'}
            </span>
            <PlatformBadge platform={convo.platform} />
            <span className={`text-xs ${theme.muted}`}>@{convo.accountHandle}</span>
            {convo.isHidden && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${theme.code} ${theme.muted}`}>hidden</span>
            )}
          </div>

          {preview && (
            <p className={`text-sm truncate mt-0.5 ${theme.body}`}>
              {preview.isFromPage && <span className={`font-medium mr-1 ${theme.muted}`}>You:</span>}
              {preview.body}
            </p>
          )}
        </div>

        <div className={`flex flex-col items-end gap-1 flex-shrink-0 text-xs ${theme.muted}`}>
          <span>{timeAgo(convo.lastMessageAt)}</span>
          <span>{convo.messageCount} msg{convo.messageCount !== 1 ? 's' : ''}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded message thread */}
      {expanded && (
        <div className={`px-5 py-4 space-y-3 border-t ${theme.cardDivider}`}>
          {/* Hide / unhide action */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleHide}
              disabled={hiding}
              className={`text-xs px-3 py-1 rounded-lg border transition-colors ${theme.code} ${theme.muted} hover:opacity-75`}
            >
              {hiding ? '…' : convo.isHidden ? 'Unhide conversation' : 'Hide as spam'}
            </button>
          </div>

          {sortedMessages.length === 0 ? (
            <p className={`text-sm ${theme.muted}`}>No messages loaded yet.</p>
          ) : (
            sortedMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.isFromPage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                    msg.isFromPage
                      ? `${theme.btnPrimary} rounded-br-sm`
                      : `${theme.code} ${theme.body} rounded-bl-sm`
                  }`}
                >
                  {!msg.isFromPage && (
                    <p className={`text-xs font-semibold mb-0.5 ${theme.muted}`}>
                      {msg.fromName || 'Unknown'}
                    </p>
                  )}
                  <p className="leading-relaxed">{msg.body}</p>
                  <p className={`text-xs mt-1 opacity-70`}>
                    {timeAgo(msg.sentAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function MessagesSection({ conversations: initialConversations, loading, onReload }) {
  const { theme } = useTheme()
  const [conversations, setConversations] = useState(initialConversations ?? [])
  const [showHidden, setShowHidden] = useState(false)

  // Keep local state in sync when parent provides fresh data
  useEffect(() => {
    if (initialConversations) setConversations(initialConversations)
  }, [initialConversations])

  function handleHideToggle(id, isHidden) {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, isHidden } : c))
  }

  const hiddenCount = conversations.filter(c => c.isHidden).length
  const visible = showHidden ? conversations : conversations.filter(c => !c.isHidden)

  if (loading) {
    return <div className={`text-sm py-10 text-center ${theme.muted}`}>Loading messages…</div>
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className={`rounded-xl border p-10 text-center text-sm ${theme.emptyStateBg}`}>
        <p className="font-medium mb-1">No messages synced yet</p>
        <p className={`text-xs ${theme.muted}`}>
          Messages sync automatically with your Instagram and Facebook accounts.<br />
          Make sure your token has <code className={`px-1 rounded ${theme.code}`}>pages_messaging</code> and{' '}
          <code className={`px-1 rounded ${theme.code}`}>instagram_manage_messages</code> permissions.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className={`text-xs ${theme.muted}`}>
          {visible.length} conversation{visible.length !== 1 ? 's' : ''}
          {!showHidden && hiddenCount > 0 && ` · ${hiddenCount} hidden`}
          {visible.length > 0 && ' — click a row to expand'}
        </p>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowHidden(v => !v)}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${theme.code} ${theme.muted} hover:opacity-75`}
          >
            {showHidden ? 'Hide spam' : `Show ${hiddenCount} hidden`}
          </button>
        )}
      </div>
      {visible.map(c => (
        <ConversationRow key={c.id} convo={c} onHideToggle={handleHideToggle} />
      ))}
    </div>
  )
}
