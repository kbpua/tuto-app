type ImportSourceButtonProps = {
  label: string
  disabled?: boolean
}

export function ImportSourceButton({ label, disabled = true }: ImportSourceButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="rounded-xl border border-dashed border-edge px-4 py-3 text-sm text-muted transition disabled:cursor-not-allowed enabled:hover:border-brand-blue enabled:hover:text-brand-blue"
    >
      {label}
      {disabled && <span className="ml-2 text-xs uppercase">Soon</span>}
    </button>
  )
}
