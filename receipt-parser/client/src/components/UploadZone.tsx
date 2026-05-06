import { useRef, useState, useCallback } from "react";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function UploadZone({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      // Show preview immediately — before parse begins
      const url = URL.createObjectURL(file);
      setPreview(url);
      onFile(file);
    },
    [onFile]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="upload-root">
      {preview ? (
        <div className="preview-wrap">
          <img src={preview} alt="Receipt preview" className="preview-img" />
          {!disabled && (
            <button
              className="change-btn"
              onClick={() => {
                setPreview(null);
                inputRef.current?.click();
              }}
            >
              Change image
            </button>
          )}
        </div>
      ) : (
        <div
          className={`drop-zone${dragging ? " dragging" : ""}${disabled ? " disabled" : ""}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => !disabled && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload receipt image"
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        >
          <UploadIcon />
          <p className="drop-label">Drop a receipt image here</p>
          <p className="drop-sub">or click to browse — JPG, PNG, WebP</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onInputChange}
        style={{ display: "none" }}
      />
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}