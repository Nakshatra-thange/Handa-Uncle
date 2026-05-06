import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { UploadZone } from "../components/UploadZone";
import { ParseSkeleton } from "../components/ParseSkeleton";
import { ParseWarningBanner } from "../components/ParseWarningBanner";
import { uploadAndParse } from "../lib/api";
import type { ParsedReceipt } from "../lib/api";

type Stage =
  | { type: "idle" }
  | { type: "parsing" }
  | { type: "warning"; receipt: ParsedReceipt }
  | { type: "error"; message: string };

export function UploadPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>({ type: "idle" });

  const handleFile = useCallback(async (file: File) => {
    setStage({ type: "parsing" });

    try {
      const receipt = await uploadAndParse(file);

      if (receipt.parse_warning) {
        // Pause on warning banner before navigating — user should see it
        setStage({ type: "warning", receipt });
        setTimeout(() => {
          navigate(`/edit/${receipt.id}`, { state: { receipt } });
        }, 2200);
      } else {
        navigate(`/edit/${receipt.id}`, { state: { receipt } });
      }
    } catch (err) {
      setStage({
        type: "error",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }, [navigate]);

  return (
    <div className="page-root">
      <header className="page-header">
        <h1 className="app-title">Receipt Parser</h1>
        <a href="/receipts" className="nav-link">Saved receipts</a>
      </header>

      <main className="upload-main">
        {stage.type === "idle" && (
          <div className="upload-card"><div className="corner-bl" /><div className="corner-br" /><span className="card-ref">TX01</span>
            <h2 className="card-heading">Upload a receipt</h2>
            <p className="card-sub">
              Upload a photo and we'll extract the data. You can review and correct anything before saving.
            </p>
            <UploadZone onFile={handleFile} />
          </div>
        )}

        {stage.type === "parsing" && (
          <div className="upload-card"><div className="corner-bl" /><div className="corner-br" /><span className="card-ref">TX01</span>
            <UploadZone onFile={() => {}} disabled />
            <ParseSkeleton />
          </div>
        )}

        {stage.type === "warning" && (
          <div className="upload-card"><div className="corner-bl" /><div className="corner-br" /><span className="card-ref">TX01</span>
            <ParseWarningBanner visible />
            <ParseSkeleton />
          </div>
        )}

        {stage.type === "error" && (
          <div className="upload-card"><div className="corner-bl" /><div className="corner-br" /><span className="card-ref">TX01</span>
            <div className="error-banner" role="alert">
              <strong>Extraction failed</strong> — {stage.message}
            </div>
            <UploadZone onFile={handleFile} />
          </div>
        )}
      </main>
    </div>
  );
}