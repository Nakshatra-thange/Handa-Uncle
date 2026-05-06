import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { InlineField } from "../components/InlineField";
import { LineItemsTable } from "../components/LineItemsTable";
import { ReconciliationBar } from "../components/ReconciliationBar";
import { ParseWarningBanner } from "../components/ParseWarningBanner";
import { ParseSkeleton } from "../components/ParseSkeleton";
import { getReceipt, saveCorrection, imageUrl } from "../lib/api";
import type { ParsedReceipt } from "../lib/api";

type SaveState = "idle" | "saving" | "saved" | "error";

export function EditPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Receipt passed via navigation state (fresh parse) or fetched from DB (re-open)
  const [receipt, setReceipt] = useState<ParsedReceipt | null>(
    (location.state as any)?.receipt ?? null
  );
  const [loading, setLoading] = useState(!receipt);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Two-state dirty check: original is what came from server, current is editable
  const [original, setOriginal] = useState<ParsedReceipt | null>(receipt);
  const [current, setCurrent] = useState<ParsedReceipt | null>(receipt);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showRaw, setShowRaw] = useState(false);

  // Fetch if not passed via state (e.g. direct URL or page refresh)
  useEffect(() => {
    if (receipt) return;
    if (!id) return;
    setLoading(true);
    getReceipt(Number(id))
      .then((r) => {
        setReceipt(r);
        setOriginal(r);
        setCurrent(r);
      })
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // On fresh parse arrival via state, sync all three
  useEffect(() => {
    const r = (location.state as any)?.receipt;
    if (r) {
      setReceipt(r);
      setOriginal(r);
      setCurrent(r);
    }
  }, [location.state]);

  const isDirty = useMemo(() => {
    if (!current || !original) return false;
    return JSON.stringify(current) !== JSON.stringify(original);
  }, [current, original]);

  // Derive which field to auto-focus (first flagged field)
  const firstFlag = useMemo(() => {
    if (!current) return null;
    const { flags } = current;
    if (flags.merchant) return "merchant";
    if (flags.date) return "date";
    if (flags.total) return "total";
    if (flags.line_items) return "line_items";
    return null;
  }, [current?.flags]);

  const patch = (field: keyof ParsedReceipt, value: unknown) => {
    setCurrent((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSave = async () => {
    if (!current || !id) return;
    setSaveState("saving");
    try {
      await saveCorrection(Number(id), current);
      setOriginal(current); // reset dirty baseline
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  if (loading) return (
    <div className="page-root">
      <Header id={id} isDirty={false} saveState="idle" onSave={() => {}} />
      <div className="edit-main"><div className="edit-card"><ParseSkeleton /></div></div>
    </div>
  );

  if (fetchError || !current) return (
    <div className="page-root">
      <Header id={id} isDirty={false} saveState="idle" onSave={() => {}} />
      <div className="edit-main">
        <div className="edit-card">
          <div className="error-banner">{fetchError ?? "Receipt not found"}</div>
        </div>
      </div>
    </div>
  );

  const fmtCurrency = (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return v || "—";
    return n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
  };

  return (
    <div className="page-root">
      <Header id={id} isDirty={isDirty} saveState={saveState} onSave={handleSave} />

      <div className="edit-main">
        <div className="edit-layout">

          {/* Left: image */}
          <div className="edit-image-col">
            <div className="receipt-image-wrap">
              <div className="corner-bl" /><div className="corner-br" />
              <img
                src={imageUrl(current.image_path)}
                alt="Receipt"
                className="receipt-image"
              />
            </div>
            <p className="image-tag">// IMG_{current.id} · SOURCE</p>
          </div>

          {/* Right: fields */}
          <div className="edit-fields-col">
            <ParseWarningBanner visible={current.parse_warning} />

            <div className="fields-card">
              <div className="fields-card-label">[ core parameters ]</div>
              <InlineField
                label="Merchant"
                value={current.merchant ?? ""}
                flagged={!!current.flags.merchant}
                autoFocus={firstFlag === "merchant"}
                onChange={(v) => patch("merchant", v || null)}
                placeholder="Unknown merchant"
              />
              <div className="field-divider" />
              <InlineField
                label="Date"
                value={current.date ?? ""}
                flagged={!!current.flags.date}
                autoFocus={firstFlag === "date"}
                inputType="date"
                onChange={(v) => patch("date", v || null)}
                placeholder="Unknown date"
              />
              <div className="field-divider" />
              <InlineField
                label="Total"
                value={current.total !== null ? String(current.total) : ""}
                flagged={!!current.flags.total}
                autoFocus={firstFlag === "total"}
                inputType="number"
                format={fmtCurrency}
                onChange={(v) => patch("total", v ? parseFloat(v) : null)}
                placeholder="Unknown total"
              />
              <div className="field-divider" />
              <div className="meta-row">
                <span className="field-label">Subtotal</span>
                <span className="field-value field-value--meta">
                  {current.subtotal !== null ? fmtCurrency(String(current.subtotal)) : "—"}
                </span>
              </div>
              <div className="meta-row">
                <span className="field-label">Tax</span>
                <span className="field-value field-value--meta">
                  {current.tax !== null ? fmtCurrency(String(current.tax)) : "—"}
                </span>
              </div>
              {current.tip !== null && (
                <div className="meta-row">
                  <span className="field-label">Tip</span>
                  <span className="field-value field-value--meta">
                    {fmtCurrency(String(current.tip))}
                  </span>
                </div>
              )}
            </div>

            <LineItemsTable
              items={current.line_items}
              flagged={!!current.flags.line_items}
              autoFocus={firstFlag === "line_items"}
              onChange={(items) => patch("line_items", items)}
            />

            <ReconciliationBar items={current.line_items} total={current.total} />

            {/* Raw LLM output toggle */}
            <div className="raw-toggle">
              <button
                className="raw-toggle-btn"
                onClick={() => setShowRaw((v) => !v)}
              >
                {showRaw ? "Hide" : "Show"} raw extracted output
                <ChevronIcon open={showRaw} />
              </button>
              {showRaw && (
                <pre className="raw-output">
                  {JSON.stringify(receipt, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({
  id, isDirty, saveState, onSave,
}: {
  id?: string;
  isDirty: boolean;
  saveState: SaveState;
  onSave: () => void;
}) {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      <div className="header-left">
        <button className="back-btn" onClick={() => navigate("/receipts")}>← Receipts</button>
        <span className="app-title">Receipt #{id}</span>
        {isDirty && <span className="unsaved-dot" title="Unsaved changes">Unsaved changes</span>}
      </div>
      <button
        className={`save-btn save-btn--${saveState}`}
        onClick={onSave}
        disabled={!isDirty || saveState === "saving"}
      >
        {saveState === "saving" && "Saving..."}
        {saveState === "saved" && "Saved ✓"}
        {saveState === "error" && "Save failed"}
        {saveState === "idle" && (isDirty ? "Save" : "No changes")}
      </button>
    </header>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}