import { useRef, useState, useEffect } from "react";

interface Props {
  label: string;
  value: string;
  flagged?: boolean;
  autoFocus?: boolean;
  format?: (val: string) => string;       // display formatter (e.g. currency)
  validate?: (val: string) => string | null; // returns error string or null
  onChange: (val: string) => void;
  inputType?: "text" | "date" | "number";
  placeholder?: string;
}

export function InlineField({
  label,
  value,
  flagged,
  autoFocus,
  format,
  validate,
  onChange,
  inputType = "text",
  placeholder = "—",
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus if flagged and first in list
  useEffect(() => {
    if (autoFocus) setEditing(true);
  }, [autoFocus]);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing, value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (validate) {
      const err = validate(trimmed);
      if (err) { setError(err); return; }
    }
    setError(null);
    onChange(trimmed);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setError(null);
    setEditing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") cancel();
  };

  const displayed = format ? format(value) : (value || placeholder);

  return (
    <div className={`inline-field${flagged ? " flagged" : ""}`}>
      <span className="field-label">
        {label}
        {flagged && <span className="review-badge">Review</span>}
      </span>

      {editing ? (
        <div className="field-edit">
          <input
            ref={inputRef}
            className={`field-input${error ? " field-input--error" : ""}`}
            type={inputType}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(null); }}
            onBlur={commit}
            onKeyDown={onKeyDown}
          />
          {error && <span className="field-error">{error}</span>}
        </div>
      ) : (
        <button
          className={`field-value${!value ? " field-value--empty" : ""}`}
          onClick={() => setEditing(true)}
          aria-label={`Edit ${label}`}
        >
          {displayed}
          <PencilIcon />
        </button>
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg className="pencil-icon" width="12" height="12" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}