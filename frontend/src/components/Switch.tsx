import './Switch.css'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Accessible name, e.g. "Còn bán Cà phê sữa". */
  label: string
  disabled?: boolean
}

/** On/off toggle with a large touch area. */
export default function Switch({ checked, onChange, label, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onChange(!checked)
      }}
    >
      <span className="switch-track">
        <span className="switch-thumb" />
      </span>
    </button>
  )
}
