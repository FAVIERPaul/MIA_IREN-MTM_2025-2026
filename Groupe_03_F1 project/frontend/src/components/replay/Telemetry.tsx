import type { ReplayDriver } from "../../types";
import { useTelemetry, telemetryIndex } from "./useTelemetry";
import DriverAvatar from "./DriverAvatar";
import { flagCode } from "../../flags";

const DRS_ON = new Set([10, 12, 14]);

export default function Telemetry({
  sessionKey,
  driver,
  time,
}: {
  sessionKey: number;
  driver: ReplayDriver | null;
  time: number;
}) {
  const { data: telem, loading, error } = useTelemetry(sessionKey, driver?.driver_number ?? null);

  if (!driver)
    return (
      <div className="card">
        <div className="card-header">TELEMETRY</div>
        <p className="muted">Select a car on the track or timing tower to see its telemetry.</p>
      </div>
    );

  const i = telem ? telemetryIndex(telem.t, time) : -1;
  const v = (arr: (number | null)[] | undefined) => (telem && i >= 0 ? arr?.[i] ?? null : null);
  const speed = v(telem?.speed);
  const throttle = v(telem?.throttle);
  const brake = v(telem?.brake);
  const gear = v(telem?.n_gear);
  const rpm = v(telem?.rpm);
  const drs = v(telem?.drs);
  const drsOn = drs != null && DRS_ON.has(drs);

  return (
    <div className="card">
      <div className="card-header" style={{ borderLeftColor: driver.team_colour, gap: 8 }}>
        <DriverAvatar driver={driver} size={22} />
        {flagCode(driver.country_code) && <span className={`fi fi-${flagCode(driver.country_code)} tower-flag`} />}
        {driver.name_acronym} · {driver.team_name}
      </div>
      {loading && <p className="muted">Loading telemetry…</p>}
      {error && <p className="error-box">⚠ {error}</p>}
      {telem && (
        <>
          <div className="telemetry-readout">
            <div className="telem-cell">
              <div className="telem-label">Speed</div>
              <div className="telem-value">
                {speed ?? "—"}
                <span style={{ fontSize: "0.7rem" }}> km/h</span>
              </div>
            </div>
            <div className="telem-cell">
              <div className="telem-label">Gear</div>
              <div className="telem-value">{gear ?? "—"}</div>
            </div>
            <div className="telem-cell">
              <div className="telem-label">RPM</div>
              <div className="telem-value" style={{ fontSize: "1.1rem" }}>
                {rpm ?? "—"}
              </div>
            </div>
          </div>
          <div style={{ padding: "0 20px 16px" }}>
            <div className="telem-label">Throttle</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${throttle ?? 0}%`, background: "#1db954" }} />
            </div>
            <div className="telem-label" style={{ marginTop: 10 }}>
              Brake
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${brake ?? 0}%`, background: "var(--f1-red)" }} />
            </div>
            <div style={{ marginTop: 12, fontFamily: "Orbitron", fontSize: "0.9rem" }}>
              DRS <span className={drsOn ? "drs-on" : "drs-off"}>{drsOn ? "● OPEN" : "○ CLOSED"}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
