import { PITCH_HEIGHT, PITCH_WIDTH } from "./constants";
import type { PitchConfig, Player, Pt, Side } from "./types";

export interface FormationSlot {
  fx: number;
  fy: number;
  role: string;
}

export interface Formation {
  id: string;
  label: string;
  slots: FormationSlot[];
}

/**
 * Posições como fração do campo.
 * fy mede a distância da meta atacada (0 = meta adversária, 1 = própria meta).
 * O time da casa ataca para cima (y=0) e defende embaixo.
 */
export const FORMATIONS: Formation[] = [
  {
    id: "4-3-3",
    label: "4-3-3",
    slots: [
      { fx: 0.5, fy: 0.96, role: "Goleiro" },
      { fx: 0.08, fy: 0.8, role: "Lateral Esq." },
      { fx: 0.32, fy: 0.78, role: "Zagueiro" },
      { fx: 0.68, fy: 0.78, role: "Zagueiro" },
      { fx: 0.92, fy: 0.8, role: "Lateral Dir." },
      { fx: 0.28, fy: 0.55, role: "Volante" },
      { fx: 0.5, fy: 0.6, role: "Meia Central" },
      { fx: 0.72, fy: 0.55, role: "Meia Central" },
      { fx: 0.12, fy: 0.28, role: "Ponta Esq." },
      { fx: 0.5, fy: 0.22, role: "Centroavante" },
      { fx: 0.88, fy: 0.28, role: "Ponta Dir." },
    ],
  },
  {
    id: "4-4-2",
    label: "4-4-2",
    slots: [
      { fx: 0.5, fy: 0.96, role: "Goleiro" },
      { fx: 0.08, fy: 0.8, role: "Lateral Esq." },
      { fx: 0.32, fy: 0.78, role: "Zagueiro" },
      { fx: 0.68, fy: 0.78, role: "Zagueiro" },
      { fx: 0.92, fy: 0.8, role: "Lateral Dir." },
      { fx: 0.08, fy: 0.5, role: "Meia Esq." },
      { fx: 0.38, fy: 0.52, role: "Meia Central" },
      { fx: 0.62, fy: 0.52, role: "Meia Central" },
      { fx: 0.92, fy: 0.5, role: "Meia Dir." },
      { fx: 0.38, fy: 0.24, role: "Atacante" },
      { fx: 0.62, fy: 0.24, role: "Atacante" },
    ],
  },
  {
    id: "4-2-3-1",
    label: "4-2-3-1",
    slots: [
      { fx: 0.5, fy: 0.96, role: "Goleiro" },
      { fx: 0.08, fy: 0.8, role: "Lateral Esq." },
      { fx: 0.32, fy: 0.78, role: "Zagueiro" },
      { fx: 0.68, fy: 0.78, role: "Zagueiro" },
      { fx: 0.92, fy: 0.8, role: "Lateral Dir." },
      { fx: 0.32, fy: 0.55, role: "Volante" },
      { fx: 0.68, fy: 0.55, role: "Volante" },
      { fx: 0.12, fy: 0.32, role: "Ponta Esq." },
      { fx: 0.5, fy: 0.45, role: "Meia Ofensivo" },
      { fx: 0.5, fy: 0.2, role: "Centroavante" },
      { fx: 0.88, fy: 0.32, role: "Ponta Dir." },
    ],
  },
  {
    id: "3-5-2",
    label: "3-5-2",
    slots: [
      { fx: 0.5, fy: 0.96, role: "Goleiro" },
      { fx: 0.25, fy: 0.78, role: "Zagueiro" },
      { fx: 0.5, fy: 0.76, role: "Zagueiro" },
      { fx: 0.75, fy: 0.78, role: "Zagueiro" },
      { fx: 0.07, fy: 0.55, role: "Ala Esq." },
      { fx: 0.32, fy: 0.58, role: "Meia Central" },
      { fx: 0.5, fy: 0.62, role: "Volante" },
      { fx: 0.68, fy: 0.58, role: "Meia Central" },
      { fx: 0.93, fy: 0.55, role: "Ala Dir." },
      { fx: 0.38, fy: 0.24, role: "Atacante" },
      { fx: 0.62, fy: 0.24, role: "Atacante" },
    ],
  },
  {
    id: "3-4-3",
    label: "3-4-3",
    slots: [
      { fx: 0.5, fy: 0.96, role: "Goleiro" },
      { fx: 0.25, fy: 0.78, role: "Zagueiro" },
      { fx: 0.5, fy: 0.76, role: "Zagueiro" },
      { fx: 0.75, fy: 0.78, role: "Zagueiro" },
      { fx: 0.08, fy: 0.52, role: "Meia Esq." },
      { fx: 0.38, fy: 0.58, role: "Meia Central" },
      { fx: 0.62, fy: 0.58, role: "Meia Central" },
      { fx: 0.92, fy: 0.52, role: "Meia Dir." },
      { fx: 0.12, fy: 0.28, role: "Ponta Esq." },
      { fx: 0.5, fy: 0.22, role: "Centroavante" },
      { fx: 0.88, fy: 0.28, role: "Ponta Dir." },
    ],
  },
  {
    id: "5-3-2",
    label: "5-3-2",
    slots: [
      { fx: 0.5, fy: 0.96, role: "Goleiro" },
      { fx: 0.06, fy: 0.72, role: "Lateral Esq." },
      { fx: 0.28, fy: 0.78, role: "Zagueiro" },
      { fx: 0.5, fy: 0.76, role: "Zagueiro" },
      { fx: 0.72, fy: 0.78, role: "Zagueiro" },
      { fx: 0.94, fy: 0.72, role: "Lateral Dir." },
      { fx: 0.32, fy: 0.52, role: "Meia Central" },
      { fx: 0.5, fy: 0.58, role: "Volante" },
      { fx: 0.68, fy: 0.52, role: "Meia Central" },
      { fx: 0.38, fy: 0.24, role: "Atacante" },
      { fx: 0.62, fy: 0.24, role: "Atacante" },
    ],
  },
  {
    id: "4-1-4-1",
    label: "4-1-4-1",
    slots: [
      { fx: 0.5, fy: 0.96, role: "Goleiro" },
      { fx: 0.08, fy: 0.8, role: "Lateral Esq." },
      { fx: 0.32, fy: 0.78, role: "Zagueiro" },
      { fx: 0.68, fy: 0.78, role: "Zagueiro" },
      { fx: 0.92, fy: 0.8, role: "Lateral Dir." },
      { fx: 0.5, fy: 0.62, role: "Volante" },
      { fx: 0.08, fy: 0.5, role: "Meia Esq." },
      { fx: 0.36, fy: 0.52, role: "Meia Central" },
      { fx: 0.64, fy: 0.52, role: "Meia Central" },
      { fx: 0.92, fy: 0.5, role: "Meia Dir." },
      { fx: 0.5, fy: 0.2, role: "Centroavante" },
    ],
  },
];

