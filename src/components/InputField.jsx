/**
 * InputField — editable input with blue left-border accent.
 * SelectField — dropdown, no accent border (semantically different).
 */

export function InputField({ label, name, value, onChange, hint, error,
  type = 'number', min, max, step = 'any' }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <input
        id={name}
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        min={min} max={max} step={step}
        className={error ? 'err' : ''}
        autoComplete="off"
        inputMode={type === 'number' ? 'decimal' : undefined}
      />
      {error
        ? <span className="field-error">{error}</span>
        : hint
          ? <span className="field-hint">{hint}</span>
          : null
      }
    </div>
  )
}

export function SelectField({ label, value, onChange, options, hint }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

/**
 * ComputedField — read-only display. No blue accent border.
 * Used for PA, headwind, crosswind, etc.
 */
export function ComputedField({ label, value, colorClass = '' }) {
  return (
    <div className="computed-field">
      <div className="computed-label">{label}</div>
      <div className={`computed-value ${colorClass}`}>{value ?? '—'}</div>
    </div>
  )
}
