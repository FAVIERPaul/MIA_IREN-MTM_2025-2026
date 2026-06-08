import { useMemo } from "react";
import type { ReplayBundle } from "../../types";
import { compoundForLap, currentLap, gapAt, runningOrder, tyreShort } from "./replayUtils";
import { flagCode } from "../../flags";
import DriverAvatar from "./DriverAvatar";

const ROW_H = 32; // keep in sync with .tower-row height in theme.css

function gapLabel(gap: number | string | null): string {
  if (gap == null) return "—";
  if (typeof gap === "string") return gap;
  if (gap === 0) return "LEADER";
  return `+${gap.toFixed(3)}`;
}

export default function TimingTower({
  bundle,
  time,
  selectedDriver,
  onSelect,
}: {
  bundle: ReplayBundle;
  time: number;
  selectedDriver: number | null;
  onSelect: (dn: number) => void;
}) {
  // rank index per driver at this instant (0-based) — drives the row's Y offset.
  const rankByDriver = useMemo(() => {
    const order = runningOrder(bundle, time);
    const map = new Map<number, number>();
    order.forEach((e, i) => map.set(e.driver_number, i));
    return map;
  }, [bundle, time]);

  return (
    <div className="card">
      <div className="card-header">LIVE TIMING</div>
      <div className="tower">
        {/* Rows stay in stable DOM order (keyed by driver) and slide via translateY,
            so position changes animate instead of snapping. */}
        <div className="tower-list" style={{ height: bundle.drivers.length * ROW_H }}>
          {bundle.drivers.map((d) => {
            const key = String(d.driver_number);
            const rank = rankByDriver.get(d.driver_number) ?? bundle.drivers.length - 1;
            const gap = gapAt(bundle.intervals[key], time);
            const lap = currentLap(bundle.laps[key], time);
            const compound = compoundForLap(bundle.stints[key], lap);
            const sel = d.driver_number === selectedDriver;
            const fc = flagCode(d.country_code);
            return (
              <div
                key={d.driver_number}
                className={`tower-row ${sel ? "selected" : ""}`}
                style={{ transform: `translateY(${rank * ROW_H}px)` }}
                onClick={() => onSelect(d.driver_number)}
              >
                <span className="tower-pos">{rank + 1}</span>
                <span className="tower-bar" style={{ background: d.team_colour }} />
                <DriverAvatar driver={d} size={22} />
                {fc && <span className={`fi fi-${fc} tower-flag`} />}
                <span className="tower-code">{d.name_acronym || d.driver_number}</span>
                <span className={`tyre-dot tyre-${compound ?? "unknown"}`}>{tyreShort(compound)}</span>
                <span className="tower-gap">{rank === 0 ? "LEADER" : gapLabel(gap?.gap_to_leader ?? null)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
