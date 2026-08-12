import { useState } from "react";
import { FolderOpen, RefreshCw, Save, Shield, Target, Trash2, Wifi } from "lucide-react";
import { FORMATIONS, PALETTE, TEAM_COLORS } from "@tattico/core";
import type { BoardState, Player, Shape, Side } from "@tattico/core";
import { ui, type Lang } from "../lib/i18n";
import type { McpClient, McpStatus, TacticMeta } from "../lib/mcp";

interface SidebarProps {
  state: BoardState;
  selectedId: string | null;
  lang: Lang;
  onUpdatePlayer: (id: string, patch: Partial<Pick<Player, "number" | "name" | "color">>) => void;
  onUpdatePlayerInstructions: (id: string, phase: "withBall" | "withoutBall", text: string) => void;
  onRemovePlayer: (id: string) => void;
  onUpdateShape: (id: string, patch: Partial<Pick<Shape, "color" | "width" | "dashed" | "text" | "fontSize">>) => void;
  onRemoveShape: (id: string) => void;
  onSetFormation: (side: Side, formationId: string) => void;
  onSaveTactic: (name: string) => void;
  onLoadTactic: (name: string) => void;
  onDeleteTactic: (name: string) => void;
  tactics: TacticMeta[];
  refreshTactics: () => void;
  mcp: McpClient;
  mcpStatus: McpStatus;
  onToggleMcp: () => void;
  mcpUrl: string;
  onMcpUrlChange: (url: string) => void;
}

