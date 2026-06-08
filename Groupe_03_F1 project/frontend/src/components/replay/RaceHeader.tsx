import type { ReplayBundle } from "../../types";
import { activeFlag, currentLap, runningOrder, weatherAt } from "./replayUtils";

export default function RaceHeader({ bundle, time }: { bundle: ReplayBundle; time: number }) {
  const order = runningOrder(bundle, time);
  const leader = order[0]?.driver_number;
  const lap = leader != null ? currentLap(bundle.laps[String(leader)], time) : null;
  const flag = activeFlag(bundle, time);
  const w = weatherAt(bundle.weather, time);
  const wet = (w?.rainfall ?? 0) > 0;

  return (
    <div className="race-header">
      <div className="race-header-left">
        <span className="race-header-circuit">
          {bundle.session.location ?? bundle.session.country_name}
        </span>
        <span className="race-header-year">{bundle.session.year}</span>
      </div>

      <div className="race-header-lap">
        LAP <strong>{lap ?? "—"}</strong>
        <span className="race-header-total">/ {bundle.total_laps || "—"}</span>
      </div>

      <div className={`race-header-flag flag-${flag.kind}`}>{flag.label}</div>

      <div className="race-header-weather">
        <span>TRACK {w?.track != null ? `${w.track}°` : "—"}</span>
        <span>AIR {w?.air != null ? `${w.air}°` : "—"}</span>
        <span style={{ color: wet ? "#3671c6" : "var(--f1-light-gray)" }}>{wet ? "WET" : "DRY"}</span>
      </div>
    </div>
  );
}
