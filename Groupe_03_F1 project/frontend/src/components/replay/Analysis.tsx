import { useMemo } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { ReplayBundle } from "../../types";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const COMPOUND_COLOR: Record<string, string> = {
  SOFT: "#e10600",
  MEDIUM: "#ffd700",
  HARD: "#d8d8d8",
  INTERMEDIATE: "#1db954",
  WET: "#3671c6",
};
const compoundColor = (c: string | null) => (c && COMPOUND_COLOR[c]) || "#555";

/** Last value in a time-sorted series at or before t. */
function valueBefore<T extends { t: number }>(series: T[] | undefined, t: number): T | null {
  if (!series || !series.length) return null;
  let lo = 0;
  let hi = series.length - 1;
  let res = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].t <= t) {
      res = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return res >= 0 ? series[res] : null;
}

const NO_POINTS = { pointRadius: 0, pointHoverRadius: 4, borderWidth: 1.5, tension: 0.25 };

const baseOptions = (yLabel: string, reverse = false) =>
  ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest" as const, intersect: false },
    plugins: {
      legend: { labels: { boxWidth: 10, font: { family: "Roboto", size: 10 }, padding: 8 } },
      tooltip: { callbacks: { title: (items: { label: string }[]) => `Lap ${items[0].label}` } },
    },
    scales: {
      x: { title: { display: true, text: "Lap" }, grid: { color: "rgba(255,255,255,0.04)" }, ticks: { maxTicksLimit: 12, font: { size: 9 } } },
      y: {
        reverse,
        title: { display: true, text: yLabel },
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: { font: { size: 9 } },
      },
    },
  }) as const;

export default function Analysis({ bundle }: { bundle: ReplayBundle }) {
  const labels = useMemo(
    () => Array.from({ length: bundle.total_laps }, (_, i) => i + 1),
    [bundle.total_laps]
  );

  // Per-driver value arrays aligned to lap labels (null where missing).
  const { positionData, lapTimeData, gapData } = useMemo(() => {
    const allDurs: number[] = [];
    for (const dn of Object.keys(bundle.laps))
      for (const l of bundle.laps[dn]) if (l.dur && !l.pit_out) allDurs.push(l.dur);
    allDurs.sort((a, b) => a - b);
    const median = allDurs[Math.floor(allDurs.length / 2)] ?? 0;
    const lapCap = median * 2; // hide pit/SC spikes that wreck the y-axis

    const position = [];
    const lapTime = [];
    const gap = [];
    for (const d of bundle.drivers) {
      const dn = String(d.driver_number);
      const laps = bundle.laps[dn] ?? [];
      const order = bundle.order[dn];
      const intervals = bundle.intervals[dn];
      const lapByNum = new Map(laps.map((l) => [l.lap, l]));

      const posArr = labels.map((lap) => valueBefore(order, lapByNum.get(lap)?.t ?? -1)?.position ?? null);
      const ltArr = labels.map((lap) => {
        const l = lapByNum.get(lap);
        if (!l || !l.dur || l.pit_out || (lapCap && l.dur > lapCap)) return null;
        return l.dur;
      });
      const gapArr = labels.map((lap) => {
        const g = valueBefore(intervals, lapByNum.get(lap)?.t ?? -1)?.gap_to_leader;
        return typeof g === "number" ? g : null;
      });

      const ds = (data: (number | null)[]) => ({
        label: d.name_acronym ?? String(d.driver_number),
        data,
        borderColor: d.team_colour,
        backgroundColor: d.team_colour,
        spanGaps: true,
        ...NO_POINTS,
      });
      position.push(ds(posArr));
      lapTime.push(ds(ltArr));
      gap.push(ds(gapArr));
    }
    return { positionData: position, lapTimeData: lapTime, gapData: gap };
  }, [bundle, labels]);

  return (
    <div className="analysis-view">
      <div className="card">
        <div className="card-header">POSITION BATTLE</div>
        <div className="chart-container" style={{ height: 380 }}>
          <Line data={{ labels, datasets: positionData }} options={baseOptions("Position", true)} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">LAP TIME EVOLUTION</div>
          <div className="chart-container" style={{ height: 320 }}>
            <Line data={{ labels, datasets: lapTimeData }} options={baseOptions("Lap time (s)")} />
          </div>
        </div>
        <div className="card">
          <div className="card-header">GAP TO LEADER</div>
          <div className="chart-container" style={{ height: 320 }}>
            <Line data={{ labels, datasets: gapData }} options={baseOptions("Gap (s)")} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">TYRE STRATEGY</div>
        <div className="gantt">
          {bundle.drivers.map((d) => {
            const stints = (bundle.stints[String(d.driver_number)] ?? [])
              .slice()
              .sort((a, b) => (a.stint_number ?? 0) - (b.stint_number ?? 0));
            return (
              <div className="gantt-row" key={d.driver_number}>
                <span className="gantt-code" style={{ borderLeft: `3px solid ${d.team_colour}` }}>
                  {d.name_acronym ?? d.driver_number}
                </span>
                <div className="gantt-track">
                  {stints.map((s, i) => {
                    const len = (s.lap_end ?? 0) - (s.lap_start ?? 0) + 1;
                    return (
                      <div
                        key={i}
                        className="gantt-seg"
                        style={{ flexGrow: len > 0 ? len : 1, background: compoundColor(s.compound), color: s.compound === "MEDIUM" || s.compound === "HARD" ? "#000" : "#fff" }}
                        title={`${s.compound ?? "?"} · laps ${s.lap_start}-${s.lap_end}`}
                      >
                        {len > 2 ? (s.compound?.[0] ?? "?") : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
