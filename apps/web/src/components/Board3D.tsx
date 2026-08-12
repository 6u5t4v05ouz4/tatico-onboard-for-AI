import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type { BoardState } from "@tattico/core";
import { ui, type Lang } from "../lib/i18n";
import {
  buildEnvironment,
  buildPitch,
  buildPlayerMarker,
  buildShapeObject,
  CAMERA_PRESETS,
  disposeObject,
} from "../lib/three/scene";
import type { CameraPresetId } from "../lib/three/scene";

interface Board3DProps {
  state: BoardState;
  selectedId: string | null;
  lang: Lang;
}

interface SceneHandle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  players: THREE.Group;
  shapes: THREE.Group;
  materials: LineMaterial[];
  timer: THREE.Timer;
  raf: number;
}

/**
 * Modo de visualização 3D do quadro tático (somente leitura).
 * Monta uma cena three.js com o gramado texturizado a partir das marcações SVG do core,
 * jogadores como marcadores 3D e formas como linhas grossas sobre o campo.
 * Edição continua no modo 2D; aqui a cena reflete o estado ao vivo.
 */
export default function Board3D({ state, selectedId, lang }: Board3DProps) {
  const t = ui(lang);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const presetTargetRef = useRef<CameraPresetId>("default");
  const presetActiveRef = useRef(false);
  const [preset, setPreset] = useState<CameraPresetId>("default");

  // monta a cena uma única vez
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0f1c, 200, 480);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    const start = CAMERA_PRESETS[0];
    camera.position.set(...start.position);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 25;
    controls.maxDistance = 300;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(...start.target);
    // botão do meio = pan (como no modo 2D); zoom fica apenas no scroll do mouse
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.addEventListener("start", () => {
      // interação do usuário cancela a animação do preset
      presetActiveRef.current = false;
    });

    // bloqueia o autoscroll nativo do navegador ao clicar o botão do meio
    const preventMiddleClick = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };
    renderer.domElement.addEventListener("mousedown", preventMiddleClick);
    renderer.domElement.addEventListener("auxclick", preventMiddleClick);

    scene.add(buildEnvironment());

    const players = new THREE.Group();
    const shapes = new THREE.Group();
    scene.add(players, shapes);

    scene.add(buildPitch(stateRef.current).group);
    const handle: SceneHandle = {
      renderer,
      scene,
      camera,
      controls,
      players,
      shapes,
      materials: [],
      timer: new THREE.Timer(),
      raf: 0,
    };
    handleRef.current = handle;

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      for (const m of handle.materials) m.resolution.set(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const animate = () => {
      handle.raf = requestAnimationFrame(animate);
      handle.timer.update();
      const dt = Math.min(handle.timer.getDelta(), 0.05);
      if (presetActiveRef.current) {
        const target = CAMERA_PRESETS.find((p) => p.id === presetTargetRef.current);
        if (target) {
          if (reducedMotion) {
            camera.position.set(...target.position);
            controls.target.set(...target.target);
            presetActiveRef.current = false;
          } else {
            const lambda = 7;
            camera.position.x = THREE.MathUtils.damp(camera.position.x, target.position[0], lambda, dt);
            camera.position.y = THREE.MathUtils.damp(camera.position.y, target.position[1], lambda, dt);
            camera.position.z = THREE.MathUtils.damp(camera.position.z, target.position[2], lambda, dt);
            controls.target.x = THREE.MathUtils.damp(controls.target.x, target.target[0], lambda, dt);
            controls.target.y = THREE.MathUtils.damp(controls.target.y, target.target[1], lambda, dt);
            controls.target.z = THREE.MathUtils.damp(controls.target.z, target.target[2], lambda, dt);
            const d = camera.position.distanceTo(new THREE.Vector3(...target.position));
            if (d < 0.2) presetActiveRef.current = false;
          }
        } else {
          presetActiveRef.current = false;
        }
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(handle.raf);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("mousedown", preventMiddleClick);
      renderer.domElement.removeEventListener("auxclick", preventMiddleClick);
      disposeObject(scene);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      handleRef.current = null;
    };
  }, []);

  // sincroniza jogadores/formas com o estado do quadro (ao vivo)
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    disposeObject(handle.players);
    disposeObject(handle.shapes);
    handle.players.clear();
    handle.shapes.clear();
    handle.materials.length = 0;
    for (const p of state.players) {
      handle.players.add(buildPlayerMarker(p, p.id === selectedRef.current, state.pitch));
    }
    for (const s of state.shapes) {
      const obj = buildShapeObject(s, state.pitch);
      handle.shapes.add(obj.group);
      handle.materials.push(...obj.materials);
    }
  }, [state]);

  const applyPreset = (id: CameraPresetId) => {
    setPreset(id);
    presetTargetRef.current = id;
    presetActiveRef.current = true;
  };

  const isEmpty = state.players.length === 0 && state.shapes.length === 0;
  const presetLabels: Record<CameraPresetId, string> = {
    default: t.presetDefault,
    top: t.presetTop,
    side: t.presetSide,
    goal: t.presetGoal,
  };

  return (
    <div className="board3d" ref={containerRef} role="img" aria-label={t.board3dAria}>
      <div className="board3d-hud">
        <div className="board3d-hud-panel">
          <div className="board3d-presets" role="group" aria-label={t.groupView}>
            {CAMERA_PRESETS.map((p) => (
              <button
                key={p.id}
                className={`preset-btn ${preset === p.id ? "active" : ""}`}
                onClick={() => applyPreset(p.id)}
                aria-pressed={preset === p.id}
              >
                {presetLabels[p.id]}
              </button>
            ))}
          </div>
          <div className="board3d-hint">{t.view3dHintOrbit}</div>
        </div>
      </div>
      {isEmpty && (
        <div className="board-empty">
          <div className="board-empty-inner">
            <strong>{t.boardEmptyTitle}</strong>
            {t.boardEmptyText}
          </div>
        </div>
      )}
    </div>
  );
}
