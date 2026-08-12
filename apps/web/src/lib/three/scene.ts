/**
 * Construtores de objetos 3D para o modo de visualização 3D (Board3D).
 * Reutiliza as marcações SVG do core como textura do gramado.
 * Escala: 1 unidade = 1 metro. O campo 2D (x, y) vira o plano XZ com y para cima.
 */
import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { BoardState, Player, Pt, Shape } from "@tattico/core";

export type CameraPresetId = "default" | "top" | "side" | "goal";

export interface CameraPreset {
  id: CameraPresetId;
  position: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: "default", position: [98, 80, 104], target: [0, 0, 0] },
  { id: "top", position: [0.1, 170, 0.1], target: [0, 0, 0] },
  { id: "side", position: [140, 34, 0], target: [0, 0, 0] },
  { id: "goal", position: [0, 15, -126], target: [0, 0, 0] },
];

const PITCH_PAD = 4;
const PITCH_TEX_W = 2048;
const SHAPE_Y = 0.04;

interface PitchDims {
  width: number;
  height: number;
}

/**
 * Coordenada 2D (metros) → mundo 3D (campo no plano XZ, y = 0).
 * O plano do campo é rotacionado com rotation.x = -π/2 (normal para cima), o que
 * leva o topo da textura (2D y=0) para o mundo z negativo.
 */
export function toWorld(p: Pt, pitch: PitchDims): THREE.Vector3 {
  return new THREE.Vector3(p.x - pitch.width / 2, 0, p.y - pitch.height / 2);
}

// ------------------------------------------------------------------ gramado
export interface Pitch3D {
  group: THREE.Group;
}

/**
 * Gramado: plano 68×105 com o campo desenhado em Canvas 2D (síncrono, sem SVG assíncrono).
 * As mesmas medidas do renderizador SVG do core são replicadas em pixels.
 */
export function buildPitch(state: BoardState): Pitch3D {
  const { width, height } = state.pitch;
  const W = width + PITCH_PAD * 2;
  const H = height + PITCH_PAD * 2;

  const canvas = document.createElement("canvas");
  const scale = PITCH_TEX_W / W;
  canvas.width = PITCH_TEX_W;
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext("2d");
  if (ctx) drawPitch(ctx, state, scale, PITCH_PAD);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const group = new THREE.Group();
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    // DoubleSide: garante que o gramado nunca suma por culling de face traseira
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }),
  );
  // -π/2: deita o plano no XZ com a normal para CIMA (rotation.x = +π/2 a apontaria para baixo)
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  group.add(plane);

  return { group };
}

