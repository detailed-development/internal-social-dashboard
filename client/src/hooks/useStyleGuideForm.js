import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getStyleGuide, updateStyleGuide } from '../api'

function parseList(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)

  return String(value)
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function listToString(value) {
  if (!value) return ''
  if (Array.isArray(value)) return value.join('\n')
  return String(value)
}

export function buildPromptMarkdown({
  fonts,
  primaryColors,
  secondaryColors,
  toneOfVoice,
  brandGuidelines,
  dos,
  donts,
}) {
  const lines = ['# Brand Style Guide']

  if (fonts) {
    lines.push('\n## Typography')
    lines.push(fonts)
  }

  const primaryColorList = parseList(primaryColors)
  if (primaryColorList.length > 0) {
    lines.push('\n## Primary Colors')
    primaryColorList.forEach((color) => lines.push(`- ${color}`))
  }

  const secondaryColorList = parseList(secondaryColors)
  if (secondaryColorList.length > 0) {
    lines.push('\n## Secondary Colors')
    secondaryColorList.forEach((color) => lines.push(`- ${color}`))
  }

  if (toneOfVoice) {
    lines.push('\n## Tone of Voice')
    lines.push(toneOfVoice)
  }

  if (brandGuidelines) {
    lines.push('\n## Brand Guidelines')
    lines.push(brandGuidelines)
  }

  const doList = parseList(dos)
  if (doList.length > 0) {
    lines.push("\n## Do's")
    doList.forEach((item) => lines.push(`- ${item}`))
  }

  const dontList = parseList(donts)
  if (dontList.length > 0) {
    lines.push("\n## Don'ts")
    dontList.forEach((item) => lines.push(`- ${item}`))
  }

  return lines.join('\n')
}

const EMPTY_FORM = {
  fonts: '',
  primaryColors: '',
  secondaryColors: '',
  toneOfVoice: '',
  brandGuidelines: '',
  dos: '',
  donts: '',
}

function mapGuideToForm(guide) {
  return {
    fonts: guide?.fonts || '',
    primaryColors: listToString(guide?.primaryColors),
    secondaryColors: listToString(guide?.secondaryColors),
    toneOfVoice: guide?.toneOfVoice || '',
    brandGuidelines: guide?.brandGuidelines || '',
    dos: listToString(guide?.dos),
    donts: listToString(guide?.donts),
  }
}

export function useStyleGuideForm(clientSlug) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [manualOverride, setManualOverride] = useState(false)
  const [manualMarkdown, setManualMarkdown] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const saveResetTimerRef = useRef(null)

  const autoPromptMarkdown = useMemo(() => buildPromptMarkdown(form), [form])
  const promptMarkdown = manualOverride ? manualMarkdown : autoPromptMarkdown

  useEffect(() => {
    if (!clientSlug) return

    let cancelled = false
    setLoading(true)

    getStyleGuide(clientSlug)
      .then((guide) => {
        if (cancelled || !guide) return

        const nextForm = mapGuideToForm(guide)
        const generatedPrompt = buildPromptMarkdown({
          fonts: guide.fonts,
          primaryColors: guide.primaryColors,
          secondaryColors: guide.secondaryColors,
          toneOfVoice: guide.toneOfVoice,
          brandGuidelines: guide.brandGuidelines,
          dos: guide.dos,
          donts: guide.donts,
        })
        const savedPrompt = guide.promptMarkdown || ''
        const hasManualOverride = savedPrompt.trim() !== '' && savedPrompt.trim() !== generatedPrompt.trim()

        setForm(nextForm)
        setManualOverride(hasManualOverride)
        setManualMarkdown(hasManualOverride ? savedPrompt : generatedPrompt)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [clientSlug])

  useEffect(() => {
    return () => {
      if (saveResetTimerRef.current) {
        clearTimeout(saveResetTimerRef.current)
      }
    }
  }, [])

  const setField = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }, [])

  const handleManualOverrideChange = useCallback((checked) => {
    setManualOverride(checked)
    if (checked) {
      setManualMarkdown((current) => current || autoPromptMarkdown)
    }
  }, [autoPromptMarkdown])

  const save = useCallback(async (event) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      await updateStyleGuide(clientSlug, {
        fonts: form.fonts || null,
        primaryColors: parseList(form.primaryColors),
        secondaryColors: parseList(form.secondaryColors),
        toneOfVoice: form.toneOfVoice || null,
        brandGuidelines: form.brandGuidelines || null,
        dos: parseList(form.dos),
        donts: parseList(form.donts),
        promptMarkdown: promptMarkdown || null,
      })

      setSaved(true)

      if (saveResetTimerRef.current) {
        clearTimeout(saveResetTimerRef.current)
      }

      saveResetTimerRef.current = setTimeout(() => {
        setSaved(false)
      }, 2500)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [clientSlug, form, promptMarkdown])

  const copyMarkdown = useCallback(async () => {
    if (!promptMarkdown) return
    await navigator.clipboard.writeText(promptMarkdown)
  }, [promptMarkdown])

  const downloadMarkdown = useCallback(() => {
    if (!promptMarkdown) return

    const blob = new Blob([promptMarkdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${clientSlug}-style-guide.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [clientSlug, promptMarkdown])

  return {
    form,
    promptMarkdown,
    manualOverride,
    loading,
    saving,
    saved,
    error,
    actions: {
      setField,
      save,
      setManualMarkdown,
      handleManualOverrideChange,
      copyMarkdown,
      downloadMarkdown,
    },
  }
}
