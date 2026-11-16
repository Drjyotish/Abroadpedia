import * as THREE from "three";

/**
 * The AbroadPedia journey world: five low-poly destinations laid out west to
 * east, a camera that flies between them as the page scrolls, and a guide on a
 * paper plane who leads the way. Everything is procedural — no external assets.
 */

export type World = {
  setProgress: (p: number) => void;
  setPointer: (x: number, y: number) => void;
  resize: () => void;
  start: () => void;
  stop: () => void;
  dispose: () => void;
};

const SPACING = 210;
const SEGMENTS = 4; // 5 stops
const G = 1; // land surface height

type Palette = {
  top: number;
  horizon: number;
  water: number;
  sun: number;
  sunI: number;
  hemiI: number;
  sunY: number;
  night: number;
};

const PALETTES: Palette[] = [
  // Nepal — Himalayan dawn
  { top: 0x2b3475, horizon: 0xf6b983, water: 0x4a6a9c, sun: 0xffc592, sunI: 1.7, hemiI: 0.95, sunY: 0.1, night: 0.3 },
  // India — warm morning
  { top: 0x5a78e8, horizon: 0xffdcbc, water: 0x5f9ec4, sun: 0xfff0d0, sunI: 2.1, hemiI: 1.05, sunY: 0.32, night: 0 },
  // UAE — golden noon
  { top: 0x3f9ae0, horizon: 0xf8e3b4, water: 0x3fb5c9, sun: 0xfff6dd, sunI: 2.4, hemiI: 1.15, sunY: 0.55, night: 0 },
  // Australia — bright harbour day
  { top: 0x2a7de1, horizon: 0xc9f1ea, water: 0x2e8fd0, sun: 0xffffff, sunI: 2.3, hemiI: 1.15, sunY: 0.42, night: 0 },
  // USA — lilac dusk
  { top: 0x101a35, horizon: 0xc79ad6, water: 0x2a3566, sun: 0xffb37a, sunI: 1.3, hemiI: 0.85, sunY: 0.07, night: 1 },
];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type MatOpts = {
  rough?: number;
  metal?: number;
  emissive?: number;
  ei?: number;
  side?: THREE.Side;
};

type Animator = (time: number, dt: number) => void;

