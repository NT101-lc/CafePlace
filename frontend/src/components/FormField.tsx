import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Error message for this field (from ApiError.fields). */
  error?: string
}

/** Labelled input with an optional error message underneath. */
export default function FormField({ label, error, id, ...inputProps }: Props) {
  const inputId = id ?? inputProps.name
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} aria-invalid={error ? true : undefined} {...inputProps} />
      {error && <div className="field-error">{error}</div>}
    </div>
  )
}
