/**
 * Internacionalização leve do app — PT-BR e EN-US.
 * Sem dependências: um dicionário tipado por idioma + helpers de detecção.
 */

export type Lang = "pt" | "en";

export const LANGS: { id: Lang; label: string }[] = [
  { id: "pt", label: "PT-BR" },
  { id: "en", label: "EN" },
];

export const LANG_STORAGE_KEY = "tattico:lang";

/** Detecta o idioma do navegador (EN → inglês; qualquer outro → PT). */
export function detectLang(): Lang {
  try {
    const l = (navigator.language || "pt-BR").toLowerCase();
    return l.startsWith("en") ? "en" : "pt";
  } catch {
    return "pt";
  }
}

/** Idioma salvo pelo usuário, senão detectado do navegador. */
export function loadLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === "pt" || saved === "en") return saved;
  } catch {
    /* localStorage indisponível */
  }
  return detectLang();
}

export function ui(lang: Lang): Dict {
  return lang === "en" ? en : pt;
}

export interface Tip {
  strong?: string;
  text: string;
}

export interface Dict {
  // topbar
  brandSub: string;
  langSwitch: string;
  titlePlaceholder: string;
  newBoard: string;
  newBoardTitle: string;
  downloadSvg: string;
  exportPng: string;
  exportPngTitle: string;
  // statusbar
  statusTool: string;
  statusMcpConnected: string;
  statusMcpConnecting: string;
  statusMcpError: string;
  statusMcpOff: string;
  // ferramentas (labels + hints)
  tools: { id: string; label: string; hint: string }[];
  // toolbar
  groupTools: string;
  groupTeam: string;
  sideHome: string;
  sideAway: string;
  sideHomeHint: string;
  sideAwayHint: string;
  groupColors: string;
  white: string;
  groupEdit: string;
  undo: string;
  redo: string;
  clearBoard: string;
  zoomIn: string;
  zoomOut: string;
  fit: string;
  colors: Record<string, string>;
  // sidebar — MCP
  panelMcp: string;
  mcpConnected: string;
  mcpConnecting: string;
  mcpError: string;
  mcpOff: string;
  connect: string;
  disconnect: string;
  hintMcpStart: string;
  hintMcpEnd: string;
  mcpUrlTitle: string;
  // sidebar — táticas salvas
  panelTactics: string;
  save: string;
  tacticNamePlaceholder: string;
  noneSaved: string;
  loadTactic: string;
  deleteTactic: string;
  refreshList: string;
  // sidebar — formações
  panelFormations: string;
  sideHomeOption: string;
  sideAwayOption: string;
  apply: string;
  formationHint: string;
  // sidebar — jogador
  playerPanel: (n: number) => string;
  fieldName: string;
  noName: string;
  fieldNumber: string;
  fieldColor: string;
  instructionsTitle: string;
  withBall: string;
  withoutBall: string;
  withBallPlaceholder: string;
  withoutBallPlaceholder: string;
  instrHintStart: string;
  instrHintEnd: string;
  removePlayer: string;
  // sidebar — forma
  shapePanel: string;
  fieldText: string;
  shapeType: Record<string, string>;
  thickness: (w: string) => string;
  dashed: string;
  removeShape: string;
  // sidebar — dicas / exportar
  panelTips: string;
  tips: Tip[];
  panelExport: string;
  exportHint: string;
  statChip: (players: number, shapes: number) => string;
  defaultFilename: string;
}

