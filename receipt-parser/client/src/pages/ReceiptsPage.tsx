import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listReceipts, imageUrl } from "../lib/api";
import type { ReceiptListItem } from "../lib/api";

export function ReceiptsPage() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listReceipts()
      .then(setReceipts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (total: number | null) => {
    if (total === null) return "—";
    return total.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    });
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const fmtCreated = (iso: string) => {
    const d = new Date(iso + "Z"); // SQLite stores without Z
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="page-root">
      <header className="page-header">
        <div className="header-left">
          <span className="app-title">Receipt Parser</span>
        </div>
        <button className="save-btn save-btn--idle" onClick={() => navigate("/")}>
          + New receipt
        </button>
      </header>

      <main className="receipts-main">
        <div className="receipts-container">
          <h2 className="receipts-heading">Saved receipts</h2>

          {loading && (
            <div className="receipts-empty">
              <span className="skeleton-spinner" style={{ width: 16, height: 16 }} />
              Loading...
            </div>
          )}

          {error && (
            <div className="error-banner">{error}</div>
          )}

          {!loading && !error && receipts.length === 0 && (
            <div className="receipts-empty">
              No receipts saved yet.{" "}
              <button className="inline-link" onClick={() => navigate("/")}>
                Upload one
              </button>
            </div>
          )}

          {!loading && receipts.length > 0 && (
            <div className="receipts-table-wrap">
              <table className="receipts-table">
                <thead>
                  <tr>
                    <th className="rcol-thumb" />
                    <th className="rcol-merchant">Merchant</th>
                    <th className="rcol-date">Date</th>
                    <th className="rcol-total">Total</th>
                    <th className="rcol-saved">Saved</th>
                    <th className="rcol-action" />
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r) => (
                    <tr
                      key={r.id}
                      className="receipt-row"
                      onClick={() => navigate(`/edit/${r.id}`)}
                    >
                      <td className="rcol-thumb">
                        <img
                          src={imageUrl(r.image_path)}
                          alt="Receipt thumbnail"
                          className="receipt-thumb"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </td>
                      <td className="rcol-merchant">
                        {r.merchant ?? <span className="text-dim">Unknown</span>}
                      </td>
                      <td className="rcol-date">
                        {fmtDate(r.date)}
                      </td>
                      <td className="rcol-total">
                        {fmt(r.total)}
                      </td>
                      <td className="rcol-saved">
                        {fmtCreated(r.created_at)}
                      </td>
                      <td className="rcol-action">
                        <button
                          className="open-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/edit/${r.id}`);
                          }}
                        >
                          Open →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}