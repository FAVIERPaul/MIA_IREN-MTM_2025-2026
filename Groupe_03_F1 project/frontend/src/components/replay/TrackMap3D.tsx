import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ReplayBundle } from "../../types";
import { activeFlag, interpXY } from "./replayUtils";

const FLAG_EMISSIVE: Record<string, number | null> = {
  green: null,
  chequered: null,
  yellow: 0xffd700,
  sc: 0xffd700,
  red: 0xe10600,
};
const TRAIL_N = 12;

// World sizing: longer track axis maps to ~WORLD_SPAN units.
const WORLD_SPAN = 90;
const TRACK_WIDTH = 2.6;
const CAR_R = 0.85;

interface CarObj {
  dn: number;
  mesh: THREE.Mesh;
  label: THREE.Sprite;
}

function makeLabelSprite(text: string, color: string, big: boolean): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 80;
  const g = canvas.getContext("2d")!;
  g.font = "bold 54px Orbitron, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = color;
  g.fillText(text, 80, 42);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const s = new THREE.Sprite(mat);
  const k = big ? 1.5 : 1;
  s.scale.set(5 * k, 2.5 * k, 1);
  return s;
}

export default function TrackMap3D({
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
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selectedDriver);
  selectedRef.current = selectedDriver;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const mount = mountRef.current!;
    const scene = new THREE.Scene();

    // --- Coordinate transform: OpenF1 (x,y) -> world (x, 0, z) centered & scaled ---
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    const src = bundle.track.length ? bundle.track : [];
    for (const [x, y] of src) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const span = Math.max(maxX - minX, maxY - minY) || 1;
    const scale = WORLD_SPAN / span;
    const toWorld = (x: number, y: number) => new THREE.Vector3((x - cx) * scale, 0, -(y - cy) * scale);

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    camera.position.set(0, 70, 78);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = 1.45; // don't drop under the ground
    controls.minDistance = 30;
    controls.maxDistance = 220;
    controls.target.set(0, 0, 0);

    // --- Lighting ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(40, 90, 30);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xe10600, 0.25);
    rim.position.set(-50, 30, -40);
    scene.add(rim);

    // --- Ground grid (subtle, pit-wall vibe) ---
    const grid = new THREE.GridHelper(WORLD_SPAN * 2.4, 40, 0x222222, 0x141414);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.4;
    grid.position.y = -0.05;
    scene.add(grid);

    // --- Track ribbon from a smoothed closed centerline ---
    let trackMat: THREE.MeshStandardMaterial | null = null;
    if (bundle.track.length >= 3) {
      const curvePts = bundle.track.map(([x, y]) => toWorld(x, y));
      const curve = new THREE.CatmullRomCurve3(curvePts, true, "catmullrom", 0.5);
      const centerline = curve.getPoints(Math.max(400, bundle.track.length * 3));
      const n = centerline.length;
      const hw = TRACK_WIDTH / 2;

      const left: THREE.Vector3[] = [];
      const right: THREE.Vector3[] = [];
      for (let i = 0; i < n; i++) {
        const cur = centerline[i];
        const nxt = centerline[(i + 1) % n];
        const dx = nxt.x - cur.x;
        const dz = nxt.z - cur.z;
        const len = Math.hypot(dx, dz) || 1;
        const px = -dz / len;
        const pz = dx / len;
        left.push(new THREE.Vector3(cur.x + px * hw, 0, cur.z + pz * hw));
        right.push(new THREE.Vector3(cur.x - px * hw, 0, cur.z - pz * hw));
      }

      const positions: number[] = [];
      for (let i = 0; i < n; i++) {
        const a = left[i];
        const b = right[i];
        const c = left[(i + 1) % n];
        const d = right[(i + 1) % n];
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        positions.push(c.x, c.y, c.z, b.x, b.y, b.z, d.x, d.y, d.z);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({
        color: 0x2c2c2c,
        roughness: 0.9,
        metalness: 0.1,
        side: THREE.DoubleSide,
        emissive: 0x000000,
      });
      trackMat = mat;
      scene.add(new THREE.Mesh(geo, mat));

      // White track edges.
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x666666 });
      const mkLoop = (arr: THREE.Vector3[]) => {
        const g = new THREE.BufferGeometry().setFromPoints([...arr, arr[0]]);
        return new THREE.Line(g, edgeMat);
      };
      scene.add(mkLoop(left));
      scene.add(mkLoop(right));

      // Start/finish bar (red), across the ribbon at point 0.
      const sfDir = new THREE.Vector3().subVectors(centerline[1], centerline[0]);
      const sfBar = new THREE.Mesh(
        new THREE.BoxGeometry(TRACK_WIDTH, 0.25, 0.7),
        new THREE.MeshStandardMaterial({ color: 0xe10600, emissive: 0xe10600, emissiveIntensity: 0.5 })
      );
      sfBar.position.copy(centerline[0]).setY(0.15);
      sfBar.rotation.y = Math.atan2(sfDir.z, sfDir.x) + Math.PI / 2;
      scene.add(sfBar);
    }

    // --- Cars ---
    const carGeo = new THREE.SphereGeometry(CAR_R, 20, 20);
    const cars: CarObj[] = bundle.drivers.map((d) => {
      const color = new THREE.Color(d.team_colour);
      const mesh = new THREE.Mesh(
        carGeo,
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4 })
      );
      mesh.userData.dn = d.driver_number;
      scene.add(mesh);
      const label = makeLabelSprite(String(d.driver_number), "#ffffff", false);
      scene.add(label);
      return { dn: d.driver_number, mesh, label };
    });

    // Selection ring (one, repositioned to the selected car).
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(CAR_R + 0.7, 0.13, 12, 40),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    ring.rotation.x = Math.PI / 2;
    ring.visible = false;
    scene.add(ring);

    // Fading motion-trail ghosts for the selected car.
    const trailColor = new THREE.Color();
    const trail = Array.from({ length: TRAIL_N }, () => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.45, 8, 8),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
      );
      m.visible = false;
      scene.add(m);
      return m;
    });

    // --- Resize ---
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    // --- Click to select (raycast against cars) ---
    const raycaster = new THREE.Raycaster();
    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(cars.map((c) => c.mesh));
      if (hits.length) onSelectRef.current(hits[0].object.userData.dn as number);
    };
    renderer.domElement.addEventListener("click", onClick);

    // --- Render loop ---
    let raf = 0;
    const tmp = new THREE.Vector3();
    const loop = () => {
      const t = timeRef.current;
      const sel = selectedRef.current;
      let selPos: THREE.Vector3 | null = null;

      for (const car of cars) {
        const p = interpXY(bundle.positions[String(car.dn)], t);
        if (!p) {
          car.mesh.visible = false;
          car.label.visible = false;
          continue;
        }
        car.mesh.visible = true;
        car.label.visible = true;
        const w = toWorld(p.x, p.y);
        const isSel = car.dn === sel;
        car.mesh.position.set(w.x, CAR_R, w.z);
        car.mesh.scale.setScalar(isSel ? 1.6 : 1);
        (car.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isSel ? 0.9 : 0.35;
        car.label.position.set(w.x, isSel ? 4.2 : 3.2, w.z);
        (car.label.material as THREE.SpriteMaterial).opacity = isSel ? 1 : 0.7;
        if (isSel) selPos = tmp.set(w.x, CAR_R, w.z).clone();
      }

      if (selPos) {
        ring.visible = true;
        ring.position.copy(selPos).setY(0.2);
      } else {
        ring.visible = false;
      }

      // Flag tint on the asphalt (yellow / SC / red), pulsing.
      if (trackMat) {
        const emis = FLAG_EMISSIVE[activeFlag(bundle, t).kind] ?? null;
        if (emis != null) {
          trackMat.emissive.setHex(emis);
          trackMat.emissiveIntensity = 0.25 + 0.2 * (0.5 + 0.5 * Math.sin(Date.now() / 250));
        } else {
          trackMat.emissiveIntensity = 0;
        }
      }

      // Motion-trail ghosts for the selected car.
      const selDriver = sel != null ? bundle.drivers.find((d) => d.driver_number === sel) : undefined;
      if (sel != null && selDriver) {
        trailColor.set(selDriver.team_colour);
        const track = bundle.positions[String(sel)];
        for (let k = 0; k < TRAIL_N; k++) {
          const tp = interpXY(track, t - (k + 1) * 120);
          const m = trail[k];
          if (!tp) {
            m.visible = false;
            continue;
          }
          const w = toWorld(tp.x, tp.y);
          m.position.set(w.x, CAR_R, w.z);
          m.visible = true;
          const f = (TRAIL_N - k) / TRAIL_N;
          const mm = m.material as THREE.MeshBasicMaterial;
          mm.color.copy(trailColor);
          mm.opacity = f * 0.5;
          m.scale.setScalar(0.5 + f * 0.5);
        }
      } else {
        for (const m of trail) m.visible = false;
      }

      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      scene.traverse((obj: THREE.Object3D) => {
        const renderable = obj as Partial<THREE.Mesh>;
        renderable.geometry?.dispose?.();
        const m = renderable.material;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else if (m) {
          (m as THREE.Material & { map?: THREE.Texture | null }).map?.dispose?.();
          m.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [bundle, timeRef]);

  return <div className="track-wrap" ref={mountRef} />;
}