export default function Sidebar(props: SidebarProps) {
  const {
    state,
    selectedId,
    lang,
    onUpdatePlayer,
    onUpdatePlayerInstructions,
    onRemovePlayer,
    onUpdateShape,
    onRemoveShape,
    onSetFormation,
    onSaveTactic,
    onLoadTactic,
    onDeleteTactic,
    tactics,
    refreshTactics,
    mcpStatus,
    onToggleMcp,
    mcpUrl,
    onMcpUrlChange,
  } = props;

  const t = ui(lang);

  const selectedPlayer = selectedId?.startsWith("p") ? state.players.find((p) => p.id === selectedId) : undefined;
  const selectedShape = selectedId?.startsWith("s") ? state.shapes.find((s) => s.id === selectedId) : undefined;

  const [tacticName, setTacticName] = useState("");
  const [formationSide, setFormationSide] = useState<Side>("home");
  const [formationId, setFormationId] = useState("4-3-3");

  const playerCount = state.players.length;

  return (
    <aside className="sidebar">
      <section className="panel">
        <h3 className="panel-title">
          <Wifi size={14} /> {t.panelMcp}
        </h3>
        <div className="mcp-box">
          <span className={`mcp-dot ${mcpStatus}`} />
          <span className="mcp-text">
            {mcpStatus === "connected" && t.mcpConnected}
            {mcpStatus === "connecting" && t.mcpConnecting}
            {mcpStatus === "error" && t.mcpError}
            {mcpStatus === "off" && t.mcpOff}
          </span>
          <button className="btn small" onClick={onToggleMcp}>
            {mcpStatus === "connected" || mcpStatus === "connecting" ? t.disconnect : t.connect}
          </button>
        </div>
        <input
          className="input"
          value={mcpUrl}
          onChange={(e) => onMcpUrlChange(e.target.value)}
          placeholder="http://localhost:3001"
          title={t.mcpUrlTitle}
        />
        {mcpStatus === "off" && (
          <p className="hint">
            {t.hintMcpStart} <code>npm run dev:mcp</code> {t.hintMcpEnd}
          </p>
        )}
      </section>

      <section className="panel">
        <h3 className="panel-title">
          <FolderOpen size={14} /> {t.panelTactics}
        </h3>
        <div className="row">
          <input
            className="input"
            value={tacticName}
            placeholder={t.tacticNamePlaceholder}
            onChange={(e) => setTacticName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tacticName.trim()) {
                onSaveTactic(tacticName.trim());
                setTacticName("");
              }
            }}
          />
          <button
            className="btn small"
            disabled={!tacticName.trim()}
            onClick={() => {
              onSaveTactic(tacticName.trim());
              setTacticName("");
            }}
          >
            <Save size={14} /> {t.save}
          </button>
        </div>
        <ul className="tactic-list">
          {tactics.length === 0 && <li className="empty">{t.noneSaved}</li>}
          {tactics.map((tactic) => (
            <li key={tactic.name} className="tactic-item">
              <button className="tactic-name" onClick={() => onLoadTactic(tactic.name)} title={t.loadTactic}>
                {tactic.name}
              </button>
              <button
                className="icon-btn danger"
                onClick={() => onDeleteTactic(tactic.name)}
                title={t.deleteTactic}
                aria-label={t.deleteTactic}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
        <button className="btn small full" onClick={refreshTactics}>
          <RefreshCw size={14} /> {t.refreshList}
        </button>
      </section>

      <section className="panel">
        <h3 className="panel-title">{t.panelFormations}</h3>
        <div className="row">
          <select
            className="input"
            value={formationSide}
            onChange={(e) => setFormationSide(e.target.value as Side)}
          >
            <option value="home">{t.sideHomeOption}</option>
            <option value="away">{t.sideAwayOption}</option>
          </select>
        </div>
        <div className="row">
          <select className="input" value={formationId} onChange={(e) => setFormationId(e.target.value)}>
            {FORMATIONS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <button
            className="btn small primary"
            onClick={() => onSetFormation(formationSide, formationId)}
          >
            {t.apply}
          </button>
        </div>
        <p className="hint">{t.formationHint}</p>
      </section>

      {selectedPlayer && (
        <section className="panel selected-panel">
          <h3 className="panel-title">{t.playerPanel(selectedPlayer.number)}</h3>
          <div className="field">
            <label>{t.fieldName}</label>
            <input
              className="input"
              value={selectedPlayer.name}
              placeholder={t.noName}
              onChange={(e) => onUpdatePlayer(selectedPlayer.id, { name: e.target.value })}
            />
          </div>
          <div className="field">
            <label>{t.fieldNumber}</label>
            <input
              className="input"
              type="number"
              min={1}
              max={99}
              value={selectedPlayer.number}
              onChange={(e) => onUpdatePlayer(selectedPlayer.id, { number: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label>{t.fieldColor}</label>
            <div className="swatches">
              {PALETTE.map((c) => (
                <button
                  key={c.id}
                  className={`swatch ${selectedPlayer.color === c.value ? "active" : ""}`}
                  style={{ background: c.value }}
                  title={t.colors[c.id] ?? c.name}
                  aria-label={t.colors[c.id] ?? c.name}
                  aria-pressed={selectedPlayer.color === c.value}
                  onClick={() => onUpdatePlayer(selectedPlayer.id, { color: c.value })}
                />
              ))}
              <button
                className={`swatch ${selectedPlayer.color === TEAM_COLORS.home ? "active" : ""}`}
                style={{ background: TEAM_COLORS.home }}
                aria-label={t.sideHome}
                aria-pressed={selectedPlayer.color === TEAM_COLORS.home}
                onClick={() => onUpdatePlayer(selectedPlayer.id, { color: TEAM_COLORS.home })}
              />
              <button
                className={`swatch ${selectedPlayer.color === TEAM_COLORS.away ? "active" : ""}`}
                style={{ background: TEAM_COLORS.away }}
                aria-label={t.sideAway}
                aria-pressed={selectedPlayer.color === TEAM_COLORS.away}
                onClick={() => onUpdatePlayer(selectedPlayer.id, { color: TEAM_COLORS.away })}
              />
            </div>
          </div>
          <div className="field instructions-field">
            <label>{t.instructionsTitle}</label>
            <div className="instruction-box">
              <span className="phase-tag phase-with">
                <Target size={12} /> {t.withBall}
              </span>
              <textarea
                className="textarea"
                rows={4}
                value={selectedPlayer.instructions?.withBall ?? ""}
                placeholder={t.withBallPlaceholder}
                onChange={(e) => onUpdatePlayerInstructions(selectedPlayer.id, "withBall", e.target.value)}
              />
            </div>
            <div className="instruction-box">
              <span className="phase-tag phase-without">
                <Shield size={12} /> {t.withoutBall}
              </span>
              <textarea
                className="textarea"
                rows={4}
                value={selectedPlayer.instructions?.withoutBall ?? ""}
                placeholder={t.withoutBallPlaceholder}
                onChange={(e) => onUpdatePlayerInstructions(selectedPlayer.id, "withoutBall", e.target.value)}
              />
            </div>
            <p className="hint">
              {t.instrHintStart} <code>update_player_instructions</code>
              {t.instrHintEnd}
            </p>
          </div>
          <button className="btn small danger full" onClick={() => onRemovePlayer(selectedPlayer.id)}>
            <Trash2 size={14} /> {t.removePlayer}
          </button>
        </section>
      )}

      {selectedShape && (
        <section className="panel selected-panel">
          <h3 className="panel-title">
            {t.shapePanel} {t.shapeType[selectedShape.type] ?? selectedShape.type}
          </h3>
          {selectedShape.type === "text" && (
            <div className="field">
              <label>{t.fieldText}</label>
              <input
                className="input"
                value={selectedShape.text}
                onChange={(e) => onUpdateShape(selectedShape.id, { text: e.target.value })}
              />
            </div>
          )}
          <div className="field">
            <label>{t.fieldColor}</label>
            <div className="swatches">
              {PALETTE.map((c) => (
                <button
                  key={c.id}
                  className={`swatch ${selectedShape.color === c.value ? "active" : ""}`}
                  style={{ background: c.value }}
                  title={t.colors[c.id] ?? c.name}
                  aria-label={t.colors[c.id] ?? c.name}
                  aria-pressed={selectedShape.color === c.value}
                  onClick={() => onUpdateShape(selectedShape.id, { color: c.value })}
                />
              ))}
              <button
                className={`swatch ${selectedShape.color === "#ffffff" ? "active" : ""}`}
                style={{ background: "#ffffff" }}
                aria-label={t.white}
                aria-pressed={selectedShape.color === "#ffffff"}
                onClick={() => onUpdateShape(selectedShape.id, { color: "#ffffff" })}
              />
            </div>
          </div>
          {selectedShape.type !== "text" && (
            <>
              <div className="field">
                <label>{t.thickness(selectedShape.width.toFixed(2))}</label>
                <input
                  type="range"
                  min={0.1}
                  max={1.5}
                  step={0.05}
                  value={selectedShape.width}
                  onChange={(e) => onUpdateShape(selectedShape.id, { width: Number(e.target.value) })}
                />
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={selectedShape.dashed}
                  onChange={(e) => onUpdateShape(selectedShape.id, { dashed: e.target.checked })}
                />
                {t.dashed}
              </label>
            </>
          )}
          <button className="btn small danger full" onClick={() => onRemoveShape(selectedShape.id)}>
            <Trash2 size={14} /> {t.removeShape}
          </button>
        </section>
      )}

      {!selectedId && (
        <section className="panel">
          <h3 className="panel-title">{t.panelTips}</h3>
          <ul className="tips">
            {t.tips.map((tip, i) => (
              <li key={i}>
                {tip.strong && <strong>{tip.strong}</strong>} {tip.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <h3 className="panel-title">{t.panelExport}</h3>
        <p className="hint">{t.exportHint}</p>
      </section>
      <div className="stat-chip">{t.statChip(playerCount, state.shapes.length)}</div>
    </aside>
  );
}
