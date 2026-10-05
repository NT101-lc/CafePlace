import type { InputHTMLAttributes, ReactNode } from 'react'
import './FormField.css'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Error message for this field (from ApiError.fields). */
  error?: string
  /** Small help text under the input. */
  hint?: string
  /** Text shown inside the input on the right, e.g. "đ". */
  suffix?: ReactNode
}

/** Labelled input with optional hint, suffix and error message. */
export default function FormField({ label, error, hint, suffix, id, ...inputProps }: Props) {
  const inputId = id ?? inputProps.name
  const messageId = `${inputId}-message`
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className={suffix ? 'field-control has-suffix' : 'field-control'}>
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          {...inputProps}
        />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </div>
      {error ? (
        <div id={messageId} className="field-error">
          {error}
        </div>
      ) : (
        hint && (
          <div id={messageId} className="field-hint">
            {hint}
          </div>
        )
      )}
    </div>
  )
}
