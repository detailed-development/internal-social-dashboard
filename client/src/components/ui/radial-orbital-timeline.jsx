import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Link2, Zap } from 'lucide-react'

import { useTheme } from '../../ThemeContext'
import { cn } from '../../lib/utils'
import { Badge } from './badge'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'

function clampEnergy(energy) {
  return Math.max(8, Math.min(100, Math.round(energy || 0)))
}

function getStatusLabel(status) {
  if (status === 'completed') return 'Live'
  if (status === 'in-progress') return 'Active'
  return 'Pending'
}

function getStatusStyles(status) {
  if (status === 'completed') return 'bg-white text-black border-white'
  if (status === 'in-progress') return 'bg-sky-400/15 text-sky-200 border-sky-300/40'
  return 'bg-white/5 text-white/65 border-white/15'
}

function DetailsCard({ item, timelineData, onSelect, className }) {
  return (
    <Card className={cn('w-64 border-white/15 bg-black/85 text-white shadow-2xl shadow-black/30 backdrop-blur-xl', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <Badge className={cn('text-[10px]', getStatusStyles(item.status))}>
            {getStatusLabel(item.status)}
          </Badge>
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/45">
            {item.date}
          </span>
        </div>
        <CardTitle className="text-sm text-white">{item.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 text-xs text-white/75">
        <p className="leading-relaxed">{item.content}</p>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] text-white/65">
            <span className="inline-flex items-center gap-1">
              <Zap size={12} />
              Energy
            </span>
            <span className="font-mono">{clampEnergy(item.energy)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-fuchsia-400"
              style={{ width: `${clampEnergy(item.energy)}%` }}
            />
          </div>
        </div>

        {item.relatedIds?.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-white/50">
              <Link2 size={12} />
              Connected Nodes
            </div>
            <div className="flex flex-wrap gap-1.5">
              {item.relatedIds.map(relatedId => {
                const relatedItem = timelineData.find(entry => entry.id === relatedId)
                if (!relatedItem) return null

                return (
                  <Button
                    key={relatedId}
                    variant="outline"
                    size="sm"
                    className="rounded-full border-white/15 px-2.5 text-[11px]"
                    onClick={e => {
                      e.stopPropagation()
                      onSelect(relatedId)
                    }}
                  >
                    {relatedItem.title}
                    <ArrowRight size={11} className="ml-1 opacity-60" />
                  </Button>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function RadialOrbitalTimeline({
  timelineData,
  title = 'Dashboard orbit',
  description = 'Interactive map of the active workflow across the dashboard.',
}) {
  const { theme } = useTheme()
  const [expandedId, setExpandedId] = useState(null)
  const [rotationAngle, setRotationAngle] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth,
  )

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!autoRotate) return undefined

    const timer = window.setInterval(() => {
      setRotationAngle(prev => Number(((prev + 0.24) % 360).toFixed(3)))
    }, 40)

    return () => window.clearInterval(timer)
  }, [autoRotate])

  const compact = viewportWidth < 768
  const radius = compact ? 120 : viewportWidth < 1100 ? 170 : 192

  const activeItem = useMemo(
    () => timelineData.find(item => item.id === expandedId) || null,
    [expandedId, timelineData],
  )

  const relatedIds = useMemo(
    () => new Set(activeItem?.relatedIds || []),
    [activeItem],
  )

  function focusNode(nodeId) {
    const nodeIndex = timelineData.findIndex(item => item.id === nodeId)
    if (nodeIndex === -1) return
    const targetAngle = (nodeIndex / timelineData.length) * 360
    setRotationAngle(270 - targetAngle)
  }

  function toggleItem(nodeId) {
    if (expandedId === nodeId) {
      setExpandedId(null)
      setAutoRotate(true)
      return
    }

    setExpandedId(nodeId)
    setAutoRotate(false)
    focusNode(nodeId)
  }

  function clearSelection() {
    setExpandedId(null)
    setAutoRotate(true)
  }

  function calculateNodePosition(index) {
    const angle = ((index / timelineData.length) * 360 + rotationAngle) % 360
    const radian = (angle * Math.PI) / 180
    const x = radius * Math.cos(radian)
    const y = radius * Math.sin(radian)
    const zIndex = Math.round(100 + 50 * Math.cos(radian))
    const opacity = Math.max(0.42, Math.min(1, 0.42 + 0.58 * ((1 + Math.sin(radian)) / 2)))

    return { x, y, zIndex, opacity }
  }

  return (
    <section className={`mt-8 rounded-[28px] border p-4 sm:p-6 ${theme.card}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${theme.subtext}`}>
            Interactive overview
          </p>
          <h3 className={`mt-2 text-xl font-semibold ${theme.heading}`}>{title}</h3>
          <p className={`mt-1 max-w-2xl text-sm ${theme.subtext}`}>{description}</p>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-black/5 px-3 py-1.5 text-[11px] font-medium text-gray-500">
          <span className={autoRotate ? 'text-emerald-500' : 'text-violet-500'}>
            {autoRotate ? 'Auto-rotating' : 'Focused'}
          </span>
          <span className="text-gray-300">•</span>
          <button
            type="button"
            onClick={() => setAutoRotate(value => !value)}
            className="transition-opacity hover:opacity-70"
          >
            {autoRotate ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      <div
        className="relative mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#050816]"
        onClick={clearSelection}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.18),transparent_34%),radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_64%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:34px_34px]" />

        <div className="relative min-h-[26rem] sm:min-h-[32rem]">
          <div className="absolute left-1/2 top-1/2 h-0 w-0">
            <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
            <div className="absolute left-1/2 top-1/2 h-[17rem] w-[17rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 sm:h-[23rem] sm:w-[23rem]" />

            <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-sky-500 to-cyan-400 shadow-[0_0_60px_rgba(56,189,248,0.35)]">
              <div className="absolute inset-0 rounded-full animate-ping border border-white/15" />
              <div className="h-8 w-8 rounded-full bg-white/85 backdrop-blur-md" />
            </div>

            {timelineData.map((item, index) => {
              const position = calculateNodePosition(index)
              const Icon = item.icon
              const isExpanded = expandedId === item.id
              const isRelated = relatedIds.has(item.id)
              const energy = clampEnergy(item.energy)

              return (
                <div
                  key={item.id}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: isExpanded ? 220 : position.zIndex,
                    opacity: isExpanded ? 1 : position.opacity,
                  }}
                  onClick={event => {
                    event.stopPropagation()
                    toggleItem(item.id)
                  }}
                >
                  <div
                    className={cn(
                      'pointer-events-none absolute rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.26)_0%,rgba(255,255,255,0)_70%)] transition-all duration-500',
                      isExpanded || isRelated ? 'animate-pulse' : '',
                    )}
                    style={{
                      width: `${energy * 0.52 + 42}px`,
                      height: `${energy * 0.52 + 42}px`,
                    }}
                  />

                  <button
                    type="button"
                    className={cn(
                      'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                      isExpanded
                        ? 'scale-[1.45] border-white bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.25)]'
                        : isRelated
                          ? 'border-sky-200 bg-sky-100/25 text-white shadow-[0_0_18px_rgba(56,189,248,0.28)]'
                          : 'border-white/35 bg-black/70 text-white hover:border-white/70 hover:bg-black/80',
                    )}
                  >
                    <Icon size={16} />
                  </button>

                  <div className={cn('mt-3 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] transition-all duration-300', isExpanded ? 'scale-110 text-white' : 'text-white/65')}>
                    {item.title}
                  </div>

                  {!compact && isExpanded && (
                    <DetailsCard
                      item={item}
                      timelineData={timelineData}
                      onSelect={toggleItem}
                      className="absolute left-1/2 top-16 -translate-x-1/2"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {compact && activeItem && (
        <DetailsCard
          item={activeItem}
          timelineData={timelineData}
          onSelect={toggleItem}
          className="mt-4 border-white/10"
        />
      )}
    </section>
  )
}
