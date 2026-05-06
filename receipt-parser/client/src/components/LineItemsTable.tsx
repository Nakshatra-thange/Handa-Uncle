import { useRef, useEffect } from "react";
import type { LineItem } from "../lib/api";

interface Props {
  items: LineItem[];
  flagged?: boolean;
  autoFocus?: boolean;
  onChange: (items: LineItem[]) => void;
}

export function LineItemsTable({ items, flagged, autoFocus, onChange }: Props) {
  const tableRef = useRef<HTMLTableElement>(null);

  // Auto-focus first cell if flagged and requested
  useEffect(() => {
    if (autoFocus && items.length > 0) {
      requestAnimationFrame(() => {
        const first = tableRef.current?.querySelector("input") as HTMLInputElement;
        first?.focus();
      });
    }
  }, [autoFocus]);

  const update = (index: number, field: keyof LineItem, raw: string) => {
    const next = items.map((item, i) => {
      if (i !== index) return item;
      if (field === "amount") {
        const num = parseFloat(raw);
        return { ...item, amount: isNaN(num) ? null : num };
      }
      return { ...item, [field]: raw || null };
    });
    onChange(next);
  };

  const deleteRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([...items, { name: null, amount: null }]);
    // Focus new row's name cell after render
    requestAnimationFrame(() => {
      const rows = tableRef.current?.querySelectorAll("tbody tr");
      if (rows) {
        const last = rows[rows.length - 1];
        (last?.querySelector("input") as HTMLInputElement)?.focus();
      }
    });
  };

  // Tab from last amount of a row → first name of next row (natural)
  const onAmountKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Tab" && !e.shiftKey && index === items.length - 1) {
      e.preventDefault();
      addRow();
    }
  };

  return (
    <div className={`line-items-wrap${flagged ? " flagged" : ""}`}>
      <div className="section-header">
        <span className="section-label">
          Line items
          {flagged && <span className="review-badge">Review</span>}
        </span>
      </div>

      <table className="items-table" ref={tableRef}>
        <thead>
          <tr>
            <th className="col-name">Item</th>
            <th className="col-amount">Amount</th>
            <th className="col-delete" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="item-row">
              <td className="col-name">
                <input
                  className="cell-input"
                  type="text"
                  value={item.name ?? ""}
                  placeholder="Item name"
                  onChange={(e) => update(i, "name", e.target.value)}
                  aria-label={`Item ${i + 1} name`}
                />
              </td>
              <td className="col-amount">
                <input
                  className="cell-input cell-input--amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.amount ?? ""}
                  placeholder="0.00"
                  onChange={(e) => update(i, "amount", e.target.value)}
                  onKeyDown={(e) => onAmountKeyDown(e, i)}
                  aria-label={`Item ${i + 1} amount`}
                />
              </td>
              <td className="col-delete">
                <button
                  className="delete-btn"
                  onClick={() => deleteRow(i)}
                  aria-label={`Delete item ${i + 1}`}
                  tabIndex={-1}
                >
                  <TrashIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="add-row-btn" onClick={addRow}>
        <PlusIcon />
        Add item
      </button>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}