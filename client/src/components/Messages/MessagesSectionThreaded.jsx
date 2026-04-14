import { useState, useEffect, useMemo } from 'react'
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

function ThreadListItem({ convo, active, onSelect, theme }) {
  const preview = [...(convo.messages || [])]
    .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
    .at(-1)

  return (
    <button
      type="button"
      onClick={() => onSelect(convo.id)}
      className={`w-full text-left px-3 py-3 rounded-lg border transition-colors ${
        active
          ? `${theme.btnGearActive}`
          : `${theme.id === 'dark'
              ? 'border-gray-700 bg-gray-800 hover:bg-gray-700'
              : 'border-gray-200 bg-white hover:bg-gray-50'}`
      } ${convo.isHidden ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold ${theme.accentIconBg} ${theme.accentIconText}`}>
          {(convo.participantName || '?').charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`font-semibold text-sm truncate ${theme.heading}`}>
              {convo.participantName || 'Unknown sender'}
            </span>
            <PlatformBadge platform={convo.platform} />
          </div>

          <p className={`text-xs mt-0.5 truncate ${theme.muted}`}>
            @{convo.accountHandle}
          </p>

          <p className={`text-sm mt-1 truncate ${theme.body}`}>
            {preview?.isFromPage && <span className={`mr-1 ${theme.muted}`}>You:</span>}
            {preview?.body || 'No messages yet'}
          </p>

          <div className={`flex items-center gap-2 mt-1 text-[11px] ${theme.muted}`}>
            <span>{timeAgo(convo.lastMessageAt)}</span>
            <span>·</span>
            <span>{convo.messageCount} msgs</span>
          </div>
        </div>
      </div>
    </button>
  )
}

function ActiveThreadPanel({ convo, onHideToggle }) {
  const { theme } = useTheme()
  const [hiding, setHiding] = useState(false)

  const sortedMessages = [...(convo.messages || [])].sort(
    (a, b) => new Date(a.sentAt) - new Date(b.sentAt)
  )

  async function handleHide() {
    setHiding(true)
    try {
      await hideConversation(convo.id, !convo.isHidden)
      onHideToggle(convo.id, !convo.isHidden)
    } finally {
      setHiding(false)
    }
  }

  return (
    <div className={`h-full border rounded-xl overflow-hidden flex flex-col ${theme.card}`}>
      <div className={`px-5 py-4 border-b ${theme.cardDivider}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-sm font-semibold ${theme.heading}`}>
                {convo.participantName || 'Unknown sender'}
              </h3>
              <PlatformBadge platform={convo.platform} />
              <span className={`text-xs ${theme.muted}`}>@{convo.accountHandle}</span>
            </div>

            <p className={`text-xs mt-1 ${theme.muted}`}>
              Last active {timeAgo(convo.lastMessageAt)} · {convo.messageCount} messages
            </p>
          </div>

          <button
            type="button"
            onClick={handleHide}
            disabled={hiding}
            className={`text-xs px-3 py-1.5 rounded-lg border ${theme.code} ${theme.muted}`}
          >
            {hiding ? '…' : convo.isHidden ? 'Unhide conversation' : 'Hide as spam'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
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
                    {msg.fromName || convo.participantName || 'Unknown'}
                  </p>
                )}
                <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                <p className="text-xs mt-1 opacity-70">{timeAgo(msg.sentAt)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function MessagesSectionThreaded({ conversations: initialConversations, loading }) {
  const { theme } = useTheme()
  const [conversations, setConversations] = useState(initialConversations ?? [])
  const [showHidden, setShowHidden] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    if (initialConversations) setConversations(initialConversations)
  }, [initialConversations])

  const hiddenCount = conversations.filter(c => c.isHidden).length
  const visible = showHidden ? conversations : conversations.filter(c => !c.isHidden)

  useEffect(() => {
    if (!visible.length) {
      setSelectedId(null)
      return
    }
    if (!visible.some(c => c.id === selectedId)) {
      setSelectedId(visible[0].id)
    }
  }, [visible, selectedId])

  function handleHideToggle(id, isHidden) {
    setConversations(prev => prev.map(c => (
      c.id === id ? { ...c, isHidden } : c
    )))
  }

  const activeConversation = useMemo(
    () => visible.find(c => c.id === selectedId) || null,
    [visible, selectedId]
  )

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
    <div className="space-y-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 h-[70vh]">
        <div className="space-y-2 overflow-y-auto pr-1">
          {visible.map(convo => (
            <ThreadListItem
              key={convo.id}
              convo={convo}
              active={convo.id === selectedId}
              onSelect={setSelectedId}
              theme={theme}
            />
          ))}
        </div>

        <div className="min-h-[420px]">
          {activeConversation ? (
            <ActiveThreadPanel
              convo={activeConversation}
              onHideToggle={handleHideToggle}
            />
          ) : (
            <div className={`h-full border rounded-xl flex items-center justify-center ${theme.card}`}>
              <p className={`text-sm ${theme.muted}`}>Select a conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}