const pt: Dict = {
  // topbar
  brandSub: "Quadro tático · Futebol 11v11",
  langSwitch: "Idioma",
  titlePlaceholder: "Título da tática",
  newBoard: "Novo",
  newBoardTitle: "Nova tática",
  downloadSvg: "Baixar SVG",
  exportPng: "Exportar PNG",
  exportPngTitle: "Baixar imagem PNG em alta resolução",
  // statusbar
  statusTool: "Ferramenta:",
  statusMcpConnected: "● IA conectada (MCP)",
  statusMcpConnecting: "◌ Conectando à IA…",
  statusMcpError: "✕ Servidor MCP inacessível",
  statusMcpOff: "○ Modo local — sem IA",
  // ferramentas
  tools: [
    { id: "select", label: "Selecionar", hint: "Clique para selecionar, arraste para mover" },
    { id: "player", label: "Jogador", hint: "Clique no campo para adicionar jogador" },
    { id: "line", label: "Linha", hint: "Arraste para desenhar uma linha" },
    { id: "arrow", label: "Seta", hint: "Arraste para desenhar uma seta" },
    { id: "bspline", label: "Curva", hint: "Clique nos pontos, dê 2 cliques ou Enter para terminar" },
    { id: "rect", label: "Retângulo", hint: "Arraste para desenhar um retângulo" },
    { id: "ellipse", label: "Elipse", hint: "Arraste para desenhar uma elipse" },
    { id: "text", label: "Texto", hint: "Clique para adicionar texto" },
  ],
  // toolbar
  groupTools: "Ferramentas",
  groupTeam: "Time para novos jogadores",
  sideHome: "Casa",
  sideAway: "Fora",
  sideHomeHint: "Adicionar jogadores do time da casa (vermelho)",
  sideAwayHint: "Adicionar jogadores do time visitante (azul)",
  groupColors: "Cores",
  white: "Branco",
  groupEdit: "Edição",
  undo: "Desfazer (Ctrl+Z)",
  redo: "Refazer (Ctrl+Shift+Z)",
  clearBoard: "Limpar quadro",
  zoomIn: "Aproximar",
  zoomOut: "Afastar",
  fit: "Ajustar à tela",
  colors: {
    red: "Vermelho",
    blue: "Azul",
    green: "Verde",
    yellow: "Amarelo",
    orange: "Laranja",
    purple: "Roxo",
  },
  // sidebar — MCP
  panelMcp: "Conexão com IA (MCP)",
  mcpConnected: "Conectado — a IA vê e edita este quadro ao vivo",
  mcpConnecting: "Conectando…",
  mcpError: "Servidor inacessível",
  mcpOff: "Desconectado — modo local",
  connect: "Conectar",
  disconnect: "Desconectar",
  hintMcpStart: "Inicie o servidor com",
  hintMcpEnd: "(transporte HTTP) e clique em Conectar.",
  mcpUrlTitle: "URL do servidor MCP",
  // sidebar — táticas salvas
  panelTactics: "Táticas salvas",
  save: "Salvar",
  tacticNamePlaceholder: "Nome da tática",
  noneSaved: "Nenhuma tática salva",
  loadTactic: "Carregar",
  deleteTactic: "Apagar",
  refreshList: "Atualizar lista",
  // sidebar — formações
  panelFormations: "Formações",
  sideHomeOption: "Time da casa (vermelho)",
  sideAwayOption: "Time visitante (azul)",
  apply: "Aplicar",
  formationHint:
    "Substitui os jogadores do time escolhido pelos 11 da formação. Posições podem ser ajustadas arrastando.",
  // sidebar — jogador
  playerPanel: (n) => `Jogador ${n}`,
  fieldName: "Nome",
  noName: "Sem nome",
  fieldNumber: "Número",
  fieldColor: "Cor",
  instructionsTitle: "Instruções táticas",
  withBall: "⚽ Com posse",
  withoutBall: "🛡 Sem posse",
  withBallPlaceholder:
    "Como este jogador deve atuar quando o time tem a bola (posicionamento, movimentação, passes, finalização)…",
  withoutBallPlaceholder:
    "Como este jogador deve atuar quando o time não tem a bola (marcação, cobertura, pressão, recomposição)…",
  instrHintStart: "Você escreve aqui ou pede para a IA preencher via MCP (ferramenta",
  instrHintEnd: ").",
  removePlayer: "Remover jogador",
  // sidebar — forma
  shapePanel: "Forma:",
  fieldText: "Texto",
  shapeType: {
    line: "Linha",
    arrow: "Seta",
    bspline: "Curva",
    rect: "Retângulo",
    ellipse: "Elipse",
    text: "Texto",
  },
  thickness: (w) => `Espessura: ${w} m`,
  dashed: "Tracejado",
  removeShape: "Remover forma",
  // sidebar — dicas / exportar
  panelTips: "Dicas",
  tips: [
    { text: "Selecione a ferramenta e desenhe direto no campo." },
    { strong: "Jogador:", text: "clique para adicionar (usa a cor e o time ativos)." },
    { strong: "Curva:", text: "clique nos pontos; duplo clique, Enter ou botão direito termina." },
    { text: "Arraste jogadores/formas para reposicionar." },
    { strong: "Delete", text: "remove o selecionado · Ctrl+Z desfaz." },
    { text: "Scroll do mouse dá zoom; segure Shift e arraste para mover a câmera." },
  ],
  panelExport: "Exportar",
  exportHint: "Gere a imagem do quadro em alta resolução ou compartilhe o estado (JSON) com a IA via MCP.",
  statChip: (players, shapes) => `${players} jogadores · ${shapes} formas`,
  defaultFilename: "quadro-tatico",
};

