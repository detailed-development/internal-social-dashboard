import { useTheme } from '../../ThemeContext'

function FieldLabel({ children }) {
  const { theme } = useTheme()
  return <label className={`block text-xs font-medium mb-1 ${theme.muted}`}>{children}</label>
}

function TextInput({ value, onChange, placeholder }) {
  const { theme } = useTheme()
  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${theme.focusRing} ${theme.input}`

  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  )
}

function TextArea({ value, onChange, placeholder, rows, mono = false }) {
  const { theme } = useTheme()
  const className = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-y ${theme.focusRing} ${theme.input}${mono ? ' font-mono text-xs' : ''}`

  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={className}
    />
  )
}

export default function StyleGuideFormFields({ form, onFieldChange }) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Fonts</FieldLabel>
        <TextInput
          value={form.fonts}
          onChange={(value) => onFieldChange('fonts', value)}
          placeholder="e.g. Heading: Playfair Display, Body: Inter"
        />
      </div>

      <div>
        <FieldLabel>Primary Colors (one per line)</FieldLabel>
        <TextArea
          value={form.primaryColors}
          onChange={(value) => onFieldChange('primaryColors', value)}
          placeholder="#FF5733&#10;#C70039"
          rows={3}
        />
      </div>

      <div>
        <FieldLabel>Secondary Colors (one per line)</FieldLabel>
        <TextArea
          value={form.secondaryColors}
          onChange={(value) => onFieldChange('secondaryColors', value)}
          placeholder="#900C3F&#10;#581845"
          rows={3}
        />
      </div>

      <div>
        <FieldLabel>Tone of Voice</FieldLabel>
        <TextArea
          value={form.toneOfVoice}
          onChange={(value) => onFieldChange('toneOfVoice', value)}
          placeholder="Professional yet approachable. Avoid jargon. Speak directly to the community."
          rows={3}
        />
      </div>

      <div>
        <FieldLabel>Brand Guidelines</FieldLabel>
        <TextArea
          value={form.brandGuidelines}
          onChange={(value) => onFieldChange('brandGuidelines', value)}
          placeholder="Always lead with the mission. Keep captions under 150 words for feed posts."
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Do's (one per line)</FieldLabel>
          <TextArea
            value={form.dos}
            onChange={(value) => onFieldChange('dos', value)}
            placeholder="Use authentic photography&#10;Feature real clients"
            rows={4}
          />
        </div>

        <div>
          <FieldLabel>Don'ts (one per line)</FieldLabel>
          <TextArea
            value={form.donts}
            onChange={(value) => onFieldChange('donts', value)}
            placeholder="Stock imagery&#10;Competitor mentions"
            rows={4}
          />
        </div>
      </div>
    </div>
  )
}
