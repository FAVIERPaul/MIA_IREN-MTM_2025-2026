import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Replay clock. The authoritative playhead (`timeRef`) is advanced by a single
 * rAF loop so the track canvas can animate at 60fps off the ref without forcing
 * React re-renders. UI widgets (tower, telemetry, scrubber) read `displayTime`,
 * which is updated at ~12Hz — plenty for numbers, cheap for React.
 */
export function useReplayClock(t0: number, t1: number) {
  const timeRef = useRef(t0);
  const [displayTime, setDisplayTime] = useState(t0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const speedRef = useRef(speed);
  const playingRef = useRef(playing);
  speedRef.current = speed;
  playingRef.current = playing;

  // Reset when the loaded race changes.
  useEffect(() => {
    timeRef.current = t0;
    setDisplayTime(t0);
    setPlaying(false);
  }, [t0, t1]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastDisplay = 0;

    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      if (playingRef.current) {
        timeRef.current = Math.min(t1, timeRef.current + dt * speedRef.current);
        if (timeRef.current >= t1) setPlaying(false);
      }
      // Throttle the React-facing time to ~12Hz.
      if (now - lastDisplay > 80) {
        lastDisplay = now;
        setDisplayTime(timeRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [t0, t1]);

  const seek = useCallback((t: number) => {
    timeRef.current = t;
    setDisplayTime(t);
  }, []);

  const toggle = useCallback(() => {
    // Restart from the top if we're parked at the flag.
    if (timeRef.current >= t1) {
      timeRef.current = t0;
      setDisplayTime(t0);
    }
    setPlaying((p) => !p);
  }, [t0, t1]);

  return { timeRef, displayTime, playing, speed, setSpeed, seek, toggle };
}
