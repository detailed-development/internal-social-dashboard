import { useMemo, useState } from 'react'
import { FeatureFlagsContext } from './FeatureFlagsContext'
import { VARIANT_CONFIG } from './config'

const STORAGE_KEY = 'ncm_feature_flags'

function buildDefaultFlags() {
  return Object.fromEntries(
    Object.entries(VARIANT_CONFIG).map(([key, def]) => [key, def.defaultValue])
  )
}

function isAllowedVariant(key, value) {
  const options = VARIANT_CONFIG[key]?.options || []
  return options.some(option => option.value === value)
}

function sanitizeFlags(rawFlags = {}) {
  const defaults = buildDefaultFlags()
  const next = { ...defaults }

  for (const key of Object.keys(VARIANT_CONFIG)) {
    const value = rawFlags[key]
    if (isAllowedVariant(key, value)) {
      next[key] = value
    }
  }

  return next
}

function getInitialFlags() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return sanitizeFlags(saved)
  } catch {
    return buildDefaultFlags()
  }
}

export function FeatureFlagsProvider({ children }) {
  const [flags, setFlags] = useState(getInitialFlags)

  function setFlag(key, value) {
    if (!isAllowedVariant(key, value)) return

    setFlags(prev => {
      const next = { ...prev, [key]: value }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }

  function resetFlags() {
    const defaults = buildDefaultFlags()
    setFlags(defaults)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
    } catch {}
  }

  const value = useMemo(() => ({
    flags,
    config: VARIANT_CONFIG,
    setFlag,
    resetFlags,
    getVariant: key => flags[key] ?? VARIANT_CONFIG[key]?.defaultValue ?? 'default',
  }), [flags])

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}