import { TEAM_COLORS } from "./constants";
import { clampToPitch, formationPlayers, pitchConfig } from "./formations";
import type { BoardState, Player, PlayerInstructions, Pt, Shape, ShapeType, Side } from "./types";

/**
 * Controller do estado do quadro — única fonte de verdade.
 * Toda mutação incrementa a versão e dispara onChange (para undo/redo, sync MCP e re-render).
 */
export class BoardController {
  private _state: BoardState;
  private history: BoardState[] = [];
  private future: BoardState[] = [];
  private playerCounter = 1;
  private shapeCounter = 1;
  onChange?: () => void;

  constructor(initial?: Partial<BoardState>) {
    this._state = {
      version: 0,
      title: "Nova tática",
      pitch: pitchConfig(),
      players: [],
      shapes: [],
      ...initial,
    };
    this.syncCounters();
  }

  get state(): BoardState {
    return this._state;
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  private syncCounters(): void {
    this.playerCounter =
      this._state.players.reduce((m, p) => Math.max(m, p.number), 0) + 1;
    this.shapeCounter =
      this._state.shapes.reduce((m, s) => Math.max(m, parseInt(s.id.replace(/\D/g, "") || "0", 10)), 0) + 1;
  }

  private commit(mutator: (draft: BoardState) => void): void {
    const prev = structuredClone(this._state);
    const next = structuredClone(this._state);
    mutator(next);
    next.version = prev.version + 1;
    this.history.push(prev);
    if (this.history.length > 60) this.history.shift();
    this.future = [];
    this._state = next;
    this.onChange?.();
  }

  /** Substitui o estado inteiro (carregar tática, sync remoto). Sem criar histórico. */
  loadState(state: BoardState): void {
    this._state = structuredClone(state);
    normalizeInstructions(this._state);
    this.history = [];
    this.future = [];
    this.syncCounters();
    this.onChange?.();
  }

  newBoard(title = "Nova tática"): void {
    this.commit((d) => {
      d.title = title;
      d.players = [];
      d.shapes = [];
    });
  }

  setTitle(title: string): void {
    this.commit((d) => {
      d.title = title;
    });
  }

  addPlayer(input: {
    x: number;
    y: number;
    side?: Side;
    number?: number;
    name?: string;
    color?: string;
    instructions?: Partial<PlayerInstructions>;
  }): Player {
    const side = input.side ?? "home";
    const player: Player = {
      id: `p${this.playerCounter++}`,
      number: input.number ?? this.nextFreeNumber(side),
      name: input.name ?? "",
      x: input.x,
      y: input.y,
      color: input.color ?? TEAM_COLORS[side],
      side,
      instructions: { withBall: "", withoutBall: "", ...input.instructions },
    };
    this.commit((d) => {
      d.players.push(player);
    });
    return player;
  }

  movePlayer(id: string, x: number, y: number): void {
    this.commit((d) => {
      const p = d.players.find((q) => q.id === id);
      if (p) {
        const c = clampToPitch({ x, y }, d.pitch);
        p.x = c.x;
        p.y = c.y;
      }
    });
  }

  updatePlayer(id: string, patch: Partial<Pick<Player, "number" | "name" | "color" | "side">>): void {
    this.commit((d) => {
      const p = d.players.find((q) => q.id === id);
      if (p) Object.assign(p, patch);
    });
  }

  /** Edita uma das instruções táticas do jogador (com ou sem posse de bola), preservando a outra. */
  updatePlayerInstructions(id: string, phase: keyof PlayerInstructions, text: string): void {
    this.setPlayerInstructions(id, { [phase]: text });
  }

  /** Define uma ou ambas as instruções táticas do jogador em um único commit. */
  setPlayerInstructions(id: string, patch: Partial<PlayerInstructions>): void {
    this.commit((d) => {
      const p = d.players.find((q) => q.id === id);
      if (p) {
        p.instructions ??= { withBall: "", withoutBall: "" };
        if (patch.withBall !== undefined) p.instructions.withBall = patch.withBall;
        if (patch.withoutBall !== undefined) p.instructions.withoutBall = patch.withoutBall;
      }
    });
  }

  removePlayer(id: string): void {
    this.commit((d) => {
      d.players = d.players.filter((p) => p.id !== id);
    });
  }

  clearPlayers(side?: Side): void {
    this.commit((d) => {
      d.players = side ? d.players.filter((p) => p.side !== side) : [];
    });
  }

  /** Posiciona uma formação inteira para um lado (remove os jogadores atuais do lado). */
  setFormation(side: Side, formationId: string, color?: string): void {
    this.commit((d) => {
      const others = d.players.filter((p) => p.side !== side);
      const teamColor = color ?? TEAM_COLORS[side];
      const players = formationPlayers(formationId, side, d.pitch, teamColor);
      for (const p of players) {
        p.id = `p${this.playerCounter++}`;
      }
      d.players = [...others, ...players];
    });
  }

  addShape(input: {
    type: ShapeType;
    points: Pt[];
    color?: string;
    width?: number;
    dashed?: boolean;
    text?: string;
    fontSize?: number;
  }): Shape {
    const shape: Shape = {
      id: `s${this.shapeCounter++}`,
      type: input.type,
      points: input.points,
      color: input.color ?? "#ffffff",
      width: input.width ?? 0.35,
      dashed: input.dashed ?? false,
      text: input.text ?? "",
      fontSize: input.fontSize ?? 4,
    };
    this.commit((d) => {
      d.shapes.push(shape);
    });
    return shape;
  }

  updateShape(id: string, patch: Partial<Pick<Shape, "color" | "width" | "dashed" | "text" | "fontSize" | "points">>): void {
    this.commit((d) => {
      const s = d.shapes.find((q) => q.id === id);
      if (s) Object.assign(s, patch);
    });
  }

  removeShape(id: string): void {
    this.commit((d) => {
      d.shapes = d.shapes.filter((s) => s.id !== id);
    });
  }

  clearShapes(): void {
    this.commit((d) => {
      d.shapes = [];
    });
  }

  undo(): boolean {
    const prev = this.history.pop();
    if (!prev) return false;
    this.future.push(this._state);
    this._state = prev;
    this.syncCounters();
    this.onChange?.();
    return true;
  }

  redo(): boolean {
    const next = this.future.pop();
    if (!next) return false;
    this.history.push(this._state);
    this._state = next;
    this.syncCounters();
    this.onChange?.();
    return true;
  }

  private nextFreeNumber(side: Side): number {
    const used = new Set(this._state.players.filter((p) => p.side === side).map((p) => p.number));
    let n = 1;
    while (used.has(n)) n++;
    return n;
  }

  serialize(): string {
    return JSON.stringify(this._state, null, 2);
  }

  static deserialize(json: string): BoardState {
    const state = JSON.parse(json) as BoardState;
    normalizeInstructions(state);
    return state;
  }
}

/** Migração: estados antigos não têm instructions — garante o campo em todos os jogadores. */
function normalizeInstructions(state: BoardState): void {
  for (const p of state.players ?? []) {
    p.instructions ??= { withBall: "", withoutBall: "" };
  }
}
