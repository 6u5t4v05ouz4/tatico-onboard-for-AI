import { useCallback, useEffect, useRef, useState } from "react";
import {
  BOARD_PAD,
  arrowHead,
  catmullRomPath,
  renderPitchMarkings,
} from "@tattico/core";
import type { BoardController } from "@tattico/core";
import type { BoardState, Player, Pt, Shape, ShapeType, Side } from "@tattico/core";
import { ui, type Lang } from "../lib/i18n";

export type ToolId =
  | "select"
  | "player"
  | "line"
  | "arrow"
  | "bspline"
  | "rect"
  | "ellipse"
  | "text";

export interface ToolInfo {
  id: ToolId;
  label: string;
  hint: string;
}

/** Ferramentas disponíveis, com rótulos e dicas no idioma ativo. */
export function getTools(lang: Lang): ToolInfo[] {
  return ui(lang).tools.map((t) => ({ id: t.id as ToolId, label: t.label, hint: t.hint }));
}

interface BoardProps {
  state: BoardState;
  controller: BoardController;
  tool: ToolId;
  color: string;
  side: Side;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  zoom: number;
  pan: Pt;
  setZoom: (z: number) => void;
  setPan: (p: Pt) => void;
  lang: Lang;
}

type Gesture =
  | { kind: "idle" }
  | { kind: "draw"; type: ShapeType; start: Pt; current: Pt }
  | { kind: "bspline"; points: Pt[] }
  | { kind: "move-player"; id: string; from: Pt }
  | { kind: "move-shape"; id: string; from: Pt }
  | { kind: "move-point"; shapeId: string; index: number; from: Pt }
  | { kind: "resize"; shapeId: string; index: number; from: Pt }
  | { kind: "pan"; from: Pt };

const VIEW_W = 68 + BOARD_PAD * 2;
const VIEW_H = 105 + BOARD_PAD * 2;

/** Frações (0..1) do clique dentro da área renderizada do svg, respeitando preserveAspectRatio. */
function contentFractions(rect: DOMRect, clientX: number, clientY: number) {
  const contentW = Math.min(rect.width, rect.height * (VIEW_W / VIEW_H));
  const contentH = Math.min(rect.height, rect.width * (VIEW_H / VIEW_W));
  if (contentW <= 0 || contentH <= 0) return null;
  const left = rect.left + (rect.width - contentW) / 2;
  const top = rect.top + (rect.height - contentH) / 2;
  return {
    fx: (clientX - left) / contentW,
    fy: (clientY - top) / contentH,
  };
}

