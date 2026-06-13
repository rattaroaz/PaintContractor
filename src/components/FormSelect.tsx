interface FormSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  /** When set, adds an empty first option (e.g. "Select…"). Omit to match filter dropdowns like Aging Reports. */
  placeholder?: string;
  className?: string;
}

/** Bootstrap form-select dropdown — same markup as Aging Reports / Sales / AR filters. */
export function FormSelect({
  options,
  value,
  onChange,
  id,
  disabled,
  placeholder,
  className = "form-select",
}: FormSelectProps) {
  const items =
    value && !options.includes(value) ? [value, ...options] : options;

  return (
    <select
      id={id}
      className={className}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {items.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  );
}