export function createWorld(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean }): World {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  const fog = new THREE.Fog(0xf6b983, 120, 440);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 2400);
  const animators: Animator[] = [];

  // ---------------------------------------------------------------- kit ----
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const M = (color: number, o: MatOpts = {}) => {
    const key = [color, o.rough, o.metal, o.emissive, o.ei, o.side].join("|");
    let m = mats.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: o.rough ?? 0.9,
        metalness: o.metal ?? 0,
        emissive: o.emissive ?? 0x000000,
        emissiveIntensity: o.ei ?? 1,
        side: o.side ?? THREE.FrontSide,
      });
      mats.set(key, m);
    }
    return m;
  };

  type P = THREE.Object3D;
  const add = (p: P, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    p.add(m);
    return m;
  };
  /** Box / cylinder / cone take a BASE y so things stack naturally. */
  const box = (p: P, w: number, h: number, d: number, c: number, x: number, y: number, z: number, o?: MatOpts) =>
    add(p, new THREE.BoxGeometry(w, h, d), M(c, o), x, y + h / 2, z);
  const cyl = (p: P, rt: number, rb: number, h: number, seg: number, c: number, x: number, y: number, z: number, o?: MatOpts) =>
    add(p, new THREE.CylinderGeometry(rt, rb, h, seg), M(c, o), x, y + h / 2, z);
  const cone = (p: P, r: number, h: number, seg: number, c: number, x: number, y: number, z: number, o?: MatOpts) =>
    add(p, new THREE.ConeGeometry(r, h, seg), M(c, o), x, y + h / 2, z);
  /** Ball is centred on (x, y, z). */
  const ball = (p: P, r: number, c: number, x: number, y: number, z: number, o?: MatOpts, detail = 1) =>
    add(p, new THREE.IcosahedronGeometry(r, detail), M(c, o), x, y, z);

  const pine = (p: P, x: number, z: number, s = 1) => {
    cyl(p, 0.25 * s, 0.35 * s, 1.4 * s, 5, 0x6b4a34, x, G, z);
    cone(p, 1.7 * s, 3.2 * s, 6, 0x2f6b4f, x, G + 1.2 * s, z);
    cone(p, 1.25 * s, 2.6 * s, 6, 0x3a7d5c, x, G + 2.9 * s, z);
  };
  const roundTree = (p: P, x: number, z: number, s = 1, c = 0x4f9a5b) => {
    cyl(p, 0.22 * s, 0.3 * s, 1.8 * s, 5, 0x6b4a34, x, G, z);
    ball(p, 1.7 * s, c, x, G + 2.9 * s, z);
  };
  const palm = (p: P, x: number, z: number, s = 1, base = G) => {
    const trunk = cyl(p, 0.16 * s, 0.26 * s, 5 * s, 5, 0x9a7a55, x, base, z);
    trunk.rotation.z = 0.08;
    const crown = new THREE.Group();
    crown.position.set(x - 0.4 * s, base + 5 * s, z);
    for (let k = 0; k < 6; k++) {
      const pivot = new THREE.Group();
      pivot.rotation.y = (k / 6) * Math.PI * 2;
      const g = new THREE.ConeGeometry(0.5 * s, 3 * s, 4);
      g.translate(0, 1.5 * s, 0);
      const leaf = new THREE.Mesh(g, M(0x3f9a62));
      leaf.rotation.z = -(Math.PI / 2 + 0.38);
      leaf.scale.z = 0.3;
      pivot.add(leaf);
      crown.add(pivot);
    }
    p.add(crown);
  };
  const house = (p: P, x: number, z: number, wall: number, roof: number, s = 1) => {
    box(p, 4 * s, 3 * s, 4 * s, wall, x, G, z);
    const r = cone(p, 3.5 * s, 1.9 * s, 4, roof, x, G + 3 * s, z);
    r.rotation.y = Math.PI / 4;
  };
  const tower = (p: P, x: number, z: number, w: number, h: number, c: number, cap = false) => {
    box(p, w, h, w * 0.9, c, x, G, z, { metal: 0.45, rough: 0.3 });
    if (cap) {
      const t = cone(p, w * 0.62, w * 0.9, 4, c, x, G + h, z, { metal: 0.45, rough: 0.3 });
      t.rotation.y = Math.PI / 4;
    } else {
      box(p, w * 0.6, 1.4, w * 0.5, 0xe9eef4, x, G + h, z);
    }
  };
  const boat = (p: P, x: number, z: number, sail: number, s = 1, phase = 0) => {
    const g = new THREE.Group();
    g.position.set(x, 0.2, z);
    box(g, 3.2 * s, 0.7 * s, 1.1 * s, 0xf5f1e8, 0, 0, 0);
    cyl(g, 0.06 * s, 0.06 * s, 3.6 * s, 4, 0x6b4a34, 0.2 * s, 0.6 * s, 0);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(1.9 * s, 0);
    shape.lineTo(0, 3.2 * s);
    shape.closePath();
    add(g, new THREE.ShapeGeometry(shape), M(sail, { side: THREE.DoubleSide }), 0.3 * s, 0.9 * s, 0);
    p.add(g);
    if (!opts.reducedMotion) {
      animators.push((t) => {
        g.position.y = 0.2 + Math.sin(t * 1.1 + phase) * 0.14;
        g.rotation.z = Math.sin(t * 0.9 + phase) * 0.05;
      });
    }
  };

  /** A strip of land whose colour blends west to east. */
  const land = (x0: number, x1: number, z0: number, z1: number, cWest: number, cEast: number) => {
    const w = x1 - x0;
    const d = z1 - z0;
    const geo = new THREE.PlaneGeometry(w, d, 24, 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const a = new THREE.Color(cWest);
    const b = new THREE.Color(cEast);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      c.copy(a).lerp(b, (pos.getX(i) + w / 2) / w);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const top = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    top.position.set((x0 + x1) / 2, G, (z0 + z1) / 2);
    scene.add(top);
    // a sandy skirt so coasts have some thickness
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, d), M(0xd9c7a0));
    skirt.position.set((x0 + x1) / 2, G - 0.82, (z0 + z1) / 2);
    scene.add(skirt);
  };

  const region = (index: number) => {
    const g = new THREE.Group();
    g.position.x = index * SPACING;
    scene.add(g);
    return g;
  };

  // ------------------------------------------------------- sky and light ---
  const skyUniforms = {
    uTop: { value: new THREE.Color(PALETTES[0].top) },
    uHorizon: { value: new THREE.Color(PALETTES[0].horizon) },
    uSunDir: { value: new THREE.Vector3(0.3, 0.1, -1).normalize() },
    uSunColor: { value: new THREE.Color(PALETTES[0].sun) },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 24, 14),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunColor;
        varying vec3 vDir;
        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 col = mix(uHorizon, uTop, pow(h, 0.45));
          float glow = pow(max(dot(normalize(vDir), uSunDir), 0.0), 10.0);
          col += uSunColor * glow * 0.32;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -10;
  scene.add(sky);

  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(46, 40),
    new THREE.MeshBasicMaterial({ color: 0xfff1d6, fog: false, depthWrite: false, transparent: true }),
  );
  sunDisc.renderOrder = -9;
  scene.add(sunDisc);

  const starGeo = new THREE.BufferGeometry();
  {
    const r = mulberry32(11);
    const pts: number[] = [];
    for (let i = 0; i < 420; i++) {
      const theta = r() * Math.PI * 2;
      const y = 0.12 + r() * 0.88;
      const s = Math.sqrt(1 - y * y);
      pts.push(Math.cos(theta) * s * 1300, y * 1300, Math.sin(theta) * s * 1300);
    }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  }
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2.2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = -8;
  scene.add(stars);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7f73, 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(-0.55, 1, 0.75);
  scene.add(sun);
  scene.add(sun.target);

  const waterMat = new THREE.MeshStandardMaterial({ color: PALETTES[0].water, roughness: 0.32, metalness: 0.25 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(4400, 1800), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(SPACING * 2, 0, -200);
  scene.add(water);

  // ----------------------------------------------------------------- land ---
  const S = SPACING;
  land(-280, S / 2, -420, 140, 0x7fae7a, 0x8fb878); // Nepal
  land(S / 2, S + 78, -420, 140, 0x8fb878, 0xc4c487); // India
  land(2 * S - 84, 2 * S + 102, -420, 2, 0xe8c98f, 0xe2be82); // UAE
  land(3 * S - 74, 3 * S + 92, -420, -46, 0x79b87a, 0x8cc487); // Australia, back
  land(3 * S - 74, 3 * S - 1, -46, -22, 0x86bd80, 0x86bd80); // Sydney city shore
  land(3 * S + 58, 3 * S + 92, -46, -22, 0x86bd80, 0x8cc487); // north shore
  land(4 * S - 62, 4 * S + 74, -420, -10, 0x4a5072, 0x434968); // Manhattan

  // ---------------------------------------------------------------- Nepal ---
  {
    const g = region(0);
    const peaks: [number, number, number, number][] = [
      [-150, -160, 95, 48], [-100, -125, 80, 42], [-55, -140, 108, 52], [-10, -118, 88, 44],
      [38, -146, 116, 54], [82, -120, 84, 42], [124, -156, 72, 40], [-130, -88, 46, 30],
      [62, -86, 50, 30], [-196, -130, 70, 40],
    ];
    const rocks = [0x6c79a6, 0x7885b0, 0x626e9c];
    peaks.forEach(([x, z, h, r], i) => {
      const m = cone(g, r, h, i % 2 ? 5 : 6, rocks[i % 3], x, G - 1, z);
      m.rotation.y = i * 1.3;
      const cap = cone(g, r * 0.43, h * 0.42, i % 2 ? 5 : 6, 0xf4f6fb, x, G - 1 + h * 0.585, z);
      cap.rotation.y = i * 1.3;
    });
    const hills: [number, number, number][] = [[-64, -64, 26], [18, -70, 30], [96, -62, 24], [-140, -52, 22]];
    hills.forEach(([x, z, r]) => {
      const hgt = ball(g, r, 0x6fa377, x, G - 2, z);
      hgt.scale.set(1.7, 0.42, 1);
    });

    // Stupa
    const sx = -6;
    const sz = -20;
    box(g, 24, 1.2, 24, 0xf2efe6, sx, G, sz);
    box(g, 18, 1.2, 18, 0xf7f4ec, sx, G + 1.2, sz);
    box(g, 12, 1.2, 12, 0xf2efe6, sx, G + 2.4, sz);
    add(g, new THREE.SphereGeometry(6.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(0xfbfaf5), sx, G + 3.6, sz);
    box(g, 3.2, 3, 3.2, 0xe0b354, sx, G + 9.3, sz, { metal: 0.3, rough: 0.5 });
    box(g, 0.9, 0.28, 0.08, 0x23306b, sx - 0.75, G + 10.9, sz + 1.62);
    box(g, 0.9, 0.28, 0.08, 0x23306b, sx + 0.75, G + 10.9, sz + 1.62);
    cone(g, 1.7, 6.6, 8, 0xe0b354, sx, G + 12.3, sz, { metal: 0.3, rough: 0.5 });
    cyl(g, 1.2, 1.2, 0.3, 8, 0xe0b354, sx, G + 18.6, sz);
    cone(g, 0.4, 1.4, 6, 0xe0b354, sx, G + 18.9, sz);

    // Prayer flags strung from the spire
    const flagColors = [0x3a6fd8, 0xffffff, 0xd8433a, 0x3fa35c, 0xf2c230];
    const topPt = new THREE.Vector3(sx, G + 18.6, sz);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xf5efe0, transparent: true, opacity: 0.7 });
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2 + 0.4;
      const anchor = new THREE.Vector3(sx + Math.cos(ang) * 23, G + 0.6, sz + Math.sin(ang) * 23);
      const linePts: THREE.Vector3[] = [];
      for (let j = 0; j <= 12; j++) {
        const t = j / 12;
        const pt = topPt.clone().lerp(anchor, t);
        pt.y -= Math.sin(Math.PI * t) * 2.6;
        linePts.push(pt);
        if (j > 0 && j < 12) {
          const f = add(
            g,
            new THREE.PlaneGeometry(1.15, 0.85),
            M(flagColors[(j + k) % 5], { side: THREE.DoubleSide }),
            pt.x,
            pt.y - 0.5,
            pt.z,
          );
          f.rotation.y = -ang;
        }
      }
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePts), lineMat));
    }

    // Pagoda temple
    const px = 28;
    const pz = -34;
    box(g, 17, 1, 17, 0xa0523d, px, G, pz);
    box(g, 13, 1, 13, 0xb05f47, px, G + 1, pz);
    const tiers: [number, number, number, number][] = [
      [8, 4.2, 9.4, 2.8], [5.6, 3.2, 6.9, 2.4], [3.6, 2.8, 4.8, 2.2],
    ];
    let ty = G + 2;
    tiers.forEach(([bw, bh, rr, rh]) => {
      box(g, bw, bh, bw, 0x7a2e22, px, ty, pz);
      box(g, bw + 0.5, 0.35, bw + 0.5, 0xe0b354, px, ty + bh - 0.4, pz);
      const roof = cone(g, rr, rh, 4, 0x4a2a24, px, ty + bh, pz);
      roof.rotation.y = Math.PI / 4;
      ty += bh + rh * 0.55;
    });
    cone(g, 0.5, 2.2, 6, 0xe0b354, px, ty + 0.6, pz);

    house(g, -42, -8, 0xf0e2c8, 0xb5533c);
    house(g, -49, -1, 0xe9d3b0, 0x8a3b2a, 0.9);
    house(g, 48, -8, 0xf0e2c8, 0xb5533c, 1.1);
    house(g, 56, -2, 0xf5ead6, 0x9c4a36, 0.85);
    house(g, -70, -20, 0xe9d3b0, 0xb5533c);

    const r = mulberry32(3);
    for (let i = 0; i < 46; i++) {
      const x = -120 + r() * 230;
      const z = -64 + r() * 78;
      if (Math.hypot(x - sx, z - sz) < 28 || Math.hypot(x - px, z - pz) < 14) continue;
      if (z > 4 && Math.abs(x) < 60) continue; // keep the runway clear
      pine(g, x, z, 0.8 + r() * 0.9);
    }
  }

  // ---------------------------------------------------------------- India ---
  {
    const g = region(1);

    // A white marble mausoleum, in the Mughal style
    const tx = 4;
    const tz = -44;
    box(g, 48, 2, 34, 0xf3ede1, tx, G, tz);
    box(g, 20, 12, 20, 0xfbf7ef, tx, G + 2, tz);
    box(g, 9, 13.4, 1, 0xfbf7ef, tx, G + 2, tz + 10.3);
    box(g, 5, 7, 0.4, 0xbfae92, tx, G + 2.6, tz + 10.75);
    const arch = cyl(g, 2.5, 2.5, 0.4, 16, 0xbfae92, tx, G + 9.4, tz + 10.75);
    arch.rotation.x = Math.PI / 2;
    [-7, 7].forEach((dx) => {
      [0, 5.6].forEach((dy) => {
        box(g, 2.4, 3.2, 0.3, 0xcbbca2, tx + dx, G + 3 + dy, tz + 10.05);
        const a = cyl(g, 1.2, 1.2, 0.3, 12, 0xcbbca2, tx + dx, G + 6 + dy, tz + 10.05);
        a.rotation.x = Math.PI / 2;
      });
    });
    cyl(g, 5.2, 5.4, 3.2, 12, 0xf7f2e8, tx, G + 14, tz);
    const dome = add(g, new THREE.SphereGeometry(6.1, 14, 9), M(0xfdfbf6), tx, G + 21.6, tz);
    dome.scale.y = 1.14;
    cone(g, 0.45, 3.4, 6, 0xe0b354, tx, G + 28.2, tz);
    [-7, 7].forEach((dx) =>
      [-7, 7].forEach((dz) => {
        cyl(g, 1.25, 1.25, 1.5, 8, 0xf3ede1, tx + dx, G + 14, tz + dz);
        ball(g, 1.55, 0xfdfbf6, tx + dx, G + 16.1, tz + dz);
      }),
    );
    [-22, 22].forEach((dx) =>
      [-15, 15].forEach((dz) => {
        cyl(g, 1.05, 1.45, 20, 8, 0xf7f2e8, tx + dx, G + 2, tz + dz);
        cyl(g, 1.8, 1.8, 0.45, 8, 0xe8e0d0, tx + dx, G + 16, tz + dz);
        cyl(g, 0.9, 0.9, 1.2, 6, 0xf3ede1, tx + dx, G + 22, tz + dz);
        ball(g, 1.3, 0xfdfbf6, tx + dx, G + 24, tz + dz);
      }),
    );
    box(g, 5, 0.16, 36, 0x7fc4d8, tx, G, tz + 36, { rough: 0.25, metal: 0.2 });
    [-10, 10].forEach((dx) => box(g, 12, 0.1, 36, 0x86b86b, tx + dx, G, tz + 36));
    for (let z = tz + 21; z < tz + 54; z += 5.5) {
      cone(g, 0.85, 5.2, 6, 0x2f5f47, tx - 3.6, G, z);
      cone(g, 0.85, 5.2, 6, 0x2f5f47, tx + 3.6, G, z);
    }

    // A sandstone memorial arch
    const ax = 34;
    const az = -4;
    const shape = new THREE.Shape();
    shape.moveTo(-9, 0);
    shape.lineTo(9, 0);
    shape.lineTo(9, 23);
    shape.lineTo(-9, 23);
    shape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-3.5, 0);
    hole.lineTo(-3.5, 12);
    hole.absarc(0, 12, 3.5, Math.PI, 0, true);
    hole.lineTo(3.5, 0);
    hole.closePath();
    shape.holes.push(hole);
    const archGeo = new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: false, curveSegments: 10 });
    archGeo.translate(0, 0, -3);
    add(g, archGeo, M(0xd8bd8f), ax, G + 1, az);
    box(g, 22, 1, 9, 0xcdb083, ax, G, az);
    box(g, 19.5, 0.9, 7, 0xcdb083, ax, G + 24, az);
    box(g, 12, 2.4, 5, 0xd8bd8f, ax, G + 24.9, az);
    cyl(g, 2.3, 1.4, 1.1, 10, 0xcdb083, ax, G + 27.3, az);

    // Old-city rooftops
    const r = mulberry32(8);
    const walls = [0xf2c9a0, 0xe8a87c, 0xf5e0b8, 0xd98e6a, 0xf0d6c2, 0x9fc6d6];
    for (let i = 0; i < 18; i++) {
      const x = -96 + r() * 62;
      const z = -64 + r() * 22;
      const w = 4 + r() * 4;
      box(g, w, 4 + r() * 7, w, walls[i % walls.length], x, G, z);
    }
    for (let i = 0; i < 26; i++) {
      const x = -90 + r() * 180;
      const z = -70 + r() * 80;
      if (Math.hypot(x - tx, z - tz) < 34 || Math.hypot(x - ax, z - az) < 16) continue;
      if (Math.abs(x - tx) < 18 && z > tz) continue;
      if (z > 6 && Math.abs(x) < 50) continue;
      roundTree(g, x, z, 0.8 + r() * 0.8, i % 3 ? 0x4f9a5b : 0x6aa85f);
    }

    // Kites — it's always kite season somewhere
    const kiteColors = [0xf28a3c, 0x3fa35c, 0xd8433a, 0x6478f5];
    const kiteShape = new THREE.Shape();
    kiteShape.moveTo(0, 1.4);
    kiteShape.lineTo(1, 0);
    kiteShape.lineTo(0, -1.6);
    kiteShape.lineTo(-1, 0);
    kiteShape.closePath();
    const kiteGeo = new THREE.ShapeGeometry(kiteShape);
    [[-64, 30, -30], [-22, 36, -22], [48, 28, -16], [70, 38, -40]].forEach(([x, y, z], i) => {
      const k = add(g, kiteGeo, M(kiteColors[i], { side: THREE.DoubleSide }), x, y, z);
      k.rotation.set(0.3, 0.4 * i, 0.3);
      if (!opts.reducedMotion) {
        animators.push((t) => {
          k.position.y = y + Math.sin(t * 0.8 + i * 2) * 1.2;
          k.position.x = x + Math.sin(t * 0.5 + i) * 1.6;
          k.rotation.z = 0.3 + Math.sin(t * 1.4 + i) * 0.18;
        });
      }
    });
  }

  // ------------------------------------------------------------------ UAE ---
  {
    const g = region(2);

    // A needle-thin supertall
    const bx = 4;
    const bz = -46;
    const radii = [8, 7, 6.1, 5.2, 4.4, 3.6, 2.8, 2.1, 1.4, 0.8];
    const heights = [9, 8, 8, 8, 7, 7, 7, 6, 6, 5];
    let by = G;
    radii.forEach((rad, i) => {
      const tier = cyl(g, rad * 0.86, rad, heights[i], 6, i % 2 ? 0xc3d0de : 0xb4c4d6, bx, by, bz, { metal: 0.55, rough: 0.3 });
      tier.rotation.y = i * 0.36;
      by += heights[i];
    });
    cyl(g, 0.12, 0.5, 9, 5, 0xdfe7ef, bx, by, bz, { metal: 0.5, rough: 0.3 });

    const glass = [0x7fb3d5, 0x9ad0e0, 0xb6d7ea, 0x6ea4c9];
    const towers: [number, number, number, number][] = [
      [-30, -42, 9, 34], [-18, -56, 10, 46], [26, -54, 9, 40], [40, -40, 10, 30],
      [54, -56, 11, 52], [-46, -58, 10, 28], [68, -42, 8, 24], [-58, -40, 8, 20], [84, -54, 9, 34],
    ];
    towers.forEach(([x, z, w, h], i) => tower(g, x, z, w, h, glass[i % 4], i % 3 === 0));

    // A sail-shaped hotel on its own island
    const hx = 24;
    const hz = 12;
    cyl(g, 8, 8.6, 1.2, 14, 0xe6d2a2, hx, -0.1, hz);
    const sail = new THREE.Shape();
    sail.moveTo(0, 0);
    sail.lineTo(11, 0);
    sail.quadraticCurveTo(11.5, 22, 0, 35);
    sail.closePath();
    const sailGeo = new THREE.ExtrudeGeometry(sail, { depth: 5.5, bevelEnabled: false, curveSegments: 10 });
    sailGeo.translate(-4, 0, -2.75);
    add(g, sailGeo, M(0xf6f8fb, { rough: 0.5 }), hx, 1.1, hz);
    cyl(g, 0.28, 0.28, 39, 5, 0xdfe7ef, hx - 4.2, 1.1, hz);
    cyl(g, 2.2, 2.2, 0.3, 10, 0xdfe7ef, hx + 1, 27, hz + 3.6);
    const causeway = box(g, 1.8, 0.5, 15, 0xd9c7a0, hx + 5, 0.3, hz - 9);
    causeway.rotation.y = -0.5;

    // A ring-shaped museum on a green mound
    const mound = ball(g, 7, 0x7dbb7a, -34, G, -12);
    mound.scale.set(1.5, 0.35, 1.1);
    const ring = add(
      g,
      new THREE.TorusGeometry(4.8, 2, 8, 20),
      M(0xd7dde5, { metal: 0.65, rough: 0.22 }),
      -34,
      G + 8.2,
      -12,
    );
    ring.scale.set(1.3, 1, 0.6);
    ring.rotation.y = 0.35;

    // A golden picture-frame landmark
    [-6, 6].forEach((dx) => box(g, 2, 26, 2, 0xd9b45a, -74 + dx, G, -30, { metal: 0.5, rough: 0.35 }));
    box(g, 14, 2.4, 2, 0xd9b45a, -74, G + 26, -30, { metal: 0.5, rough: 0.35 });
    box(g, 14, 1.2, 2, 0xd9b45a, -74, G, -30, { metal: 0.5, rough: 0.35 });

    const dunes: [number, number, number, number][] = [
      [-90, -130, 54, 0xe9c68a], [0, -150, 64, 0xdfb877], [96, -128, 48, 0xe9c68a], [-30, -100, 34, 0xe4c184], [110, -90, 30, 0xdfb877],
    ];
    dunes.forEach(([x, z, r, c]) => {
      const d = ball(g, r, c, x, G - 3, z, {}, 2);
      d.scale.set(1.7, 0.24, 1);
    });

    for (let x = -66; x <= 84; x += 12) {
      if (Math.abs(x + 34) < 12) continue;
      palm(g, x, -4, 0.95 + ((x * 7) % 5) * 0.04);
    }
    boat(g, -14, 18, 0xf6b983, 1.2, 0.4);
    boat(g, 52, 9, 0xfaf6ee, 1, 2.1);
  }

  // ------------------------------------------------------------ Australia ---
  {
    const g = region(3);

    // Sail-roofed performance hall on the harbour
    const opera = new THREE.Group();
    opera.position.x = 14;
    g.add(opera);
    box(opera, 36, 1.7, 19, 0xd9cfc0, -14, 0, -10);
    box(opera, 13, 1.7, 9, 0xd9cfc0, -14, 0, -21);
    const fin = (w: number, h: number, d: number) => {
      const s = new THREE.Shape();
      s.moveTo(0, 0);
      s.quadraticCurveTo(w * 0.1, h * 0.95, w, h);
      s.quadraticCurveTo(w * 0.7, h * 0.4, w * 0.78, 0);
      s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 8 });
      geo.translate(0, 0, -d / 2);
      return geo;
    };
    const shellMat = M(0xfaf6ee, { side: THREE.DoubleSide, rough: 0.6 });
    const rows: { z: number; d: number; fins: [number, number, number][] }[] = [
      { z: -14, d: 6.4, fins: [[-29, 7, 7], [-25.5, 9, 10.8], [-21, 10.5, 14]] },
      { z: -6.2, d: 5.4, fins: [[-27, 6, 6], [-23.6, 8, 9.2], [-19.4, 9.4, 12]] },
    ];
    rows.forEach(({ z, d, fins }) => {
      fins.forEach(([x, w, h]) => add(opera, fin(w, h, d), shellMat, x, 1.7, z));
      const back = add(opera, fin(6, 6.4, d * 0.85), shellMat, -2.5, 1.7, z);
      back.scale.x = -1;
    });

    // Steel arch bridge
    const brx = 32;
    const brz = -34;
    const steel = M(0x59616e, { metal: 0.4, rough: 0.5 });
    const upper = add(g, new THREE.TorusGeometry(30, 0.8, 5, 30, Math.PI), steel, brx, 2, brz);
    upper.scale.y = 0.6;
    const lower = add(g, new THREE.TorusGeometry(30, 0.6, 5, 30, Math.PI), steel, brx, 2, brz);
    lower.scale.y = 0.44;
    box(g, 78, 0.8, 3.6, 0x4b525e, brx, 7.4, brz);
    for (let x = -26; x <= 26; x += 4) {
      const ya = 2 + 0.6 * Math.sqrt(900 - x * x);
      if (ya > 8.4) box(g, 0.22, ya - 8.2, 0.22, 0x59616e, brx + x, 8.2, brz);
    }
    [-33.5, 33.5].forEach((dx) => {
      box(g, 5, 15, 6.4, 0xcdb892, brx + dx, 0, brz);
      box(g, 3.6, 2, 5, 0xbfa77e, brx + dx, 15, brz);
    });

    // City and tower
    const glass = [0x8fb7d9, 0xa9c9e2, 0xd9e6ef, 0x6f9cc4];
    const towers: [number, number, number, number][] = [
      [-52, -36, 8, 26], [-42, -42, 9, 38], [-31, -35, 7, 22], [-62, -42, 8, 18], [-22, -42, 7, 28], [-12, -36, 6, 16], [-66, -30, 6, 12],
    ];
    towers.forEach(([x, z, w, h], i) => tower(g, x, z, w, h, glass[i % 4], i === 1));
    cyl(g, 0.55, 0.8, 40, 6, 0xcfd6dd, -37, G, -29);
    cyl(g, 2.7, 2, 3.2, 10, 0xd9b45a, -37, G + 38, -29, { metal: 0.5, rough: 0.35 });
    cyl(g, 0.12, 0.3, 8, 4, 0xcfd6dd, -37, G + 41, -29);

    // Red rock outback, far behind
    const rock = ball(g, 30, 0xb5533c, 76, G - 2, -128, {}, 2);
    rock.scale.set(1.7, 0.4, 0.8);
    const hills: [number, number, number][] = [[-20, -110, 34], [40, -86, 26], [-80, -96, 28]];
    hills.forEach(([x, z, r]) => {
      const hgt = ball(g, r, 0x7ab37b, x, G - 3, z);
      hgt.scale.set(1.8, 0.32, 1);
    });

    const r = mulberry32(21);
    for (let i = 0; i < 30; i++) {
      const x = -62 + r() * 140;
      const z = -84 + r() * 34;
      if (x < 0 && z > -50) continue;
      roundTree(g, x, z, 0.9 + r() * 0.8, i % 2 ? 0x6fa98a : 0x5c9a78);
    }
    boat(g, 10, 12, 0xfaf6ee, 1.1, 0);
    boat(g, 30, 4, 0xf6b983, 0.95, 1.7);
    boat(g, -40, 16, 0x92e2d2, 1.15, 3.1);
    boat(g, 52, 14, 0xfaf6ee, 1, 4.4);
  }

  // ------------------------------------------------------------------ USA ---
  {
    const g = region(4);
    const r = mulberry32(42);

    const windowTex = (cols: number, rows: number) => {
      const c = document.createElement("canvas");
      c.width = cols * 8;
      c.height = rows * 8;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, c.width, c.height);
      const lit = ["#ffd58a", "#ffe9c4", "#ffc56e", "#a9dcff"];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (r() < 0.56) {
            ctx.fillStyle = lit[Math.floor(r() * lit.length)];
            ctx.fillRect(x * 8 + 2, y * 8 + 2, 4, 5);
          }
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      return tex;
    };
    const bases = [0x2a3358, 0x343f6e, 0x1f2747, 0x3b3a66];
    const lit = (base: number, cols: number, rows: number) => {
      const side = new THREE.MeshStandardMaterial({
        color: base,
        roughness: 0.7,
        emissive: 0xffffff,
        emissiveMap: windowTex(cols, rows),
        emissiveIntensity: 0.95,
      });
      const roof = M(base);
      return [side, side, roof, roof, side, side];
    };
    const litMats = [lit(bases[0], 5, 9), lit(bases[1], 6, 16), lit(bases[2], 4, 12), lit(bases[3], 7, 22)];
    const litBox = (w: number, h: number, d: number, x: number, y: number, z: number, variant: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), litMats[variant]);
      m.position.set(x, y + h / 2, z);
      g.add(m);
      return m;
    };

    // Art-deco stepped tower
    const ex = 2;
    const ez = -46;
    litBox(12, 30, 12, ex, G, ez, 3);
    litBox(9, 12, 9, ex, G + 30, ez, 1);
    litBox(6, 9, 6, ex, G + 42, ez, 2);
    box(g, 3.4, 5, 3.4, 0x4a5488, ex, G + 51, ez);
    cyl(g, 0.25, 0.9, 11, 6, 0xcfd6f5, ex, G + 56, ez, { emissive: 0x6478f5, ei: 0.5 });

    // Tapered glass tower
    const wt = cyl(g, 3.4, 5.6, 56, 4, 0x6fa8d6, -30, G, -32, { metal: 0.65, rough: 0.2, emissive: 0x24406e, ei: 0.5 });
    wt.rotation.y = Math.PI / 4;
    cyl(g, 0.1, 0.35, 10, 4, 0xdfe7ef, -30, G + 56, -32);

    // Crowned silver tower
    litBox(7, 32, 7, 27, G, -38, 1);
    [[4.6, 4], [3.5, 4], [2.4, 4.5]].forEach(([rad, h], i) => {
      const t = cone(g, rad, h, 4, 0xcfd6e6, 27, G + 32 + i * 2.6, -38, { metal: 0.7, rough: 0.25 });
      t.rotation.y = Math.PI / 4;
    });
    cyl(g, 0.08, 0.2, 7, 4, 0xdfe7ef, 27, G + 41, -38);

    for (let i = 0; i < 40; i++) {
      const back = i % 2 === 0;
      const x = -50 + r() * 110;
      const z = back ? -92 + r() * 32 : -42 + r() * 24;
      if (Math.hypot(x - ex, z - ez) < 11 || Math.hypot(x + 30, z + 32) < 9 || Math.hypot(x - 27, z + 38) < 8) continue;
      const w = 6 + r() * 5;
      const h = back ? 28 + r() * 34 : 10 + r() * 20;
      litBox(w, h, 6 + r() * 4, x, G, z, Math.floor(r() * 4));
    }

    // Harbour statue
    const lx = -16;
    const lz = 10;
    cyl(g, 8.5, 9, 1.2, 12, 0x5d8a6b, lx, -0.1, lz);
    const s1 = box(g, 9, 1.6, 9, 0xcbb99a, lx, 1.1, lz);
    s1.rotation.y = Math.PI / 4;
    box(g, 9, 1.6, 9, 0xcbb99a, lx, 1.1, lz);
    box(g, 4.4, 7, 4.4, 0xd6c5a6, lx, 2.7, lz);
    const copper = 0x7fd1b9;
    cyl(g, 1, 1.75, 7.6, 7, copper, lx, 9.7, lz);
    ball(g, 0.9, copper, lx, 18.1, lz);
    for (let k = 0; k < 7; k++) {
      const a = (k / 6) * Math.PI - Math.PI;
      const spike = cone(g, 0.14, 0.9, 4, copper, lx + Math.cos(a) * 0.8, 18.6, lz + 0.1);
      spike.position.y = 18.75 - Math.sin(a) * 0.75;
      spike.rotation.z = Math.cos(a) * -1.1;
    }
    const arm = cyl(g, 0.3, 0.36, 4.4, 5, copper, lx + 1.15, 16.6, lz);
    arm.rotation.z = -0.2;
    cone(g, 0.5, 0.9, 6, 0xe0b354, lx + 1.6, 20.9, lz).rotation.x = Math.PI;
    const flame = ball(g, 0.55, 0xffc85a, lx + 1.6, 22.3, lz, { emissive: 0xffb23a, ei: 2.2 });
    box(g, 0.9, 1.7, 0.35, copper, lx - 1.15, 14, lz + 0.7);
    if (!opts.reducedMotion) {
      animators.push((t) => {
        const s = 1 + Math.sin(t * 7) * 0.08 + Math.sin(t * 13) * 0.05;
        flame.scale.setScalar(s);
      });
    }

    // Suspension bridge heading out across the river
    const bridge = new THREE.Group();
    bridge.position.set(66, 0, 14);
    bridge.rotation.y = -0.75;
    g.add(bridge);
    box(bridge, 72, 0.7, 3.8, 0x6b5a50, 0, 6.6, 0);
    [-16, 16].forEach((dx) => {
      [-1.4, 1.4].forEach((dz) => box(bridge, 1.3, 21, 1.3, 0x9a7b63, dx, 0, dz));
      box(bridge, 1.3, 2.6, 4.2, 0x9a7b63, dx, 18.4, 0);
      box(bridge, 1.3, 1.4, 4.2, 0x9a7b63, dx, 11, 0);
    });
    const cablePts = [
      [-36, 7.4], [-27, 11.4], [-16, 20.6], [-8, 12.2], [0, 9.2], [8, 12.2], [16, 20.6], [27, 11.4], [36, 7.4],
    ];
    [-1.6, 1.6].forEach((dz) => {
      const curve = new THREE.CatmullRomCurve3(cablePts.map(([x, y]) => new THREE.Vector3(x, y, dz)));
      bridge.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.13, 4), M(0xd8d2c8)));
      for (let k = 1; k < 30; k++) {
        const pt = curve.getPoint(k / 30);
        if (pt.y > 7.9) box(bridge, 0.07, pt.y - 7.3, 0.07, 0xd8d2c8, pt.x, 7.3, dz);
      }
    });

    for (let x = -44; x <= 40; x += 9) roundTree(g, x, -13, 0.7, 0x3f6f62);
    boat(g, -44, 12, 0xfaf6ee, 1, 0.9);
    boat(g, 16, 4, 0xb9a4f7, 0.9, 2.6);
  }

  // Moon over the last stop
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xfff3d6, fog: false, transparent: true, opacity: 0 });
  const moon = new THREE.Mesh(new THREE.CircleGeometry(30, 32), moonMat);
  moon.position.set(SPACING * SEGMENTS + 250, 420, -1100);
  scene.add(moon);

  // --------------------------------------------------------------- clouds ---
  {
    const r = mulberry32(5);
    const cloudMat = M(0xffffff, { rough: 1, emissive: 0xdfe4f5, ei: 0.5 });
    const puff = (x: number, y: number, z: number, s: number) => {
      const c = new THREE.Group();
      c.position.set(x, y, z);
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry((2.2 + r() * 2.4) * s, 1), cloudMat);
        b.position.set((i - n / 2) * 3.4 * s + r() * 1.5, r() * 1.4 * s, r() * 2.4 * s);
        b.scale.y = 0.62;
        c.add(b);
      }
      scene.add(c);
      if (!opts.reducedMotion) {
        const speed = 0.25 + r() * 0.5;
        const phase = r() * 10;
        animators.push((t) => {
          c.position.x = x + Math.sin(t * 0.05 * speed + phase) * 8;
        });
      }
    };
    for (let seg = 0; seg < SEGMENTS; seg++) {
      const mid = seg * SPACING + SPACING / 2;
      for (let i = 0; i < 9; i++) {
        puff(mid - 62 + r() * 124, 30 + r() * 22, -80 + r() * 104, 1 + r() * 1.3);
      }
    }
    for (let i = 0; i < 22; i++) {
      puff(-120 + r() * (SPACING * SEGMENTS + 240), 74 + r() * 50, -330 + r() * 130, 2.4 + r() * 2.6);
    }
  }

  // ------------------------------------------------------- flight curves ---
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const camStops = [
    { pos: V(-30, 10, 62), tgt: V(2, 15, -22) },
    { pos: V(SPACING - 26, 12, 66), tgt: V(SPACING + 2, 11, -16) },
    { pos: V(SPACING * 2 - 32, 15, 74), tgt: V(SPACING * 2 + 2, 26, -22) },
    { pos: V(SPACING * 3 - 24, 9, 60), tgt: V(SPACING * 3 + 6, 8, -16) },
    { pos: V(SPACING * 4 - 32, 12, 70), tgt: V(SPACING * 4 + 2, 20, -22) },
  ];
  const camPts: THREE.Vector3[] = [];
  const tgtPts: THREE.Vector3[] = [];
  const planePts: THREE.Vector3[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const cx = i * SPACING;
    camPts.push(camStops[i].pos);
    tgtPts.push(camStops[i].tgt);
    planePts.push(V(cx - 3, 9.5, 27));
    if (i < SEGMENTS) {
      const mid = cx + SPACING / 2;
      camPts.push(V(mid - 12, 46, 86));
      tgtPts.push(V(mid + 30, 35, -10));
      planePts.push(V(mid, 41, 24));
    }
  }
  const camCurve = new THREE.CatmullRomCurve3(camPts);
  const tgtCurve = new THREE.CatmullRomCurve3(tgtPts);
  const planeCurve = new THREE.CatmullRomCurve3(planePts);

  // Dashed route across the whole world
  {
    const route = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(planeCurve.getPoints(360).map((p) => p.clone().setY(p.y - 1.2))),
      new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 1.6, gapSize: 1.8, transparent: true, opacity: 0.6 }),
    );
    route.computeLineDistances();
    scene.add(route);
  }

  // --------------------------------------------------- guide on the plane ---
  const craft = new THREE.Group();
  const craftInner = new THREE.Group();
  craft.add(craftInner);
  scene.add(craft);
  let waveArm: THREE.Object3D | null = null;
  {
    // Paper plane (nose points +z)
    const s = 2.5;
    const verts = new Float32Array(
      [
        // left wing
        0, 0, 2.7, -1.75, 0.28, -1.7, 0, 0, -1.7,
        // right wing
        0, 0, 2.7, 0, 0, -1.7, 1.75, 0.28, -1.7,
        // keel
        0, 0, 2.7, 0, 0, -1.7, 0, -0.75, -1.7,
      ].map((v) => v * s),
    );
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    const paper = new THREE.Mesh(geo, M(0xffffff, { side: THREE.DoubleSide, rough: 0.8, emissive: 0x6478f5, ei: 0.12 }));
    craftInner.add(paper);
    const stripe = box(craftInner, 0.16, 0.05, 9.4, 0x6478f5, 0, 0.02, 1.2);
    stripe.position.y = 0.04;

    // The guide: brown-and-gold sherwani over a peach kurta
    const guide = new THREE.Group();
    guide.position.set(0, 0.06, -1.1);
    craftInner.add(guide);
    const BROWN = 0x6b3520;
    const GOLD = 0xd9b45a;
    const PEACH = 0xf1b9a2;
    const SKIN = 0xc98e6b;
    const HAIR = 0x1d1512;
    const gold = { metal: 0.45, rough: 0.4 };

    [-0.24, 0.24].forEach((x) => {
      box(guide, 0.3, 0.17, 0.66, 0x5a2d18, x, 0, 0.1);
      box(guide, 0.2, 0.05, 0.22, GOLD, x, 0.17, 0.26, gold);
      box(guide, 0.3, 1.1, 0.3, PEACH, x, 0.17, 0);
    });
    const coat = cyl(guide, 0.5, 0.76, 2.05, 8, BROWN, 0, 0.9, 0);
    coat.rotation.y = Math.PI / 8;
    const hem = cyl(guide, 0.765, 0.775, 0.16, 8, GOLD, 0, 0.9, 0, gold);
    hem.rotation.y = Math.PI / 8;
    const panel = box(guide, 0.26, 2, 0.1, PEACH, 0, 0.93, 0.59);
    panel.rotation.x = -0.115;
    for (let i = 0; i < 6; i++) {
      ball(guide, 0.045, GOLD, 0, 1.25 + i * 0.27, 0.69 - i * 0.031, gold, 0);
    }
    // embroidery: gold vines with a few bright motifs, hinted in low-poly
    const er = mulberry32(77);
    const motif = [GOLD, GOLD, GOLD, GOLD, 0xf7f3e8, 0x4f9fd8, 0xe8763a, 0x8fb86b];
    for (let i = 0; i < 44; i++) {
      const a = er() * Math.PI * 2;
      if (Math.abs(Math.sin(a)) < 0.3 && Math.cos(a) > 0) continue; // keep the front panel clear
      const h = er();
      const rad = (0.76 - h * 0.26) * 0.955;
      const c = motif[Math.floor(er() * motif.length)];
      const d = box(guide, 0.07 + er() * 0.07, 0.07 + er() * 0.08, 0.04, c, Math.sin(a) * rad, 1 + h * 1.85, Math.cos(a) * rad, c === GOLD ? gold : undefined);
      d.rotation.y = a;
    }
    cyl(guide, 0.3, 0.34, 0.2, 8, GOLD, 0, 2.9, 0, gold);
    cyl(guide, 0.16, 0.16, 0.22, 6, SKIN, 0, 3.05, 0);

    // necklace
    const lace = add(guide, new THREE.TorusGeometry(0.25, 0.035, 5, 12), M(0xf4ecd8, { rough: 0.4 }), 0, 2.74, 0.36);
    lace.rotation.x = -0.9;
    ball(guide, 0.06, 0x2f8f5b, 0, 2.5, 0.5, { rough: 0.3 }, 0);

    // head, hair, beard
    const head = new THREE.Group();
    head.position.set(0, 3.52, 0.02);
    guide.add(head);
    ball(head, 0.36, SKIN, 0, 0, 0);
    const hair = add(head, new THREE.SphereGeometry(0.4, 9, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), M(HAIR), 0, 0.02, -0.03);
    hair.rotation.x = -0.28;
    box(head, 0.5, 0.14, 0.2, HAIR, 0, 0.2, 0.22).rotation.x = 0.3;
    const beard = add(head, new THREE.SphereGeometry(0.385, 9, 5, 0, Math.PI * 2, Math.PI * 0.58, Math.PI * 0.42), M(HAIR), 0, 0, 0.03);
    beard.rotation.x = 0.25;
    box(head, 0.07, 0.07, 0.04, 0x1a1a1a, -0.13, 0.03, 0.33);
    box(head, 0.07, 0.07, 0.04, 0x1a1a1a, 0.13, 0.03, 0.33);
    box(head, 0.2, 0.035, 0.03, 0xf7f3e8, 0, -0.14, 0.345); // a smile

    // arms
    const armGeo = () => {
      const a = new THREE.Group();
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 1.25, 6), M(BROWN));
      upper.position.y = -0.62;
      a.add(upper);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.14, 6), M(GOLD, gold));
      cuff.position.y = -1.2;
      a.add(cuff);
      const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), M(SKIN));
      hand.position.y = -1.4;
      a.add(hand);
      return a;
    };
    const left = armGeo();
    left.position.set(-0.56, 2.82, 0);
    left.rotation.z = -0.22;
    guide.add(left);
    const right = armGeo();
    right.position.set(0.56, 2.82, 0);
    right.rotation.set(-2.2, 0, 0.5); // raised, pointing ahead
    guide.add(right);
    waveArm = right;

    craftInner.scale.setScalar(1.5);
  }

  // ----------------------------------------------------------- animation ---
  let target = 0;
  let current = 0;
  let prev = 0;
  let roll = 0;
  let pointerX = 0;
  let pointerY = 0;
  let px = 0;
  let py = 0;
  let zoomZ = 1;
  let raf = 0;
  let running = false;
  let last = 0;
  let time = 0;

  const camPos = new THREE.Vector3();
  const camTgt = new THREE.Vector3();
  const planePos = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const sunDir = new THREE.Vector3();
  const cA = new THREE.Color();
  const cB = new THREE.Color();
  const lerpHex = (out: THREE.Color, a: number, b: number, t: number) => out.copy(cA.setHex(a)).lerp(cB.setHex(b), t);

  const ease = (p: number) => {
    const f = Math.min(Math.max(p, 0), 1) * SEGMENTS;
    const i = Math.min(Math.floor(f), SEGMENTS - 1);
    const u = f - i;
    const s = u * u * (3 - 2 * u);
    return (i + u * 0.3 + s * 0.7) / SEGMENTS;
  };

  const apply = (dt: number) => {
    const e = ease(current);

    camCurve.getPoint(e, camPos);
    tgtCurve.getPoint(e, camTgt);
    camPos.z *= zoomZ;
    px += (pointerX - px) * Math.min(1, dt * 3);
    py += (pointerY - py) * Math.min(1, dt * 3);
    camPos.x += px * 3;
    camPos.y += -py * 1.6;
    camera.position.copy(camPos);
    camera.lookAt(camTgt);

    // plane and guide
    const pe = Math.min(1, e + 0.003);
    planeCurve.getPoint(pe, planePos);
    planeCurve.getTangent(pe, tangent);
    const bob = opts.reducedMotion ? 0 : Math.sin(time * 1.5) * 0.45;
    craft.position.set(planePos.x, planePos.y + bob, planePos.z);
    craft.lookAt(planePos.x + tangent.x, planePos.y + bob + tangent.y * 0.6, planePos.z + tangent.z);
    const speed = dt > 0 ? (current - prev) / dt : 0;
    prev = current;
    const wantRoll = Math.max(-0.5, Math.min(0.5, -speed * 5));
    roll += (wantRoll - roll) * Math.min(1, dt * 4);
    craftInner.rotation.z = roll + (opts.reducedMotion ? 0 : Math.sin(time * 1.1) * 0.045);
    if (waveArm && !opts.reducedMotion) waveArm.rotation.z = 0.5 + Math.sin(time * 2.2) * 0.12;

    // palette
    const f = e * SEGMENTS;
    const i = Math.min(Math.floor(f), SEGMENTS - 1);
    const u = f - i;
    const A = PALETTES[i];
    const B = PALETTES[i + 1];
    lerpHex(skyUniforms.uTop.value, A.top, B.top, u);
    lerpHex(skyUniforms.uHorizon.value, A.horizon, B.horizon, u);
    lerpHex(skyUniforms.uSunColor.value, A.sun, B.sun, u);
    fog.color.copy(skyUniforms.uHorizon.value);
    lerpHex(waterMat.color, A.water, B.water, u);
    lerpHex(sun.color, A.sun, B.sun, u);
    sun.intensity = A.sunI + (B.sunI - A.sunI) * u;
    hemi.intensity = A.hemiI + (B.hemiI - A.hemiI) * u;
    hemi.color.copy(skyUniforms.uHorizon.value).lerp(cA.setHex(0xffffff), 0.45);
    const night = A.night + (B.night - A.night) * u;
    starMat.opacity = night * 0.9;
    moonMat.opacity = Math.max(0, night - 0.35) * 1.4;

    const sunY = A.sunY + (B.sunY - A.sunY) * u;
    sunDir.set(0.34, sunY, -1).normalize();
    skyUniforms.uSunDir.value.copy(sunDir);
    sunDisc.position.copy(camera.position).addScaledVector(sunDir, 1400);
    sunDisc.lookAt(camera.position);
    (sunDisc.material as THREE.MeshBasicMaterial).color.copy(skyUniforms.uSunColor.value).lerp(cA.setHex(0xffffff), 0.35);

    sky.position.copy(camera.position);
    stars.position.copy(camera.position);
    sun.position.set(camera.position.x - 60, 110, 90);
    sun.target.position.set(camera.position.x, 0, 0);

    for (const a of animators) a(time, dt);
  };

  const render = () => renderer.render(scene, camera);

  const frame = (now: number) => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    const k = opts.reducedMotion ? 1 : 1 - Math.exp(-dt * 3.4);
    current += (target - current) * k;
    apply(dt);
    render();
  };

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    camera.fov = aspect < 0.8 ? 74 : aspect < 1.2 ? 62 : 50;
    zoomZ = aspect < 0.8 ? 1.18 : 1;
    if (aspect > 1.3) camera.setViewOffset(w, h, -w * 0.13, 0, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    if (!running) {
      apply(0);
      render();
    }
  };

  resize();

  return {
    setProgress: (p) => {
      target = Math.min(1, Math.max(0, p));
    },
    setPointer: (x, y) => {
      if (opts.reducedMotion) return;
      pointerX = x;
      pointerY = y;
    },
    resize,
    start: () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop: () => {
      running = false;
      cancelAnimationFrame(raf);
    },
    dispose: () => {
      running = false;
      cancelAnimationFrame(raf);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) mat.dispose();
      });
      renderer.dispose();
    },
  };
}