export default function Board({
  state,
  controller,
  tool,
  color,
  side,
  selectedId,
  onSelect,
  zoom,
  pan,
  setZoom,
  setPan,
  lang,
}: BoardProps) {
  const t = ui(lang);
  const svgRef = useRef<SVGSVGElement>(null);
  const [gesture, setGesture] = useState<Gesture>({ kind: "idle" });
  const gestureRef = useRef<Gesture>({ kind: "idle" });
  gestureRef.current = gesture;
  const colorRef = useRef(color);
  colorRef.current = color;

  const toMeters = useCallback(
    (e: { clientX: number; clientY: number }): Pt => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      // Conversão manual (cliente → viewBox) baseada em getBoundingClientRect:
      // respeita preserveAspectRatio (letterboxing) e não depende de getScreenCTM,
      // que pode devolver matriz incorreta com CSS filter no svg.
      const f = contentFractions(svg.getBoundingClientRect(), e.clientX, e.clientY);
      if (!f) return { x: 0, y: 0 };
      return {
        x: pan.x + f.fx * (VIEW_W / zoom),
        y: pan.y + f.fy * (VIEW_H / zoom),
      };
    },
    [pan, zoom],
  );

  // ---------------------------------------------------------------- wheel zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = contentFractions(svg.getBoundingClientRect(), e.clientX, e.clientY);
      if (!f) return;
      const vbx = pan.x + f.fx * (VIEW_W / zoom);
      const vby = pan.y + f.fy * (VIEW_H / zoom);
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const nextZoom = Math.min(6, Math.max(0.4, zoom * factor));
      const nextPan = {
        x: vbx - f.fx * (VIEW_W / nextZoom),
        y: vby - f.fy * (VIEW_H / nextZoom),
      };
      setZoom(nextZoom);
      setPan(nextPan);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoom, pan, setZoom, setPan]);

  // ---------------------------------------------------------------- keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (!selectedId) return;
        e.preventDefault();
        if (selectedId.startsWith("p")) controller.removePlayer(selectedId);
        else controller.removeShape(selectedId);
        onSelect(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) controller.redo();
        else controller.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        controller.redo();
      } else if (e.key === "Escape") {
        if (gestureRef.current.kind === "bspline") setGesture({ kind: "idle" });
        onSelect(null);
      } else if (e.key === "Enter" && gestureRef.current.kind === "bspline") {
        const g = gestureRef.current;
        if (g.kind === "bspline" && g.points.length >= 2) {
          commitBspline(g.points);
          setGesture({ kind: "idle" });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, controller, onSelect, colorRef]);

  // ---------------------------------------------------------------- helpers
  const commitBspline = (points: Pt[]) => {
    if (points.length < 2) return;
    controller.addShape({ type: "bspline", points: points.map((p) => ({ ...p })), color: colorRef.current });
  };

  const hitTest = (p: Pt): string | null => {
    // jogadores são renderizados por cima das formas → testar primeiro
    for (let i = state.players.length - 1; i >= 0; i--) {
      const pl = state.players[i];
      const d = Math.hypot(p.x - pl.x, p.y - pl.y);
      if (d <= 2.4 + 1.0) return pl.id;
    }
    for (let i = state.shapes.length - 1; i >= 0; i--) {
      const s = state.shapes[i];
      if (shapeContains(s, p)) return s.id;
    }
    return null;
  };

  const handlePoint = (shape: Shape, p: Pt): number => {
    // qual ponto de controle está próximo (para mover/resize)
    for (let i = 0; i < shape.points.length; i++) {
      const pt = shape.points[i];
      if (Math.hypot(p.x - pt.x, p.y - pt.y) < 1.6) return i;
    }
    return -1;
  };

  const cornerIndex = (shape: Shape, p: Pt): number => {
    const [a, b] = shape.points;
    const corners = [
      { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
      { x: Math.max(a.x, b.x), y: Math.min(a.y, b.y) },
      { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
      { x: Math.min(a.x, b.x), y: Math.max(a.y, b.y) },
    ];
    for (let i = 0; i < 4; i++) {
      if (Math.hypot(p.x - corners[i].x, p.y - corners[i].y) < 1.8) return i;
    }
    return -1;
  };

  // ---------------------------------------------------------------- pointer
  const onPointerDown = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.setPointerCapture(e.pointerId);
    const p = toMeters(e);

    // pan: botão do meio ou Shift + botão esquerdo — impede o autoscroll nativo
    if (e.button === 1 || e.shiftKey) {
      e.preventDefault();
      setGesture({ kind: "pan", from: p });
      return;
    }

    // botão direito (e outros) não aciona ferramentas — onContextMenu cuida do resto
    if (e.button !== 0) return;

    if (tool === "select") {
      const selectedShape = selectedId?.startsWith("s")
        ? state.shapes.find((s) => s.id === selectedId)
        : undefined;
      // handles do shape selecionado
      if (selectedShape) {
        if (selectedShape.type === "line" || selectedShape.type === "arrow") {
          const idx = handlePoint(selectedShape, p);
          if (idx >= 0) {
            setGesture({ kind: "move-point", shapeId: selectedShape.id, index: idx, from: p });
            return;
          }
        } else if (selectedShape.type === "rect" || selectedShape.type === "ellipse") {
          const idx = cornerIndex(selectedShape, p);
          if (idx >= 0) {
            setGesture({ kind: "resize", shapeId: selectedShape.id, index: idx, from: p });
            return;
          }
        } else if (selectedShape.type === "bspline") {
          const idx = handlePoint(selectedShape, p);
          if (idx >= 0) {
            setGesture({ kind: "move-point", shapeId: selectedShape.id, index: idx, from: p });
            return;
          }
        } else {
          const idx = handlePoint(selectedShape, p);
          if (idx >= 0) {
            setGesture({ kind: "move-point", shapeId: selectedShape.id, index: idx, from: p });
            return;
          }
        }
      }
      const hit = hitTest(p);
      if (hit) {
        onSelect(hit);
        if (hit.startsWith("p")) {
          setGesture({ kind: "move-player", id: hit, from: p });
        } else {
          setGesture({ kind: "move-shape", id: hit, from: p });
        }
      } else {
        onSelect(null);
      }
      return;
    }

    if (tool === "player") {
      controller.addPlayer({ x: p.x, y: p.y, side, color });
      return;
    }

    if (tool === "text") {
      const s = controller.addShape({
        type: "text",
        points: [p],
        text: "Texto",
        color,
        fontSize: 4,
      });
      onSelect(s.id);
      return;
    }

    if (tool === "bspline") {
      const g = gestureRef.current;
      const points = g.kind === "bspline" ? [...g.points] : [];
      points.push(p);
      if (points.length >= 2) {
        // duplo clique (rápido e próximo) finaliza
        const last = points[points.length - 2];
        if (Math.hypot(p.x - last.x, p.y - last.y) < 1.2) {
          commitBspline(points.slice(0, -1));
          setGesture({ kind: "idle" });
          return;
        }
      }
      setGesture({ kind: "bspline", points });
      return;
    }

    // line / arrow / rect / ellipse: arrastar
    const type: ShapeType = tool === "line" || tool === "arrow" ? tool : tool;
    setGesture({ kind: "draw", type, start: p, current: p });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = toMeters(e);
    const g = gestureRef.current;

    if (g.kind === "pan") {
      // p já está em unidades do viewBox; o delta é direto (sem multiplicar por zoom)
      // (a posição é absoluta a partir do início do gesto, então não acumula erro)
      setPan({
        x: pan.x + (p.x - g.from.x),
        y: pan.y + (p.y - g.from.y),
      });
      return;
    }
    if (g.kind === "draw") {
      setGesture({ ...g, current: p });
      return;
    }
    if (g.kind === "move-player") {
      const pl = state.players.find((q) => q.id === g.id);
      if (pl) controller.movePlayer(g.id, pl.x + (p.x - g.from.x), pl.y + (p.y - g.from.y));
      setGesture({ ...g, from: p });
      return;
    }
    if (g.kind === "move-shape") {
      const s = state.shapes.find((q) => q.id === g.id);
      if (s) {
        const dx = p.x - g.from.x;
        const dy = p.y - g.from.y;
        controller.updateShape(g.id, { points: s.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) });
      }
      setGesture({ ...g, from: p });
      return;
    }
    if (g.kind === "move-point" || g.kind === "resize") {
      const s = state.shapes.find((q) => q.id === g.shapeId);
      if (s) {
        const pts = [...s.points];
        if (g.kind === "move-point") {
          pts[g.index] = { x: p.x, y: p.y };
        } else {
          // resize: mantém o canto oposto fixo
          const [a, b] = s.points;
          const minX = Math.min(a.x, b.x);
          const maxX = Math.max(a.x, b.x);
          const minY = Math.min(a.y, b.y);
          const maxY = Math.max(a.y, b.y);
          const corners = [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY },
          ];
          // canto oposto = o que não está sendo arrastado
          const other = corners[(g.index + 2) % 4];
          const c = { x: p.x, y: p.y };
          pts[0] = { x: Math.min(other.x, c.x), y: Math.min(other.y, c.y) };
          pts[1] = { x: Math.max(other.x, c.x), y: Math.max(other.y, c.y) };
        }
        controller.updateShape(g.shapeId, { points: pts });
      }
      setGesture({ ...g, from: p });
      return;
    }
  };

  const onPointerUp = (_e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (g.kind === "draw") {
      const dx = g.current.x - g.start.x;
      const dy = g.current.y - g.start.y;
      if (Math.hypot(dx, dy) > 0.4) {
        controller.addShape({
          type: g.type,
          points: [
            { x: g.start.x, y: g.start.y },
            { x: g.current.x, y: g.current.y },
          ],
          color,
        });
      }
    }
    setGesture({ kind: "idle" });
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // clique direito remove o último ponto da curva
    const g = gestureRef.current;
    if (g.kind === "bspline") {
      const pts = g.points.slice(0, -1);
      setGesture(pts.length ? { kind: "bspline", points: pts } : { kind: "idle" });
    }
  };

  // ---------------------------------------------------------------- render
  const selectedShape = selectedId?.startsWith("s")
    ? state.shapes.find((s) => s.id === selectedId)
    : undefined;
  const selectedPlayer = selectedId?.startsWith("p")
    ? state.players.find((p) => p.id === selectedId)
    : undefined;

  const draftShape: Shape | null =
    gesture.kind === "draw"
      ? {
          id: "draft",
          type: gesture.type,
          points: [gesture.start, gesture.current],
          color,
          width: 0.35,
          dashed: false,
          text: "",
          fontSize: 4,
        }
      : null;

  const isEmpty = state.players.length === 0 && state.shapes.length === 0;

  return (
    <div className="board-stage">
      {isEmpty && (
        <div className="board-empty">
          <div className="board-empty-inner">
            <strong>{t.boardEmptyTitle}</strong>
            {t.boardEmptyText}
          </div>
        </div>
      )}
      <svg
        ref={svgRef}
        className="board-svg"
        viewBox={`${pan.x} ${pan.y} ${VIEW_W / zoom} ${VIEW_H / zoom}`}
        role="img"
        aria-label={t.boardAriaLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={onContextMenu}
        onMouseDown={(e) => {
          if (e.button === 1) e.preventDefault();
        }}
        onAuxClick={(e) => e.preventDefault()}
        style={{ cursor: tool === "select" ? "default" : "crosshair" }}
      >
        {/* gramado */}
        <rect x={-BOARD_PAD} y={-BOARD_PAD} width={VIEW_W} height={VIEW_H} fill="#0d1b14" />
        <defs>
          <linearGradient id="pitch-grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e7d3c" />
            <stop offset="100%" stopColor="#145c2b" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width={state.pitch.width} height={state.pitch.height} fill="url(#pitch-grass)" rx="0.6" />
        {/* linhas do campo */}
        <g
          dangerouslySetInnerHTML={{
            __html: renderPitchMarkings(state, { lineColor: "rgba(255,255,255,0.9)", pitchColor: "#1e7d3c" }),
          }}
        />
        {/* formas */}
        {state.shapes.map((s) => (
          <ShapeSvg key={s.id} shape={s} />
        ))}
        {draftShape && <ShapeSvg shape={draftShape} />}
        {gesture.kind === "bspline" && (
          <g>
            <path
              d={catmullRomPath(gesture.points)}
              stroke={color}
              strokeWidth={0.35}
              fill="none"
              strokeLinecap="round"
              strokeDasharray="0.7 0.7"
            />
            {gesture.points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={0.5} fill={color} stroke="#000" strokeWidth={0.15} />
            ))}
          </g>
        )}
        {/* jogadores */}
        {state.players.map((p) => (
          <PlayerSvg key={p.id} player={p} selected={p.id === selectedId} />
        ))}
        {/* handles do selecionado */}
        {selectedShape && <SelectionHandles shape={selectedShape} />}
        {selectedPlayer && (
          <circle
            cx={selectedPlayer.x}
            cy={selectedPlayer.y}
            r={3.1}
            fill="none"
            stroke="#facc15"
            strokeWidth={0.25}
            strokeDasharray="0.9 0.6"
          />
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------- subcomponentes
function PlayerSvg({ player, selected }: { player: Player; selected: boolean }) {
  return (
    <g transform={`translate(${player.x} ${player.y})`} className={selected ? "player-sel" : "player"}>
      <circle r={2.4} fill={player.color} stroke="rgba(0,0,0,0.55)" strokeWidth={0.4} />
      <circle r={2.4} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={0.22} />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        y={0}
        fontSize={2.5}
        fontWeight={700}
        fill="#fff"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {player.number}
      </text>
      {player.name && (
        <text
          textAnchor="middle"
          dominantBaseline="hanging"
          y={2.4 + 0.9}
          fontSize={1.8}
          fontWeight={600}
          fill="#fff"
          style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.75)", strokeWidth: 0.5 }}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {player.name}
        </text>
      )}
    </g>
  );
}

function ShapeSvg({ shape }: { shape: Shape }) {
  const stroke = shape.color;
  const width = shape.width;
  const dash = shape.dashed ? { strokeDasharray: `${width * 2} ${width * 1.4}` } : undefined;
  const common = {
    stroke,
    strokeWidth: width,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...dash,
  };

  switch (shape.type) {
    case "line": {
      const [a, b] = shape.points;
      return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...common} />;
    }
    case "arrow": {
      const [a, b] = shape.points;
      const size = width * 6;
      const head = arrowHead(a, b, size).split(" ").map((pair) => pair.split(",").map(Number) as [number, number]);
      return (
        <g>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...common} />
          <polygon points={head.map(([x, y]) => `${x},${y}`).join(" ")} fill={stroke} />
        </g>
      );
    }
    case "bspline": {
      const d = catmullRomPath(shape.points);
      return <path d={d} {...common} />;
    }
    case "rect": {
      const [a, b] = shape.points;
      return (
        <rect
          x={Math.min(a.x, b.x)}
          y={Math.min(a.y, b.y)}
          width={Math.abs(a.x - b.x)}
          height={Math.abs(a.y - b.y)}
          {...common}
        />
      );
    }
    case "ellipse": {
      const [a, b] = shape.points;
      return (
        <ellipse
          cx={(a.x + b.x) / 2}
          cy={(a.y + b.y) / 2}
          rx={Math.abs(a.x - b.x) / 2}
          ry={Math.abs(a.y - b.y) / 2}
          {...common}
        />
      );
    }
    case "text": {
      const [a] = shape.points;
      return (
        <text
          x={a.x}
          y={a.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={shape.fontSize}
          fontWeight={600}
          fill={stroke}
          style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.7)", strokeWidth: shape.fontSize * 0.12 }}
          fontFamily="Inter, system-ui, sans-serif"
        >
          {shape.text || "Texto"}
        </text>
      );
    }
  }
}