/** Gera os jogadores de uma formação para um dos lados. */
export function formationPlayers(
  formationId: string,
  side: Side,
  pitch: PitchConfig,
  color: string,
): Player[] {
  const f = FORMATIONS.find((x) => x.id === formationId);
  if (!f) return [];
  return f.slots.map((slot, i) => {
    const mirrored = side === "away";
    return {
      id: "",
      number: i + 1,
      name: slot.role,
      x: (mirrored ? 1 - slot.fx : slot.fx) * pitch.width,
      y: (mirrored ? 1 - slot.fy : slot.fy) * pitch.height,
      color,
      side,
      instructions: { withBall: "", withoutBall: "" },
    };
  });
}

export function pitchConfig(): PitchConfig {
  return { width: PITCH_WIDTH, height: PITCH_HEIGHT };
}

export function clampToPitch(p: Pt, pitch: PitchConfig): Pt {
  return {
    x: Math.min(Math.max(p.x, 0), pitch.width),
    y: Math.min(Math.max(p.y, 0), pitch.height),
  };
}

/** Posição inicial de um novo jogador (bola rolando: centro do campo). */
export function kickoffPosition(side: Side, pitch: PitchConfig): Pt {
  return side === "home"
    ? { x: pitch.width / 2, y: pitch.height / 2 }
    : { x: pitch.width / 2, y: pitch.height / 2 };
}
