import { useMemo, useState } from "react";
import { Modal } from "./Modal";

interface EditableDropdownProps {
  data: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function EditableDropdown({
  data,
  value,
  onChange,
  placeholder = "Type first letters to search...",
  disabled,
  id,
}: EditableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState(value);

  const filtered = useMemo(() => {
    const q = (filter || value).toLowerCase();
    if (!q) return data;
    return data.filter((d) => d.toLowerCase().startsWith(q));
  }, [data, filter, value]);

  const showPicker = data.length > 0;

  return (
    <div className="editable-dropdown position-relative">
      <div className="input-group">
        <input
          id={id}
          type="text"
          className="form-control"
          list={id ? `${id}-list` : undefined}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            setFilter(v);
            onChange(v);
          }}
          onInput={(e) => setFilter((e.target as HTMLInputElement).value)}
          autoComplete="off"
        />
        {showPicker && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setOpen(true)}
            disabled={disabled}
            title="Browse all"
          >
            ▾
          </button>
        )}
      </div>
      {id && (
        <datalist id={`${id}-list`}>
          {filtered.slice(0, 50).map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      )}

      <Modal
        show={open}
        title="Select item"
        onClose={() => setOpen(false)}
        size="sm"
      >
        <div
          className="list-group list-group-flush"
          style={{ maxHeight: 260, overflowY: "auto" }}
        >
          {data.map((item) => (
            <button
              key={item}
              type="button"
              className={`list-group-item list-group-item-action ${
                item === value ? "active" : ""
              }`}
              onClick={() => {
                onChange(item);
                setFilter(item);
                setOpen(false);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