/** Desenha o campo completo (gramado + marcações + metas) em Canvas 2D, espelhando o core. */
function drawPitch(ctx: CanvasRenderingContext2D, state: BoardState, scale: number, pad: number): void {
  const { width: w, height: h } = state.pitch;
  const S = scale; // px por metro
  const px = (m: number) => (m + pad) * S;
  const py = (m: number) => (m + pad) * S;
  const lw = Math.max(0.14 * S, 1);
  const line = "rgba(255,255,255,0.92)";
  const cw = Math.round((w + pad * 2) * S);
  const ch = Math.round((h + pad * 2) * S);

  ctx.clearRect(0, 0, cw, ch);

  // gramado com gradiente
  const grad = ctx.createLinearGradient(0, py(0), 0, py(h));
  grad.addColorStop(0, "#1e7d3c");
  grad.addColorStop(1, "#145c2b");
  ctx.fillStyle = grad;
  ctx.fillRect(px(0), py(0), w * S, h * S);

  // listras sutis (faixas horizontais de 4 m — mesmo padrão do renderizador 2D)
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let y = 0; y < h; y += 8) {
    ctx.fillRect(px(0), py(y), w * S, 4 * S);
  }

  const cx = w / 2;
  const cy = h / 2;
  const boxDepth = 16.5;
  const boxWidth = 40.32;
  const goalDepth = 5.5;
  const goalWidth = 18.32;
  const spotY = 11;
  const r = 9.15;
  const corner = 1;

  ctx.strokeStyle = line;
  ctx.lineWidth = lw;

  // limite do campo
  ctx.strokeRect(px(0), py(0), w * S, h * S);

  // linha do meio + círculo central + ponto
  ctx.beginPath();
  ctx.moveTo(px(0), py(cy));
  ctx.lineTo(px(w), py(cy));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px(cx), py(cy), r * S, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = line;
  ctx.beginPath();
  ctx.arc(px(cx), py(cy), 0.4 * S, 0, Math.PI * 2);
  ctx.fill();

  // áreas de pênalti e áreas do gol
  const areas = [
    [cx - boxWidth / 2, 0, boxWidth, boxDepth],
    [cx - boxWidth / 2, h - boxDepth, boxWidth, boxDepth],
    [cx - goalWidth / 2, 0, goalWidth, goalDepth],
    [cx - goalWidth / 2, h - goalDepth, goalWidth, goalDepth],
  ] as const;
  for (const [x, y, ww, hh] of areas) {
    ctx.strokeRect(px(x), py(y), ww * S, hh * S);
  }

  // marcas de pênalti
  ctx.fillStyle = line;
  for (const y of [spotY, h - spotY]) {
    ctx.beginPath();
    ctx.arc(px(cx), py(y), 0.3 * S, 0, Math.PI * 2);
    ctx.fill();
  }

  // arcos de pênalti (fora da área, centrados na marca)
  const off = boxDepth - spotY; // 5.5 m
  const dx = Math.sqrt(r * r - off * off);
  ctx.strokeStyle = line;
  ctx.beginPath();
  ctx.arc(px(cx), py(spotY), r * S, Math.atan2(off, -dx), Math.atan2(off, dx), true);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px(cx), py(h - spotY), r * S, Math.atan2(-off, -dx), Math.atan2(-off, dx), false);
  ctx.stroke();

  // arcos de escanteio
  ctx.beginPath();
  ctx.arc(px(corner), py(corner), corner * S, Math.PI, -Math.PI / 2, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px(w - corner), py(corner), corner * S, 0, -Math.PI / 2, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px(corner), py(h - corner), corner * S, Math.PI, Math.PI / 2, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px(w - corner), py(h - corner), corner * S, 0, Math.PI / 2, false);
  ctx.stroke();

  // metas (trave)
  ctx.beginPath();
  ctx.moveTo(px(cx - 3.66), py(-0.4));
  ctx.lineTo(px(cx + 3.66), py(-0.4));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px(cx - 3.66), py(h + 0.4));
  ctx.lineTo(px(cx + 3.66), py(h + 0.4));
  ctx.stroke();
}

// ------------------------------------------------------------------ ambiente
/** Luzes (hemisférica + sol com sombras) e chão escuro para receber sombras. */
export function buildEnvironment(): THREE.Group {
  const g = new THREE.Group();

  const hemi = new THREE.HemisphereLight(0x9db8e8, 0x0a0f1c, 0.65);
  g.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(60, 120, 45);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -95;
  sun.shadow.camera.right = 95;
  sun.shadow.camera.top = 130;
  sun.shadow.camera.bottom = -130;
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 360;
  g.add(sun);
  g.add(sun.target);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.35;
  ground.receiveShadow = true;
  g.add(ground);

  return g;
}

// ------------------------------------------------------------------ jogadores
/** Marcador 3D de jogador: cilindro colorido + número no topo + nome + anel de seleção. */
export function buildPlayerMarker(player: Player, selected: boolean, pitch: PitchDims): THREE.Group {
  const group = new THREE.Group();
  group.position.copy(toWorld(player, pitch));
  group.userData.id = player.id;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 0.55, 40),
    new THREE.MeshStandardMaterial({ color: player.color, roughness: 0.5, metalness: 0.1 }),
  );
  body.position.y = 0.275;
  body.castShadow = true;
  group.add(body);

  const plate = new THREE.Mesh(
    new THREE.CircleGeometry(1.75, 40),
    new THREE.MeshBasicMaterial({
      map: numberTexture(String(player.number)),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = 0.56;
  group.add(plate);

  if (player.name) {
    const nameSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: nameTexture(player.name), transparent: true, depthWrite: false }),
    );
    nameSprite.scale.set(6.2, 1.7, 1);
    nameSprite.position.y = 0.05;
    group.add(nameSprite);
  }

  if (selected) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.25, 0.18, 12, 48),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    ring.renderOrder = 3;
    group.add(ring);
  }

  return group;
}

// ------------------------------------------------------------------ formas
export interface ShapeObject {
  group: THREE.Group;
  materials: LineMaterial[];
}

