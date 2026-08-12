import {
  Box,
  Circle,
  Eraser,
  LayoutGrid,
  Maximize,
  MousePointer2,
  MoveUpRight,
  PersonStanding,
  Redo2,
  Slash,
  Spline,
  Square,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { PALETTE } from "@tattico/core";
import type { Side } from "@tattico/core";
import { ui, type Lang } from "../lib/i18n";
import type { ToolId } from "./Board";
import { getTools } from "./Board";

export type ViewMode = "2d" | "3d";

interface ToolbarProps {
  tool: ToolId;
  setTool: (t: ToolId) => void;
  color: string;
  setColor: (c: string) => void;
  side: Side;
  setSide: (s: Side) => void;
  lang: Lang;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClearBoard: () => void;
  zoom: number;
  setZoom: (z: number) => void;
  onFit: () => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
}

const TOOL_ICONS: Record<ToolId, React.ComponentType<{ size?: number | string; className?: string }>> = {
  select: MousePointer2,
  player: PersonStanding,
  line: Slash,
  arrow: MoveUpRight,
  bspline: Spline,
  rect: Square,
  ellipse: Circle,
  text: Type,
};

export default function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  side,
  setSide,
  lang,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClearBoard,
  zoom,
  setZoom,
  onFit,
  viewMode,
  setViewMode,
}: ToolbarProps) {
  const t = ui(lang);
  const tools = getTools(lang);
  return (
    <div className="floating-toolbar-wrapper">
      <aside className="floating-toolbar">
        {/* Modo de visualização: 2D (edição) | 3D (visualização) */}
        <div className="toolbar-group horizontal team-segmented" title={t.groupView}>
          <button
            className={`side-btn ${viewMode === "2d" ? "active" : ""}`}
            onClick={() => setViewMode("2d")}
            title={t.view2dHint}
            aria-pressed={viewMode === "2d"}
          >
            <LayoutGrid size={14} />
            <span className="side-label">{t.view2d}</span>
          </button>
          <button
            className={`side-btn ${viewMode === "3d" ? "active" : ""}`}
            onClick={() => setViewMode("3d")}
            title={t.view3dHint}
            aria-pressed={viewMode === "3d"}
          >
            <Box size={14} />
            <span className="side-label">{t.view3d}</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Ferramentas de Seleção e Desenho */}
        <div className="toolbar-group horizontal" title={t.groupTools}>
          {tools.map((toolInfo) => {
            const Icon = TOOL_ICONS[toolInfo.id];
            const isActive = tool === toolInfo.id;
            return (
              <button
                key={toolInfo.id}
                className={`tool-btn icon-only ${isActive ? "active" : ""}`}
                onClick={() => setTool(toolInfo.id)}
                title={toolInfo.hint}
                aria-pressed={isActive}
                aria-label={toolInfo.label}
              >
                <Icon size={19} />
                <span className="tooltip-popup">{toolInfo.label}</span>
              </button>
            );
          })}
        </div>

        <div className="toolbar-divider" />

        {/* Seletor de Time */}
        <div className="toolbar-group horizontal team-segmented" title={t.groupTeam}>
          <button
            className={`side-btn ${side === "home" ? "active home" : ""}`}
            onClick={() => setSide("home")}
            title={t.sideHomeHint}
            aria-pressed={side === "home"}
          >
            <span className="side-dot" style={{ background: "#ef4444" }} />
            <span className="side-label">{t.sideHome}</span>
          </button>
          <button
            className={`side-btn ${side === "away" ? "active away" : ""}`}
            onClick={() => setSide("away")}
            title={t.sideAwayHint}
            aria-pressed={side === "away"}
          >
            <span className="side-dot" style={{ background: "#3b82f6" }} />
            <span className="side-label">{t.sideAway}</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Paleta de Cores (Horizontal Swatches) */}
        <div className="toolbar-group horizontal color-row" title={t.groupColors}>
          {PALETTE.map((c) => (
            <button
              key={c.id}
              className={`color-btn ${color === c.value ? "active" : ""}`}
              style={{ background: c.value }}
              onClick={() => setColor(c.value)}
              title={t.colors[c.id] ?? c.name}
              aria-label={t.colors[c.id] ?? c.name}
              aria-pressed={color === c.value}
            />
          ))}
          <button
            className={`color-btn ${color === "#ffffff" ? "active" : ""}`}
            style={{ background: "#ffffff" }}
            onClick={() => setColor("#ffffff")}
            title={t.white}
            aria-label={t.white}
            aria-pressed={color === "#ffffff"}
          />
        </div>

        <div className="toolbar-divider" />

        {/* Histórico & Edição */}
        <div className="toolbar-group horizontal" title={t.groupEdit}>
          <button className="tool-btn icon-only" onClick={onUndo} disabled={!canUndo} title={t.undo} aria-label={t.undo}>
            <Undo2 size={18} />
          </button>
          <button className="tool-btn icon-only" onClick={onRedo} disabled={!canRedo} title={t.redo} aria-label={t.redo}>
            <Redo2 size={18} />
          </button>
          <button className="tool-btn icon-only danger" onClick={onClearBoard} title={t.clearBoard} aria-label={t.clearBoard}>
            <Eraser size={18} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Zoom */}
        <div className="toolbar-group horizontal zoom-group" title="Zoom">
          <button className="tool-btn icon-only" onClick={() => setZoom(Math.min(6, zoom * 1.25))} title={t.zoomIn} aria-label={t.zoomIn}>
            <ZoomIn size={18} />
          </button>
          <button className="tool-btn icon-only" onClick={() => setZoom(Math.max(0.4, zoom / 1.25))} title={t.zoomOut} aria-label={t.zoomOut}>
            <ZoomOut size={18} />
          </button>
          <button className="tool-btn icon-only" onClick={onFit} title={t.fit} aria-label={t.fit}>
            <Maximize size={18} />
          </button>
          <span className="zoom-badge">{Math.round(zoom * 100)}%</span>
        </div>
      </aside>
    </div>
  );
}
