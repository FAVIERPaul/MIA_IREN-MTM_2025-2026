import { formatClock } from "../../f1utils";

const SPEEDS = [1, 2, 5, 10];

export default function Controls({
  playing,
  toggle,
  displayTime,
  t0,
  t1,
  speed,
  setSpeed,
  seek,
}: {
  playing: boolean;
  toggle: () => void;
  displayTime: number;
  t0: number;
  t1: number;
  speed: number;
  setSpeed: (s: number) => void;
  seek: (t: number) => void;
}) {
  const elapsed = displayTime - t0;
  const total = t1 - t0;

  return (
    <div className="controls">
      <button className="ctrl-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
        {playing ? "❚❚" : "▶"}
      </button>
      <span style={{ fontFamily: "Orbitron", fontSize: "0.9rem", minWidth: 64 }}>{formatClock(elapsed)}</span>
      <input
        className="scrubber"
        type="range"
        min={t0}
        max={t1}
        step={100}
        value={displayTime}
        onChange={(e) => seek(Number(e.target.value))}
      />
      <span style={{ fontFamily: "Orbitron", fontSize: "0.9rem", minWidth: 64, color: "var(--f1-light-gray)" }}>
        {formatClock(total)}
      </span>
      <div className="speed-group">
        {SPEEDS.map((s) => (
          <button key={s} className={`speed-btn ${speed === s ? "active" : ""}`} onClick={() => setSpeed(s)}>
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
