import type { LineItem } from "../lib/api";

interface Props {
  items: LineItem[];
  discount?: number | null;
  tax?: number | null;
  tip?: number | null;
  total: number | null;
}

export function ReconciliationBar({ items, discount, tax, tip, total }: Props) {
  const validItems = items.filter((item) => item.amount !== null);

  const hasLineItems = validItems.length > 0;
  const hasTotal = total !== null;

  const itemsSum = validItems.reduce(
    (acc, item) => acc + (item.amount ?? 0),
    0
  );

  const discountValue = discount ?? 0;
  const taxValue = tax ?? 0;
  const tipValue = tip ?? 0;

  const computedTotal = itemsSum - discountValue + taxValue + tipValue;

  const diff =
    hasTotal && hasLineItems
      ? Math.round((computedTotal - total) * 100) / 100
      : null;

  const mismatch = diff !== null && Math.abs(diff) > 0.01;

  const fmt = (n: number) =>
    n.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    });

  return (
    <div
      className={`reconcile-bar${
        mismatch ? " reconcile-bar--warn" : ""
      }`}
    >
      <span className="reconcile-label">Reconciliation</span>

      {!hasLineItems ? (
        <span className="reconcile-hint">
          Unable to reconcile totals because no line items were extracted.
        </span>
      ) : (
        <>
          <div className="reconcile-values">
            <span>
              Items total: <strong>{fmt(itemsSum)}</strong>
            </span>

            {discount !== undefined && discount !== null && (
              <>
                <span className="reconcile-dot">·</span>
                <span>
                  Discount: <strong>-{fmt(Math.abs(discount))}</strong>
                </span>
              </>
            )}

            {tax !== undefined && tax !== null && (
              <>
                <span className="reconcile-dot">·</span>
                <span>
                  Tax: <strong>{fmt(tax)}</strong>
                </span>
              </>
            )}

            {tip !== undefined && tip !== null && (
              <>
                <span className="reconcile-dot">·</span>
                <span>
                  Tip: <strong>{fmt(tip)}</strong>
                </span>
              </>
            )}

            {(discount !== undefined || tax !== undefined || tip !== undefined) && (
              <>
                <span className="reconcile-dot">·</span>
                <span>
                  Computed total: <strong>{fmt(computedTotal)}</strong>
                </span>
              </>
            )}

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
                      Difference:{" "}
                      <strong>
                        {diff! > 0 ? "+" : ""}
                        {fmt(diff!)}
                      </strong>
                    </span>
                  </>
                )}
              </>
            )}
          </div>

          {hasTotal && !mismatch && (
            <span className="reconcile-hint">Totals reconcile successfully.</span>
          )}

          {mismatch && <span className="reconcile-hint">Total does not match line items</span>}
        </>
      )}
    </div>
  );
}