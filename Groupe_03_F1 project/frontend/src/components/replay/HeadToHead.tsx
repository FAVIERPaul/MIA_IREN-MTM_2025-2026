import { useEffect, useMemo, useState } from "react";
import type { ReplayBundle, ReplayDriver } from "../../types";
import { compoundForLap, currentLap, gapAt, runningOrder, tyreShort } from "./replayUtils";
import { useTelemetry, telemetryIndex } from "./useTelemetry";
import DriverAvatar from "./DriverAvatar";

interface CarState {
  driver: ReplayDriver;
  position: number;
  tyre: string | null;
  gapToLeader: number | string | null;
  speed: number | null;
}

function useCarState(bundle: ReplayBundle, dn: number | null, time: number): CarState | null {
  const { data: telem } = useTelemetry(bundle.session.session_key, dn);
  return useMemo(() => {
    if (dn == null) return null;
    const driver = bundle.drivers.find((d) => d.driver_number === dn);
    if (!driver) return null;
    const key = String(dn);
    const order = runningOrder(bundle, time).find((e) => e.driver_number === dn);
    const lap = currentLap(bundle.laps[key], time);
    const i = telem ? telemetryIndex(telem.t, time) : -1;
    return {
      driver,
      position: order?.position ?? 99,
      tyre: compoundForLap(bundle.stints[key], lap),
      gapToLeader: gapAt(bundle.intervals[key], time)?.gap_to_leader ?? null,
      speed: telem && i >= 0 ? telem.speed[i] ?? null : null,
    };
  }, [bundle, dn, time, telem]);
}

function gapBetween(a: CarState, b: CarState): string {
  if (typeof a.gapToLeader === "number" && typeof b.gapToLeader === "number") {
    return `${Math.abs(a.gapToLeader - b.gapToLeader).toFixed(3)}s`;
  }
  return "—";
}

export default function HeadToHead({
  bundle,
  time,
  driverA,
}: {
  bundle: ReplayBundle;
  time: number;
  driverA: number | null;
}) {
  const [driverB, setDriverB] = useState<number | null>(null);

  // Default B to whoever's running second (or first if A is leading).
  useEffect(() => {
    if (driverB == null && driverA != null) {
      const order = runningOrder(bundle, time);
      const other = order.find((e) => e.driver_number !== driverA);
      if (other) setDriverB(other.driver_number);
    }
  }, [driverA, driverB, bundle, time]);

  const a = useCarState(bundle, driverA, time);
  const b = useCarState(bundle, driverB, time);

  return (
    <div className="card">
      <div className="card-header">HEAD TO HEAD</div>
      {!a ? (
        <p className="muted">Select a driver (track or tower) to compare.</p>
      ) : (
        <div className="h2h">
          <div className="h2h-cols">
            <div className="h2h-col" style={{ borderColor: a.driver.team_colour }}>
              <DriverAvatar driver={a.driver} size={36} />
              <div className="h2h-code">{a.driver.name_acronym}</div>
              <div className="h2h-team">{a.driver.team_name}</div>
            </div>
            <div className="h2h-vs">VS</div>
            <div className="h2h-col" style={{ borderColor: b?.driver.team_colour ?? "#444" }}>
              {b && <DriverAvatar driver={b.driver} size={36} />}
              <select
                className="h2h-select"
                value={driverB ?? ""}
                onChange={(e) => setDriverB(Number(e.target.value))}
              >
                {bundle.drivers
                  .filter((d) => d.driver_number !== driverA)
                  .map((d) => (
                    <option key={d.driver_number} value={d.driver_number}>
                      {d.name_acronym} — {d.team_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {b && (
            <table className="h2h-table">
              <tbody>
                <tr>
                  <td className="h2h-a">P{a.position}</td>
                  <th>Position</th>
                  <td className="h2h-b">P{b.position}</td>
                </tr>
                <tr>
                  <td className="h2h-a">
                    <span className={`tyre-dot tyre-${a.tyre ?? "unknown"}`}>{tyreShort(a.tyre)}</span>
                  </td>
                  <th>Tyre</th>
                  <td className="h2h-b">
                    <span className={`tyre-dot tyre-${b.tyre ?? "unknown"}`}>{tyreShort(b.tyre)}</span>
                  </td>
                </tr>
                <tr>
                  <td className="h2h-a">{a.speed ?? "—"}</td>
                  <th>Speed (km/h)</th>
                  <td className="h2h-b">{b.speed ?? "—"}</td>
                </tr>
                <tr className="h2h-gap-row">
                  <td colSpan={3}>
                    Interval: <strong>{gapBetween(a, b)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
