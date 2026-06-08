import { useEffect, useMemo, useRef, useState } from "react";
import type { ReplayBundle } from "../../types";
import { formatClock } from "../../f1utils";

// Auto-play only at normal-ish speed; above this, clips would overlap into noise.
const MAX_LIVE_SPEED = 2;
// A time jump larger than this between ticks = a seek, not normal playback.
const SEEK_THRESHOLD_MS = 2000;

export default function TeamRadio({
  bundle,
  time,
  playing,
  speed,
}: {
  bundle: ReplayBundle;
  time: number;
  playing: boolean;
  speed: number;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const liveRowRef = useRef<HTMLButtonElement>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [liveEnabled, setLiveEnabled] = useState(true);

  // Tracks how far the playhead has advanced so we only fire newly-crossed clips.
  const prevTimeRef = useRef(time);
  const firedUntilRef = useRef(time);

  const driverByNum = useMemo(
    () => Object.fromEntries(bundle.drivers.map((d) => [d.driver_number, d])),
    [bundle]
  );

  // Index of the most recent clip at or before the playhead — marked "live".
  const liveIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < bundle.team_radio.length; i++) {
      if (bundle.team_radio[i].t <= time) idx = i;
      else break;
    }
    return idx;
  }, [bundle, time]);

  const play = (url: string) => {
    if (!audioRef.current) return;
    audioRef.current.src = url;
    audioRef.current.play().catch(() => {});
    setPlayingUrl(url);
  };

  // Live playback: fire clips as the clock crosses them during normal playback.
  useEffect(() => {
    const prev = prevTimeRef.current;
    prevTimeRef.current = time;
    const dt = time - prev;

    // Seek, rewind, pause, fast-forward, or live off → just resync the pointer.
    if (!liveEnabled || !playing || dt < 0 || dt > SEEK_THRESHOLD_MS || speed > MAX_LIVE_SPEED) {
      firedUntilRef.current = time;
      return;
    }

    const crossed = bundle.team_radio.filter((c) => c.t > firedUntilRef.current && c.t <= time);
    firedUntilRef.current = time;
    if (crossed.length) play(crossed[crossed.length - 1].url); // most recent crossed clip
  }, [time, playing, speed, liveEnabled, bundle]);

  // Keep the live clip in view in the feed.
  useEffect(() => {
    if (liveEnabled && liveRowRef.current) {
      liveRowRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [liveIdx, liveEnabled]);

  if (!bundle.team_radio.length)
    return (
      <div className="card">
        <div className="card-header">TEAM RADIO</div>
        <p className="muted">No team radio for this session.</p>
      </div>
    );

  return (
    <div className="card">
      <div className="card-header" style={{ justifyContent: "space-between" }}>
        <span>TEAM RADIO</span>
        <button
          className={`live-toggle ${liveEnabled ? "on" : ""}`}
          onClick={() => setLiveEnabled((v) => !v)}
          title="Auto-play radio as the race reaches each message"
        >
          LIVE
        </button>
      </div>
      <audio ref={audioRef} onEnded={() => setPlayingUrl(null)} />
      <div className="radio-feed" ref={feedRef}>
        {bundle.team_radio.map((clip, i) => {
          const d = driverByNum[clip.driver_number];
          const isPlaying = playingUrl === clip.url;
          const isLive = i === liveIdx;
          return (
            <button
              key={clip.url}
              ref={isLive ? liveRowRef : undefined}
              className={`radio-row ${isLive ? "live" : ""} ${isPlaying ? "playing" : ""}`}
              onClick={() => play(clip.url)}
            >
              <span className="radio-bar" style={{ background: d?.team_colour ?? "#888" }} />
              <span className="radio-code">{d?.name_acronym ?? clip.driver_number}</span>
              <span className="radio-time">{formatClock(clip.t - bundle.t0)}</span>
              <span className="radio-play">{isPlaying ? "❚❚" : "▶"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