function SelectionHandles({ shape }: { shape: Shape }) {
  const handles: Pt[] = [];
  if (shape.type === "rect" || shape.type === "ellipse") {
    const [a, b] = shape.points;
    handles.push(
      { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
      { x: Math.max(a.x, b.x), y: Math.min(a.y, b.y) },
      { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
      { x: Math.min(a.x, b.x), y: Math.max(a.y, b.y) },
    );
  } else {
    handles.push(...shape.points);
  }
  return (
    <g>
      {handles.map((h, i) => (
        <g key={i}>
          <circle cx={h.x} cy={h.y} r={0.7} fill="#facc15" stroke="#000" strokeWidth={0.2} />
        </g>
      ))}
    </g>
  );
}

// ---------------------------------------------------------------- hit test
function shapeContains(s: Shape, p: Pt): boolean {
  switch (s.type) {
    case "line":
    case "arrow":
      return distToSegment(p, s.points[0], s.points[1]) < Math.max(1.2, s.width * 2);
    case "bspline": {
      for (let i = 0; i < s.points.length - 1; i++) {
        if (distToSegment(p, s.points[i], s.points[i + 1]) < 1.4) return true;
      }
      return false;
    }
    case "rect": {
      const [a, b] = s.points;
      const minX = Math.min(a.x, b.x) - 1;
      const maxX = Math.max(a.x, b.x) + 1;
      const minY = Math.min(a.y, b.y) - 1;
      const maxY = Math.max(a.y, b.y) + 1;
      return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
    }
    case "ellipse": {
      const [a, b] = s.points;
      const rx = Math.abs(a.x - b.x) / 2 + 1;
      const ry = Math.abs(a.y - b.y) / 2 + 1;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const nx = (p.x - cx) / rx;
      const ny = (p.y - cy) / ry;
      return nx * nx + ny * ny <= 1;
    }
    case "text":
      return Math.hypot(p.x - s.points[0].x, p.y - s.points[0].y) < Math.max(2, s.fontSize * 0.8);
  }
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
