export function ParseSkeleton() {
    return (
      <div className="skeleton-root" aria-busy="true" aria-label="Extracting receipt data">
        <div className="skeleton-status">
          <span className="skeleton-spinner" />
          <span className="skeleton-msg">Extracting receipt data...</span>
        </div>
  
        <div className="skeleton-fields">
          <SkeletonField label="Merchant" width="60%" />
          <SkeletonField label="Date" width="40%" />
          <SkeletonField label="Total" width="30%" />
        </div>
  
        <div className="skeleton-table-label">Line items</div>
        <div className="skeleton-table">
          <SkeletonRow widths={["55%", "20%"]} />
          <SkeletonRow widths={["45%", "20%"]} />
          <SkeletonRow widths={["50%", "20%"]} />
          <SkeletonRow widths={["35%", "20%"]} />
        </div>
      </div>
    );
  }
  
  function SkeletonField({ label, width }: { label: string; width: string }) {
    return (
      <div className="skeleton-field">
        <span className="skeleton-field-label">{label}</span>
        <span className="skeleton-bar" style={{ width }} />
      </div>
    );
  }
  
  function SkeletonRow({ widths }: { widths: [string, string] }) {
    return (
      <div className="skeleton-row">
        <span className="skeleton-bar" style={{ width: widths[0] }} />
        <span className="skeleton-bar" style={{ width: widths[1] }} />
      </div>
    );
  }