/** Converte uma forma 2D em geometria 3D (linhas grossas/curvas/sprites) sobre o gramado. */
export function buildShapeObject(shape: Shape, pitch: PitchDims): ShapeObject {
  const group = new THREE.Group();
  const materials: LineMaterial[] = [];
  const color = new THREE.Color(shape.color);

  const addFatLine = (pts: THREE.Vector3[], width: number, dashed: boolean) => {
    const positions: number[] = [];
    for (const p of pts) positions.push(p.x, SHAPE_Y, p.z);
    const geo = new LineGeometry();
    geo.setPositions(positions);
    const mat = new LineMaterial({
      color,
      linewidth: width,
      worldUnits: true,
      dashed,
      dashSize: width * 2,
      gapSize: width * 1.4,
    });
    const line = new Line2(geo, mat);
    line.computeLineDistances();
    materials.push(mat);
    group.add(line);
  };

  switch (shape.type) {
    case "line": {
      addFatLine(shape.points.map((p) => toWorld(p, pitch)), shape.width, shape.dashed);
      break;
    }
    case "arrow": {
      const [a, b] = shape.points;
      addFatLine([toWorld(a, pitch), toWorld(b, pitch)], shape.width, shape.dashed);
      const start = toWorld(a, pitch);
      const end = toWorld(b, pitch);
      const dir = end.clone().sub(start);
      dir.y = 0;
      if (dir.length() > 0.001) {
        dir.normalize();
        const headLen = shape.width * 6;
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(shape.width * 3, headLen, 16),
          new THREE.MeshBasicMaterial({ color }),
        );
        cone.position.copy(end);
        cone.position.y = SHAPE_Y;
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        cone.position.addScaledVector(dir, headLen / 2);
        group.add(cone);
      }
      break;
    }
    case "bspline": {
      const pts = shape.points.map((p) => toWorld(p, pitch));
      if (pts.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
        addFatLine(curve.getPoints(48), shape.width, shape.dashed);
      }
      break;
    }
    case "rect": {
      const [a, b] = shape.points;
      const corners: Pt[] = [
        { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
        { x: Math.max(a.x, b.x), y: Math.min(a.y, b.y) },
        { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
        { x: Math.min(a.x, b.x), y: Math.max(a.y, b.y) },
        { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
      ];
      addFatLine(corners.map((c) => toWorld(c, pitch)), shape.width, shape.dashed);
      break;
    }
    case "ellipse": {
      const [a, b] = shape.points;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const rx = Math.abs(a.x - b.x) / 2;
      const ry = Math.abs(a.y - b.y) / 2;
      const curve = new THREE.EllipseCurve(cx, cy, rx, ry, 0, Math.PI * 2, false, 0);
      addFatLine(curve.getPoints(64).map((p) => toWorld(p, pitch)), shape.width, shape.dashed);
      break;
    }
    case "text": {
      const [a] = shape.points;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: textShapeTexture(shape.text || "Texto"), transparent: true, depthWrite: false }),
      );
      const f = shape.fontSize;
      sprite.scale.set(f * 4.2, f * 2.1, 1);
      const pos = toWorld(a, pitch);
      pos.y = SHAPE_Y;
      sprite.position.copy(pos);
      group.add(sprite);
    }
  }

  return { group, materials };
}

// ------------------------------------------------------------------ texturas
function numberTexture(num: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.font = "700 170px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = 30;
    ctx.strokeText(num, size / 2, size / 2 + 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(num, size / 2, size / 2 + 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function nameTexture(name: string): THREE.CanvasTexture {
  const w = 512;
  const h = 160;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, w, h);
    ctx.font = "700 72px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = 14;
    ctx.strokeText(name, w / 2, h / 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(name, w / 2, h / 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function textShapeTexture(text: string): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const lines = text.split("\n");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "700 150px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = 26;
    const lineH = 170;
    const startY = h / 2 - ((lines.length - 1) * lineH) / 2;
    for (let i = 0; i < lines.length; i++) {
      const ly = startY + i * lineH;
      ctx.strokeText(lines[i], w / 2, ly);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(lines[i], w / 2, ly);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ------------------------------------------------------------------ limpeza
/** Descarta geometrias, materiais e texturas de toda a subárvore. */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    const geometry = (mesh as THREE.Mesh).geometry;
    if (geometry) (geometry as THREE.BufferGeometry).dispose();
    const material = (mesh as THREE.Mesh).material;
    const mats = Array.isArray(material) ? material : material ? [material] : [];
    for (const m of mats) {
      const map = (m as THREE.MeshStandardMaterial).map;
      if (map) map.dispose();
      m.dispose();
    }
  });
}
