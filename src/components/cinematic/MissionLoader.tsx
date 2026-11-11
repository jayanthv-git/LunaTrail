export function MissionLoader({
  progress,
  ready,
}: {
  progress: number;
  ready: boolean;
}) {
  return (
    <div
      className={`mission-loader ${ready ? "complete" : ""}`}
      role="status"
      aria-hidden={ready}
    >
      <span className="loader-brand">LUNATRAIL</span>
      <div className="loader-caption">
        <span>MISSION INITIALIZING</span>
        <span>{String(progress).padStart(2, "0")} / 100</span>
      </div>
      <div className="loader-track">
        <i style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
    </div>
  );
}
