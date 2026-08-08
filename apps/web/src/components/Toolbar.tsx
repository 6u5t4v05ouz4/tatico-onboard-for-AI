import {
  Circle,
  Eraser,
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
}: ToolbarProps) {
  const t = ui(lang);
  const tools = getTools(lang);
  return (
    <aside className="toolbar">
      <div className="toolbar-group" title={t.groupTools}>
        {tools.map((toolInfo) => {
          const Icon = TOOL_ICONS[toolInfo.id];
          return (
            <button
              key={toolInfo.id}
              className={`tool-btn ${tool === toolInfo.id ? "active" : ""}`}
              onClick={() => setTool(toolInfo.id)}
              title={toolInfo.hint}
            >
              <Icon size={18} />
              <span className="tool-label">{toolInfo.label}</span>
            </button>
          );
        })}
      </div>

      <div className="toolbar-group" title={t.groupTeam}>
        <button
          className={`side-btn ${side === "home" ? "active home" : ""}`}
          onClick={() => setSide("home")}
          title={t.sideHomeHint}
        >
          <span className="side-dot" style={{ background: "#ef4444" }} />
          {t.sideHome}
        </button>
        <button
          className={`side-btn ${side === "away" ? "active away" : ""}`}
          onClick={() => setSide("away")}
          title={t.sideAwayHint}
        >
          <span className="side-dot" style={{ background: "#3b82f6" }} />
          {t.sideAway}
        </button>
      </div>

      <div className="toolbar-group" title={t.groupColors}>
        {PALETTE.map((c) => (
          <button
            key={c.id}
            className={`color-btn ${color === c.value ? "active" : ""}`}
            style={{ background: c.value }}
            onClick={() => setColor(c.value)}
            title={t.colors[c.id] ?? c.name}
          />
        ))}
        <button
          className={`color-btn ${color === "#ffffff" ? "active" : ""}`}
          style={{ background: "#ffffff" }}
          onClick={() => setColor("#ffffff")}
          title={t.white}
        />
      </div>

      <div className="toolbar-group" title={t.groupEdit}>
        <button className="tool-btn" onClick={onUndo} disabled={!canUndo} title={t.undo}>
          <Undo2 size={18} />
        </button>
        <button className="tool-btn" onClick={onRedo} disabled={!canRedo} title={t.redo}>
          <Redo2 size={18} />
        </button>
        <button className="tool-btn danger" onClick={onClearBoard} title={t.clearBoard}>
          <Eraser size={18} />
        </button>
      </div>

      <div className="toolbar-group" title="Zoom">
        <button className="tool-btn" onClick={() => setZoom(Math.min(6, zoom * 1.25))} title={t.zoomIn}>
          <ZoomIn size={18} />
        </button>
        <button className="tool-btn" onClick={() => setZoom(Math.max(0.4, zoom / 1.25))} title={t.zoomOut}>
          <ZoomOut size={18} />
        </button>
        <button className="tool-btn" onClick={onFit} title={t.fit}>
          <Maximize size={18} />
        </button>
        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
      </div>
    </aside>
  );
}
