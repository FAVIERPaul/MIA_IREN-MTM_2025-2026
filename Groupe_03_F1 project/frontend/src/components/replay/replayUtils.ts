import type { IntervalEvent, LapInfo, ReplayBundle, Stint, WeatherSample, XYTrack } from "../../types";

/** Index of the last element with time <= t (via the provided accessor), or -1. */
function lastIndexBefore(arr: { length: number }, t: number, timeAt: (i: number) => number): number {
  let lo = 0;
  let hi = arr.length - 1;
  let res = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timeAt(mid) <= t) {
      res = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return res;
}

/** Interpolated car position at time t, or null if outside the data window. */
export function interpXY(track: XYTrack | undefined, t: number): { x: number; y: number } | null {
  if (!track || track.t.length === 0) return null;
  const { t: ts, x, y } = track;
  if (t <= ts[0]) return { x: x[0], y: y[0] };
  const n = ts.length;
  if (t >= ts[n - 1]) return { x: x[n - 1], y: y[n - 1] };
  const i = lastIndexBefore(ts, t, (k) => ts[k]);
  const t0 = ts[i];
  const t1 = ts[i + 1];
  const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
  return { x: x[i] + (x[i + 1] - x[i]) * f, y: y[i] + (y[i + 1] - y[i]) * f };
}

export interface RunningEntry {
  driver_number: number;
  position: number;
}

/** Running order at time t, derived from the position step-series. */
export function runningOrder(bundle: ReplayBundle, t: number): RunningEntry[] {
  const entries: RunningEntry[] = [];
  for (const d of bundle.drivers) {
    const series = bundle.order[String(d.driver_number)];
    let pos = 99;
    if (series && series.length) {
      const i = lastIndexBefore(series, t, (k) => series[k].t);
      pos = i >= 0 ? series[i].position : series[0].position;
    }
    entries.push({ driver_number: d.driver_number, position: pos });
  }
  entries.sort((a, b) => a.position - b.position);
  return entries;
}

export function gapAt(intervals: IntervalEvent[] | undefined, t: number): IntervalEvent | null {
  if (!intervals || !intervals.length) return null;
  const i = lastIndexBefore(intervals, t, (k) => intervals[k].t);
  return i >= 0 ? intervals[i] : null;
}

export function currentLap(laps: LapInfo[] | undefined, t: number): number | null {
  if (!laps || !laps.length) return null;
  const i = lastIndexBefore(laps, t, (k) => laps[k].t);
  return i >= 0 ? laps[i].lap : 1;
}

/** Most recent fully-completed lap (start + duration <= t), for sector display. */
export function lastCompletedLap(laps: LapInfo[] | undefined, t: number): LapInfo | null {
  if (!laps || !laps.length) return null;
  let res: LapInfo | null = null;
  for (const lap of laps) {
    const end = lap.t + (lap.dur ?? 0) * 1000;
    if (lap.dur != null && end <= t) res = lap;
    else if (lap.t > t) break;
  }
  return res;
}

export interface SectorBests {
  overall: { s1: number; s2: number; s3: number };
  byDriver: Record<number, { s1: number; s2: number; s3: number }>;
}

/** Session-best sector times overall and per driver (for purple/green coloring). */
export function computeSectorBests(bundle: ReplayBundle): SectorBests {
  const overall = { s1: Infinity, s2: Infinity, s3: Infinity };
  const byDriver: Record<number, { s1: number; s2: number; s3: number }> = {};
  for (const dn of Object.keys(bundle.laps)) {
    const best = { s1: Infinity, s2: Infinity, s3: Infinity };
    for (const lap of bundle.laps[dn]) {
      (["s1", "s2", "s3"] as const).forEach((s) => {
        const v = lap[s];
        if (v != null && v > 0) {
          if (v < best[s]) best[s] = v;
          if (v < overall[s]) overall[s] = v;
        }
      });
    }
    byDriver[Number(dn)] = best;
  }
  return { overall, byDriver };
}

export function weatherAt(weather: WeatherSample[], t: number): WeatherSample | null {
  if (!weather.length) return null;
  const i = lastIndexBefore(weather, t, (k) => weather[k].t);
  return i >= 0 ? weather[i] : weather[0];
}

export function formatLapTime(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toFixed(3).padStart(6, "0")}` : s.toFixed(3);
}

export function compoundForLap(stints: Stint[] | undefined, lap: number | null): string | null {
  if (!stints || lap == null) return null;
  for (const s of stints) {
    if (s.lap_start != null && s.lap_end != null && lap >= s.lap_start && lap <= s.lap_end) {
      return s.compound ?? null;
    }
  }
  return stints[stints.length - 1]?.compound ?? null;
}

export function tyreShort(compound: string | null): string {
  if (!compound) return "?";
  return compound[0].toUpperCase();
}

/** Active flag at time t from race_control (green/yellow/red/safety car/chequered). */
export function activeFlag(bundle: ReplayBundle, t: number): { kind: string; label: string } {
  let kind = "green";
  let label = "GREEN";
  for (const m of bundle.race_control) {
    if (m.t > t) break;
    const flag = (m.flag || "").toUpperCase();
    const cat = (m.category || "").toUpperCase();
    const msg = (m.message || "").toUpperCase();
    if (cat === "SAFETYCAR" || msg.includes("SAFETY CAR")) {
      kind = msg.includes("ENDING") || msg.includes("IN THIS LAP") ? "green" : "sc";
      label = kind === "sc" ? "SAFETY CAR" : "GREEN";
    } else if (flag === "RED") {
      kind = "red";
      label = "RED FLAG";
    } else if (flag === "YELLOW" || flag === "DOUBLE YELLOW") {
      kind = "yellow";
      label = "YELLOW";
    } else if (flag === "GREEN" || flag === "CLEAR") {
      kind = "green";
      label = "GREEN";
    } else if (flag === "CHEQUERED") {
      kind = "chequered";
      label = "CHEQUERED";
    }
  }
  return { kind, label };
}
