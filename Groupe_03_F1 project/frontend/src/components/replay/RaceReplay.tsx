import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { getReplayBundle, getReplaySessions } from "../../api";
import type { ReplayBundle, SessionInfo } from "../../types";
import { formatClock } from "../../f1utils";
import { Loading, ErrorBox } from "../common";
import { useReplayClock } from "./useReplayClock";
import TrackMap from "./TrackMap";
import TimingTower from "./TimingTower";
import Telemetry from "./Telemetry";
import Controls from "./Controls";
import RaceHeader from "./RaceHeader";
import WeatherPanel from "./WeatherPanel";
import TeamRadio from "./TeamRadio";
import HeadToHead from "./HeadToHead";
import SectorDeltas from "./SectorDeltas";
import Analysis from "./Analysis";

// Three.js is heavy (~600 KB) — only loaded when the 3D track is shown.
const TrackMap3D = lazy(() => import("./TrackMap3D"));

export default function RaceReplay({ year }: { year: number }) {
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<number | null>(null);

  const [bundle, setBundle] = useState<ReplayBundle | null>(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [view3D, setView3D] = useState(true);
  const [mode, setMode] = useState<"live" | "analysis">("live");

  // Load the race list for the season.
  useEffect(() => {
    let cancelled = false;
    setSessions(null);
    setSessionsError(null);
    setSessionKey(null);
    setBundle(null);
    getReplaySessions(year)
      .then((s) => {
        if (cancelled) return;
        setSessions(s);
        if (s.length) setSessionKey(s[0].session_key);
      })
      .catch((e) => !cancelled && setSessionsError(e.message));
    return () => {
      cancelled = true;
    };
  }, [year]);

  // Load the heavy replay bundle for the chosen race.
  useEffect(() => {
    if (sessionKey == null) return;
    let cancelled = false;
    setBundleLoading(true);
    setBundleError(null);
    setBundle(null);
    setSelectedDriver(null);
    getReplayBundle(sessionKey)
      .then((b) => !cancelled && setBundle(b))
      .catch((e) => !cancelled && setBundleError(e.message))
      .finally(() => !cancelled && setBundleLoading(false));
    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  const clock = useReplayClock(bundle?.t0 ?? 0, bundle?.t1 ?? 0);
  const selectedMeta = useMemo(
    () => bundle?.drivers.find((d) => d.driver_number === selectedDriver) ?? null,
    [bundle, selectedDriver]
  );
  const t = clock.displayTime;

  return (
    <>
      <div className="replay-toolbar">
        <span className="season-select-label">Race</span>
        <select
          className="replay-select"
          value={sessionKey ?? ""}
          disabled={!sessions || !sessions.length}
          onChange={(e) => setSessionKey(Number(e.target.value))}
        >
          {sessions?.map((s) => (
            <option key={s.session_key} value={s.session_key}>
              {s.country_name ?? s.location} — {s.circuit_short_name ?? ""}
            </option>
          ))}
        </select>
        {bundle && (
          <span className="season-select-label">
            {bundle.drivers.length} cars · {bundle.total_laps} laps · {formatClock(bundle.t1 - bundle.t0)} replay
          </span>
        )}
        {bundle && (
          <div className="seg-control">
            <button className={mode === "live" ? "active" : ""} onClick={() => setMode("live")}>
              LIVE REPLAY
            </button>
            <button className={mode === "analysis" ? "active" : ""} onClick={() => setMode("analysis")}>
              ANALYSIS
            </button>
          </div>
        )}
      </div>

      {sessionsError && <ErrorBox message={sessionsError} />}
      {!sessions && !sessionsError && <Loading label={`Loading ${year} race calendar…`} />}
      {sessions && !sessions.length && <p className="muted">No race sessions found for {year}.</p>}

      {bundleLoading && (
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header">BUILDING RACE REPLAY</div>
          <div className="track-loader">
            <div className="loading-spinner" />
            <div className="track-loader-title">Fetching &amp; caching telemetry from OpenF1…</div>
            <div className="track-loader-sub">
              First load of a race pulls ~1M data points and decimates them (~10–20s). Instant on
              every load after — it's cached.
            </div>
          </div>
        </div>
      )}
      {bundleError && <ErrorBox message={bundleError} />}

      {bundle && !bundleLoading && mode === "analysis" && <Analysis bundle={bundle} />}

      {bundle && !bundleLoading && mode === "live" && (
        <div className="pitwall">
          <div className="pw-tower">
            <TimingTower bundle={bundle} time={t} selectedDriver={selectedDriver} onSelect={setSelectedDriver} />
          </div>

          <div className="pw-track">
            <RaceHeader bundle={bundle} time={t} />
            <div className="card">
              <div className="track-stage">
                {view3D ? (
                  <Suspense
                    fallback={
                      <div className="track-wrap" style={{ display: "grid", placeItems: "center" }}>
                        <div className="loading-spinner" />
                      </div>
                    }
                  >
                    <TrackMap3D
                      bundle={bundle}
                      timeRef={clock.timeRef}
                      selectedDriver={selectedDriver}
                      onSelect={setSelectedDriver}
                    />
                  </Suspense>
                ) : (
                  <TrackMap
                    bundle={bundle}
                    timeRef={clock.timeRef}
                    selectedDriver={selectedDriver}
                    onSelect={setSelectedDriver}
                  />
                )}
                <div className="track-clock">{formatClock(t - bundle.t0)}</div>
                <button className="view-toggle" onClick={() => setView3D((v) => !v)}>
                  {view3D ? "3D" : "2D"}
                </button>
              </div>
            </div>
          </div>

          <div className="pw-rail">
            <WeatherPanel bundle={bundle} time={t} />
            <TeamRadio bundle={bundle} time={t} playing={clock.playing} speed={clock.speed} />
          </div>

          <div className="pw-detail">
            <Telemetry sessionKey={bundle.session.session_key} driver={selectedMeta} time={t} />
            <HeadToHead bundle={bundle} time={t} driverA={selectedDriver} />
            <SectorDeltas bundle={bundle} time={t} driverA={selectedDriver} />
          </div>

          <div className="pw-transport">
            <div className="card">
              <Controls
                playing={clock.playing}
                toggle={clock.toggle}
                displayTime={t}
                t0={bundle.t0}
                t1={bundle.t1}
                speed={clock.speed}
                setSpeed={clock.setSpeed}
                seek={clock.seek}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
