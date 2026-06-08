import { useMemo } from "react";
import type { LapInfo, ReplayBundle } from "../../types";
import { computeSectorBests, formatLapTime, lastCompletedLap } from "./replayUtils";

const EPS = 0.0005;

/** F1 sector coloring: purple = session best overall, green = personal best, else yellow. */
function sectorClass(value: number | null, personalBest: number, overallBest: number): string {
  if (value == null) return "sec-none";
  if (value <= overallBest + EPS) return "sec-purple";
  if (value <= personalBest + EPS) return "sec-green";
  return "sec-yellow";
}

export default function SectorDeltas({
  bundle,
  time,
  driverA,
}: {
  bundle: ReplayBundle;
  time: number;
  driverA: number | null;
}) {
  const bests = useMemo(() => computeSectorBests(bundle), [bundle]);

  if (driverA == null)
    return (
      <div className="card">
        <div className="card-header">SECTOR TIMES</div>
        <p className="muted">Select a driver to see sector times vs personal &amp; session best.</p>
      </div>
    );

  const driver = bundle.drivers.find((d) => d.driver_number === driverA)!;
  const lap: LapInfo | null = lastCompletedLap(bundle.laps[String(driverA)], time);
  const pb = bests.byDriver[driverA] ?? { s1: Infinity, s2: Infinity, s3: Infinity };

  const sectors = [
    { label: "S1", value: lap?.s1 ?? null, pb: pb.s1, ob: bests.overall.s1, trap: lap?.i1 ?? null },
    { label: "S2", value: lap?.s2 ?? null, pb: pb.s2, ob: bests.overall.s2, trap: lap?.i2 ?? null },
    { label: "S3", value: lap?.s3 ?? null, pb: pb.s3, ob: bests.overall.s3, trap: lap?.st ?? null },
  ];

  return (
    <div className="card">
      <div className="card-header" style={{ borderLeftColor: driver.team_colour }}>
        {driver.name_acronym} · SECTORS {lap ? `· LAP ${lap.lap}` : ""}
      </div>
      {!lap ? (
        <p className="muted">No completed lap yet at this point in the race.</p>
      ) : (
        <>
          <div className="sector-grid">
            {sectors.map((s) => (
              <div className="sector-cell" key={s.label}>
                <div className="telem-label">{s.label}</div>
                <div className={`sector-time ${sectorClass(s.value, s.pb, s.ob)}`}>
                  {formatLapTime(s.value)}
                </div>
                <div className="sector-trap">{s.trap != null ? `${s.trap} km/h` : ""}</div>
              </div>
            ))}
          </div>
          <div className="sector-laptime">
            Lap Time <strong>{formatLapTime(lap.dur)}</strong>
          </div>
          <div className="sector-legend">
            <span className="sec-purple">■</span> Session best
            <span className="sec-green">■</span> Personal best
            <span className="sec-yellow">■</span> Slower
          </div>
        </>
      )}
    </div>
  );
}
