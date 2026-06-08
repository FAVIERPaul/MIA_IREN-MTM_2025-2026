import type { ReplayBundle } from "../../types";
import { weatherAt } from "./replayUtils";

export default function WeatherPanel({ bundle, time }: { bundle: ReplayBundle; time: number }) {
  const w = weatherAt(bundle.weather, time);

  if (!w)
    return (
      <div className="card">
        <div className="card-header">WEATHER</div>
        <p className="muted">No weather data for this session.</p>
      </div>
    );

  const wet = (w.rainfall ?? 0) > 0;
  const num = (v: number | null, suffix = "") => (v == null ? "—" : `${v}${suffix}`);

  return (
    <div className="card">
      <div className="card-header">WEATHER · TRACK CONDITIONS</div>
      <div className="weather-grid">
        <div className="weather-cell">
          <div className="telem-label">Track Temp</div>
          <div className="weather-value" style={{ color: "var(--f1-red)" }}>{num(w.track, "°")}</div>
        </div>
        <div className="weather-cell">
          <div className="telem-label">Air Temp</div>
          <div className="weather-value">{num(w.air, "°")}</div>
        </div>
        <div className="weather-cell">
          <div className="telem-label">Humidity</div>
          <div className="weather-value">{num(w.humidity, "%")}</div>
        </div>
        <div className="weather-cell">
          <div className="telem-label">Wind</div>
          <div className="weather-value" style={{ fontSize: "1.1rem" }}>
            {num(w.wind_speed, " m/s")}
            {w.wind_dir != null && (
              <span
                className="wind-arrow"
                style={{ transform: `rotate(${w.wind_dir}deg)` }}
                title={`${w.wind_dir}°`}
              >
                ↑
              </span>
            )}
          </div>
        </div>
        <div className="weather-cell">
          <div className="telem-label">Pressure</div>
          <div className="weather-value" style={{ fontSize: "1.1rem" }}>{num(w.pressure, "")}</div>
        </div>
        <div className="weather-cell">
          <div className="telem-label">Condition</div>
          <div className="weather-value" style={{ fontSize: "1.1rem", color: wet ? "#3671c6" : "var(--f1-white)" }}>
            {wet ? "WET" : "DRY"}
          </div>
        </div>
      </div>
    </div>
  );
}
