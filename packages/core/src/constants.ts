import type { Side } from "./types";

/** Campo de futebol 11v11 padrão (~105×68 m), desenhado na vertical. */
export const PITCH_WIDTH = 68;
export const PITCH_HEIGHT = 105;

export interface NamedColor {
  id: string;
  name: string;
  value: string;
}

/** Paleta padrão com 6 cores (mesmas do site original). */
export const PALETTE: NamedColor[] = [
  { id: "red", name: "Vermelho", value: "#ef4444" },
  { id: "blue", name: "Azul", value: "#3b82f6" },
  { id: "green", name: "Verde", value: "#22c55e" },
  { id: "yellow", name: "Amarelo", value: "#facc15" },
  { id: "orange", name: "Laranja", value: "#f97316" },
  { id: "purple", name: "Roxo", value: "#a855f7" },
];

export const TEAM_COLORS: Record<Side, string> = {
  home: "#ef4444",
  away: "#3b82f6",
};

export const DEFAULT_SHAPE_COLOR = "#ffffff";
export const DEFAULT_TEXT_COLOR = "#ffffff";