const en: Dict = {
  // topbar
  brandSub: "Tactical board · 11v11 football",
  langSwitch: "Language",
  titlePlaceholder: "Tactic title",
  newBoard: "New",
  newBoardTitle: "New tactic",
  downloadSvg: "Download SVG",
  exportPng: "Export PNG",
  exportPngTitle: "Download high-resolution PNG image",
  // statusbar
  statusTool: "Tool:",
  statusMcpConnected: "● AI connected (MCP)",
  statusMcpConnecting: "◌ Connecting to AI…",
  statusMcpError: "✕ MCP server unreachable",
  statusMcpOff: "○ Local mode — no AI",
  // tools
  tools: [
    { id: "select", label: "Select", hint: "Click to select, drag to move" },
    { id: "player", label: "Player", hint: "Click the pitch to add a player" },
    { id: "line", label: "Line", hint: "Drag to draw a line" },
    { id: "arrow", label: "Arrow", hint: "Drag to draw an arrow" },
    { id: "bspline", label: "Curve", hint: "Click points; double-click or Enter to finish" },
    { id: "rect", label: "Rectangle", hint: "Drag to draw a rectangle" },
    { id: "ellipse", label: "Ellipse", hint: "Drag to draw an ellipse" },
    { id: "text", label: "Text", hint: "Click to add text" },
  ],
  // toolbar
  groupTools: "Tools",
  groupTeam: "Team for new players",
  sideHome: "Home",
  sideAway: "Away",
  sideHomeHint: "Add home team players (red)",
  sideAwayHint: "Add away team players (blue)",
  groupColors: "Colors",
  white: "White",
  groupEdit: "Edit",
  undo: "Undo (Ctrl+Z)",
  redo: "Redo (Ctrl+Shift+Z)",
  clearBoard: "Clear board",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  fit: "Fit to screen",
  colors: {
    red: "Red",
    blue: "Blue",
    green: "Green",
    yellow: "Yellow",
    orange: "Orange",
    purple: "Purple",
  },
  // sidebar — MCP
  panelMcp: "AI connection (MCP)",
  mcpConnected: "Connected — the AI sees and edits this board live",
  mcpConnecting: "Connecting…",
  mcpError: "Server unreachable",
  mcpOff: "Disconnected — local mode",
  connect: "Connect",
  disconnect: "Disconnect",
  hintMcpStart: "Start the server with",
  hintMcpEnd: "(HTTP transport), then click Connect.",
  mcpUrlTitle: "MCP server URL",
  // sidebar — saved tactics
  panelTactics: "Saved tactics",
  save: "Save",
  tacticNamePlaceholder: "Tactic name",
  noneSaved: "No saved tactics",
  loadTactic: "Load",
  deleteTactic: "Delete",
  refreshList: "Refresh list",
  // sidebar — formations
  panelFormations: "Formations",
  sideHomeOption: "Home team (red)",
  sideAwayOption: "Away team (blue)",
  apply: "Apply",
  formationHint:
    "Replaces the chosen team's players with the formation's 11. Positions can be adjusted by dragging.",
  // sidebar — player
  playerPanel: (n) => `Player ${n}`,
  fieldName: "Name",
  noName: "No name",
  fieldNumber: "Number",
  fieldColor: "Color",
  instructionsTitle: "Tactical instructions",
  withBall: "⚽ With possession",
  withoutBall: "🛡 Without possession",
  withBallPlaceholder:
    "How this player should act when the team has the ball (positioning, movement, passing, finishing)…",
  withoutBallPlaceholder:
    "How this player should act when the team does not have the ball (marking, covering, pressing, recovery)…",
  instrHintStart: "Type here yourself or ask the AI to fill it via MCP (tool",
  instrHintEnd: ").",
  removePlayer: "Remove player",
  // sidebar — shape
  shapePanel: "Shape:",
  fieldText: "Text",
  shapeType: {
    line: "Line",
    arrow: "Arrow",
    bspline: "Curve",
    rect: "Rectangle",
    ellipse: "Ellipse",
    text: "Text",
  },
  thickness: (w) => `Thickness: ${w} m`,
  dashed: "Dashed",
  removeShape: "Remove shape",
  // sidebar — tips / export
  panelTips: "Tips",
  tips: [
    { text: "Select a tool and draw directly on the pitch." },
    { strong: "Player:", text: "click to add (uses the active color and team)." },
    { strong: "Curve:", text: "click points; double-click, Enter or right-click finishes." },
    { text: "Drag players/shapes to reposition." },
    { strong: "Delete", text: "removes the selection · Ctrl+Z undoes." },
    { text: "Mouse wheel zooms; hold Shift and drag to move the camera." },
  ],
  panelExport: "Export",
  exportHint: "Generate a high-resolution image of the board or share the state (JSON) with the AI via MCP.",
  statChip: (players, shapes) => `${players} players · ${shapes} shapes`,
  defaultFilename: "tactical-board",
};
