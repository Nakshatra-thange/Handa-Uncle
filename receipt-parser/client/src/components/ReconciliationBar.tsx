import type { LineItem } from "../lib/api";

interface Props {
  items: LineItem[];
  total: number | null;
}

export function ReconciliationBar({ items, total }: Props) {
  const itemsSum = items.reduce((acc, item) => acc + (item.amount ?? 0), 0);
  const hasTotal = total !== null;
  const diff = hasTotal ? Math.round((itemsSum - total) * 100) / 100 : null;
  const mismatch = diff !== null && Math.abs(diff) > 0.01;

  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

  return (
    <div className={`reconcile-bar${mismatch ? " reconcile-bar--warn" : ""}`}>
      <span className="reconcile-label">Reconciliation</span>
      <div className="reconcile-values">
        <span>
          Items total: <strong>{fmt(itemsSum)}</strong>
        </span>
        {hasTotal && (
          <>
            <span className="reconcile-dot">·</span>
            <span>
              Receipt total: <strong>{fmt(total!)}</strong>
            </span>
            {mismatch && (
              <>
                <span className="reconcile-dot">·</span>
                <span className="reconcile-diff">
                  Difference: <strong>{diff! > 0 ? "+" : ""}{fmt(diff!)}</strong>
                </span>
              </>
            )}
          </>
        )}
      </div>
      {mismatch && (
        <span className="reconcile-hint">Total does not match line items</span>
      )}
    </div>
  );
}