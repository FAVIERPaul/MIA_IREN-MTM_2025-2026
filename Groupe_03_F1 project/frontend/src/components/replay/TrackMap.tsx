import { useEffect, useMemo, useRef } from "react";
import type { ReplayBundle } from "../../types";
import { activeFlag, interpXY } from "./replayUtils";

const FLAG_TINT: Record<string, string | null> = {
  green: null,
  chequered: null,
  yellow: "#ffd700",
  sc: "#ffd700",
  red: "#e10600",
};

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function computeBounds(bundle: ReplayBundle): Bounds {
  const b: Bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  const consume = (x: number, y: number) => {
    if (x < b.minX) b.minX = x;
    if (x > b.maxX) b.maxX = x;
    if (y < b.minY) b.minY = y;
    if (y > b.maxY) b.maxY = y;
  };
  if (bundle.track.length) {
    for (const [x, y] of bundle.track) consume(x, y);
  } else {
    // Fallback: scan a sample of location points.
    for (const dn of Object.keys(bundle.positions)) {
      const p = bundle.positions[dn];
      for (let i = 0; i < p.x.length; i += 20) consume(p.x[i], p.y[i]);
    }
  }
  return b;
}

export default function TrackMap({
  bundle,
  timeRef,
  selectedDriver,
  onSelect,
}: {
  bundle: ReplayBundle;
  timeRef: React.MutableRefObject<number>;
  selectedDriver: number | null;
  onSelect: (dn: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bounds = useMemo(() => computeBounds(bundle), [bundle]);
  const selectedRef = useRef(selectedDriver);
  selectedRef.current = selectedDriver;

  // Clickable hit targets recomputed each frame for driver selection.
  const hitsRef = useRef<{ dn: number; px: number; py: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const container = containerRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let cw = 0;
    let ch = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      cw = container.clientWidth;
      ch = container.clientHeight;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const project = (x: number, y: number): [number, number] => {
      const pad = 36;
      const W = bounds.maxX - bounds.minX || 1;
      const H = bounds.maxY - bounds.minY || 1;
      const scale = Math.min((cw - 2 * pad) / W, (ch - 2 * pad) / H);
      const ox = pad + (cw - 2 * pad - W * scale) / 2;
      const oy = pad + (ch - 2 * pad - H * scale) / 2;
      // Flip Y: world up -> canvas down.
      return [ox + (x - bounds.minX) * scale, oy + (bounds.maxY - y) * scale];
    };

    let flagTint: string | null = null;

    const drawTrack = () => {
      const pts = bundle.track;
      if (pts.length < 3) return;
      const P = pts.map(([x, y]) => project(x, y));

      // Smooth closed loop through the points (quadratic curve via midpoints).
      const tracePath = () => {
        ctx.beginPath();
        const last = P[P.length - 1];
        ctx.moveTo((last[0] + P[0][0]) / 2, (last[1] + P[0][1]) / 2);
        for (let i = 0; i < P.length; i++) {
          const cur = P[i];
          const nxt = P[(i + 1) % P.length];
          ctx.quadraticCurveTo(cur[0], cur[1], (cur[0] + nxt[0]) / 2, (cur[1] + nxt[1]) / 2);
        }
        ctx.closePath();
      };

      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // 1) Depth shadow — offset + blur gives the ribbon a raised, 3D feel.
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
      tracePath();
      ctx.strokeStyle = "#0b0b0b";
      ctx.lineWidth = 22;
      ctx.stroke();
      ctx.restore();

      // 2) Asphalt ribbon (dark base -> mid grey).
      tracePath();
      ctx.strokeStyle = "#262626";
      ctx.lineWidth = 17;
      ctx.stroke();
      tracePath();
      ctx.strokeStyle = "#3c3c3c";
      ctx.lineWidth = 11;
      ctx.stroke();

      // 3) Top bevel highlight.
      tracePath();
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Flag tint (yellow / safety car / red) — pulses over the asphalt.
      if (flagTint) {
        tracePath();
        ctx.strokeStyle = flagTint;
        ctx.globalAlpha = 0.3 + 0.25 * (0.5 + 0.5 * Math.sin(Date.now() / 250));
        ctx.lineWidth = 12;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // 4) Start/finish — red tick perpendicular to the track direction.
      const [ax, ay] = P[0];
      const [bx, by] = P[1];
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const L = 11;
      ctx.beginPath();
      ctx.moveTo(ax - nx * L, ay - ny * L);
      ctx.lineTo(ax + nx * L, ay + ny * L);
      ctx.strokeStyle = "#e10600";
      ctx.lineWidth = 3;
      ctx.stroke();
    };

    const loop = () => {
      const t = timeRef.current;
      flagTint = FLAG_TINT[activeFlag(bundle, t).kind] ?? null;
      ctx.clearRect(0, 0, cw, ch);
      drawTrack();

      const hits: { dn: number; px: number; py: number }[] = [];
      // Draw non-selected first, selected last (on top).
      const ordered = [...bundle.drivers].sort((a, b) =>
        a.driver_number === selectedRef.current ? 1 : b.driver_number === selectedRef.current ? -1 : 0
      );
      for (const d of ordered) {
        const pos = interpXY(bundle.positions[String(d.driver_number)], t);
        if (!pos) continue;
        const [px, py] = project(pos.x, pos.y);
        hits.push({ dn: d.driver_number, px, py });
        const isSel = d.driver_number === selectedRef.current;
        const r = isSel ? 11 : 9;
        if (isSel) {
          // Fading motion trail behind the selected car.
          const track = bundle.positions[String(d.driver_number)];
          for (let k = 12; k >= 1; k--) {
            const tp = interpXY(track, t - k * 140);
            if (!tp) continue;
            const [tx, ty] = project(tp.x, tp.y);
            ctx.beginPath();
            ctx.arc(tx, ty, r * 0.55, 0, Math.PI * 2);
            ctx.fillStyle = d.team_colour;
            ctx.globalAlpha = ((13 - k) / 13) * 0.5;
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(px, py, r + 7, 0, Math.PI * 2);
          ctx.fillStyle = d.team_colour + "44";
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = d.team_colour;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = isSel ? "#fff" : "rgba(0,0,0,0.65)";
        ctx.stroke();
        // Driver number inside every dot (broadcast style).
        ctx.font = "bold 9px Orbitron, sans-serif";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(d.driver_number), px, py + 0.5);
        if (isSel) {
          ctx.font = "bold 12px Orbitron, sans-serif";
          ctx.textBaseline = "alphabetic";
          ctx.fillText(d.name_acronym || String(d.driver_number), px, py - r - 6);
        }
        ctx.textBaseline = "alphabetic";
      }
      hitsRef.current = hits;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [bundle, bounds, timeRef]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let best: { dn: number; d2: number } | null = null;
    for (const h of hitsRef.current) {
      const d2 = (h.px - mx) ** 2 + (h.py - my) ** 2;
      if (d2 < 225 && (!best || d2 < best.d2)) best = { dn: h.dn, d2 };
    }
    if (best) onSelect(best.dn);
  };

  return (
    <div className="track-wrap" ref={containerRef}>
      <canvas className="track-canvas" ref={canvasRef} onClick={handleClick} />
    </div>
  );
}
