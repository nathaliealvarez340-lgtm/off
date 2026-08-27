export default function PersonalMapLoading() {
  return <main className="off-map-shell off-intelligence-loading" aria-busy="true" aria-label="Loading personal map">
    <div className="off-skeleton off-skeleton-title" />
    <div className="off-skeleton off-skeleton-map" />
    <div className="off-skeleton off-skeleton-row" />
  </main>;
}
