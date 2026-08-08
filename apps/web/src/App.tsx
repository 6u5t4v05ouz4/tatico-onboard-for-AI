import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FilePlus2, ImageDown } from "lucide-react";
import { BoardController, BOARD_PAD } from "@tattico/core";
import type { BoardState, Side } from "@tattico/core";
import Board, { type ToolId } from "./components/Board";
import Toolbar from "./components/Toolbar";
import Sidebar from "./components/Sidebar";
import { McpClient, type McpStatus, type TacticMeta } from "./lib/mcp";
import { downloadPng, downloadText, svgFor } from "./lib/export";
import { LANGS, LANG_STORAGE_KEY, loadLang, ui, type Lang } from "./lib/i18n";

const LS_KEY = "tattico:board:v1";
const LS_TACTICS = "tattico:tactics:v1";
const DEFAULT_MCP_URL = "http://localhost:3001";

const DOC_TITLES: Record<Lang, string> = {
  pt: "TATICO — Quadro Tático 11v11",
  en: "TATICO — Tactical Board 11v11",
};

interface LocalTactics {
  [name: string]: { state: BoardState; updatedAt: string };
}

export default function App() {
  const [controller] = useState(() => new BoardController());
  const [, forceRender] = useState(0);
  const [lang, setLang] = useState<Lang>(loadLang);
  const [tool, setTool] = useState<ToolId>("select");
  const [color, setColor] = useState("#ffffff");
  const [side, setSide] = useState<Side>("home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: -BOARD_PAD, y: -BOARD_PAD });
  const [title, setTitle] = useState(() => ui(lang).newBoardTitle);
  const [mcpUrl, setMcpUrl] = useState(DEFAULT_MCP_URL);
  const [mcpStatus, setMcpStatus] = useState<McpStatus>("off");
  const [tactics, setTactics] = useState<TacticMeta[]>([]);

  const t = ui(lang);

  const mcp = useMemo(() => new McpClient(mcpUrl), [mcpUrl]);
  const mcpRef = useRef(mcp);
  mcpRef.current = mcp;

  const pushTimer = useRef<number | null>(null);
  const lastPushedVersion = useRef(-1);
  const applyingRemote = useRef(false);

  // ------------------------------------------------------------------ render
  const state = controller.state;

  // idioma: persiste a escolha e atualiza o documento
  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      /* localStorage indisponível */
    }
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "en-US";
    document.title = DOC_TITLES[lang];
  }, [lang]);

  useEffect(() => {
    // restaura último quadro local
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as BoardState;
        if (saved && Array.isArray(saved.players)) {
          controller.loadState(saved);
          setTitle(saved.title ?? t.newBoardTitle);
        }
      }
    } catch {
      /* ignora corrompido */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  // autosave local (toda mudança)
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(LS_KEY, JSON.stringify(controller.state));
    }, 400);
    return () => clearTimeout(timeout);
  }, [state, controller]);

  // ------------------------------------------------------------------ MCP
  const pushLocalState = useCallback(() => {
    const s = controller.state;
    lastPushedVersion.current = s.version;
    void mcpRef.current.pushState(s);
  }, [controller]);

  useEffect(() => {
    controller.onChange = () => {
      forceRender((n) => n + 1);
      // autosave local já coberto pelo outro effect
      if (applyingRemote.current) return;
      if (mcpRef.current.status === "connected") {
        if (pushTimer.current) window.clearTimeout(pushTimer.current);
        pushTimer.current = window.setTimeout(pushLocalState, 250);
      }
    };
  }, [controller, pushLocalState]);

  const handleRemoteState = useCallback(
    (remote: BoardState) => {
      // ignora eco do nosso próprio push
      if (remote.version === lastPushedVersion.current) return;
      // descarta push local pendente: estado remoto é mais recente
      if (pushTimer.current) {
        window.clearTimeout(pushTimer.current);
        pushTimer.current = null;
      }
      applyingRemote.current = true;
      controller.loadState(remote);
      setTitle(remote.title ?? "");
      applyingRemote.current = false;
    },
    [controller],
  );

  useEffect(() => {
    mcp.onStatus = (s) => setMcpStatus(s);
    mcp.onState = (s) => handleRemoteState(s);
    return () => {
      mcp.onStatus = undefined;
      mcp.onState = undefined;
    };
  }, [mcp, handleRemoteState]);

  const toggleMcp = useCallback(async () => {
    if (mcpStatus === "connected" || mcpStatus === "connecting") {
      mcp.disconnect();
      refreshTactics();
      return;
    }
    mcp.connect();
    // estado inicial (caso o SSE não entregue imediatamente)
    const initial = await mcp.fetchState();
    if (initial && mcp.status === "connecting") {
      handleRemoteState(initial);
    }
    setTimeout(refreshTactics, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcp, mcpStatus, handleRemoteState]);

  // ------------------------------------------------------------------ táticas
  const refreshTactics = useCallback(async () => {
    if (mcpRef.current.status === "connected") {
      setTactics(await mcpRef.current.listTactics());
    } else {
      try {
        const raw = localStorage.getItem(LS_TACTICS);
        const map = raw ? (JSON.parse(raw) as LocalTactics) : {};
        setTactics(
          Object.entries(map)
            .map(([name, v]) => ({ name, updatedAt: v.updatedAt }))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        );
      } catch {
        setTactics([]);
      }
    }
  }, []);

  useEffect(() => {
    void refreshTactics();
  }, [refreshTactics, mcpStatus]);

  const saveTactic = useCallback(
    async (name: string) => {
      if (mcpRef.current.status === "connected") {
        await mcpRef.current.saveTactic(name);
      } else {
        const map: LocalTactics = JSON.parse(localStorage.getItem(LS_TACTICS) ?? "{}");
        map[name] = { state: controller.state, updatedAt: new Date().toISOString() };
        localStorage.setItem(LS_TACTICS, JSON.stringify(map));
      }
      void refreshTactics();
    },
    [controller, refreshTactics],
  );

  const loadTactic = useCallback(
    async (name: string) => {
      if (mcpRef.current.status === "connected") {
        await mcpRef.current.loadTactic(name);
        // o estado chega via SSE; forçamos um fetch para garantir
        const s = await mcpRef.current.fetchState();
        if (s) handleRemoteState(s);
      } else {
        const map: LocalTactics = JSON.parse(localStorage.getItem(LS_TACTICS) ?? "{}");
        const tactic = map[name];
        if (tactic) {
          controller.loadState(tactic.state);
          setTitle(tactic.state.title ?? name);
        }
      }
    },
    [controller, handleRemoteState],
  );

  const deleteTactic = useCallback(
    async (name: string) => {
      if (mcpRef.current.status === "connected") {
        await mcpRef.current.deleteTactic(name);
      } else {
        const map: LocalTactics = JSON.parse(localStorage.getItem(LS_TACTICS) ?? "{}");
        delete map[name];
        localStorage.setItem(LS_TACTICS, JSON.stringify(map));
      }
      void refreshTactics();
    },
    [refreshTactics],
  );

  // ------------------------------------------------------------------ ações
  const handleNewBoard = () => {
    controller.newBoard(t.newBoardTitle);
    setTitle(t.newBoardTitle);
    setSelectedId(null);
  };

  const handleClearBoard = () => {
    controller.newBoard(controller.state.title || t.newBoardTitle);
    setSelectedId(null);
  };

  const handleSetFormation = (s: Side, formationId: string) => {
    controller.setFormation(s, formationId);
  };

  const exportFilename = () =>
    (controller.state.title || t.defaultFilename).toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const handlePng = async () => {
    await downloadPng(controller.state, `${exportFilename()}.png`);
  };
  const handleSvg = () => {
    downloadText(svgFor(controller.state), `${exportFilename()}.svg`, "image/svg+xml");
  };

  const onFit = () => {
    setZoom(1);
    setPan({ x: -BOARD_PAD, y: -BOARD_PAD });
  };

  const handleTitle = (v: string) => {
    setTitle(v);
    controller.setTitle(v);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-ball">⚽</span>
          <div>
            <h1>TATICO</h1>
            <span className="brand-sub">{t.brandSub}</span>
          </div>
        </div>
        <div className="lang-switch" role="group" title={t.langSwitch}>
          {LANGS.map((l) => (
            <button
              key={l.id}
              className={lang === l.id ? "active" : ""}
              onClick={() => setLang(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <input
          className="title-input"
          value={title}
          onChange={(e) => handleTitle(e.target.value)}
          placeholder={t.titlePlaceholder}
        />
        <div className="topbar-actions">
          <button className="btn" onClick={handleNewBoard} title={t.newBoard}>
            <FilePlus2 size={16} /> {t.newBoard}
          </button>
          <button className="btn" onClick={handleSvg} title={t.downloadSvg}>
            <Download size={16} /> SVG
          </button>
          <button className="btn primary" onClick={handlePng} title={t.exportPngTitle}>
            <ImageDown size={16} /> {t.exportPng}
          </button>
        </div>
      </header>

      <div className="main">
        <Toolbar
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          side={side}
          setSide={setSide}
          lang={lang}
          onUndo={() => controller.undo()}
          onRedo={() => controller.redo()}
          canUndo={controller.canUndo}
          canRedo={controller.canRedo}
          onClearBoard={handleClearBoard}
          zoom={zoom}
          setZoom={setZoom}
          onFit={onFit}
        />
        <main className="board-area">
          <Board
            state={state}
            controller={controller}
            tool={tool}
            color={color}
            side={side}
            selectedId={selectedId}
            onSelect={setSelectedId}
            zoom={zoom}
            pan={pan}
            setZoom={setZoom}
            setPan={setPan}
          />
          <footer className="statusbar">
            <span className="status-tool">
              {t.statusTool} {toolLabel(lang, tool)}
            </span>
            <span className={`status-mcp ${mcpStatus}`}>
              {mcpStatus === "connected" && t.statusMcpConnected}
              {mcpStatus === "connecting" && t.statusMcpConnecting}
              {mcpStatus === "error" && t.statusMcpError}
              {mcpStatus === "off" && t.statusMcpOff}
            </span>
            <span className="status-version">v{state.version}</span>
          </footer>
        </main>
        <Sidebar
          state={state}
          selectedId={selectedId}
          lang={lang}
          onUpdatePlayer={(id, patch) => controller.updatePlayer(id, patch)}
          onUpdatePlayerInstructions={(id, phase, text) => controller.updatePlayerInstructions(id, phase, text)}
          onRemovePlayer={(id) => controller.removePlayer(id)}
          onUpdateShape={(id, patch) => controller.updateShape(id, patch)}
          onRemoveShape={(id) => controller.removeShape(id)}
          onSetFormation={handleSetFormation}
          onSaveTactic={saveTactic}
          onLoadTactic={loadTactic}
          onDeleteTactic={deleteTactic}
          tactics={tactics}
          refreshTactics={refreshTactics}
          mcp={mcp}
          mcpStatus={mcpStatus}
          onToggleMcp={toggleMcp}
          mcpUrl={mcpUrl}
          onMcpUrlChange={(url) => {
            if (mcpStatus === "connected" || mcpStatus === "connecting") mcp.disconnect();
            setMcpUrl(url);
          }}
        />
      </div>
    </div>
  );
}

function toolLabel(lang: Lang, id: ToolId): string {
  return ui(lang).tools.find((x) => x.id === id)?.label ?? id;
}
