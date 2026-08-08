/** Tipos centrais do quadro tático — compartilhados entre app web e servidor MCP. */

export type Side = "home" | "away";

export interface Pt {
  x: number;
  y: number;
}

export interface PlayerInstructions {
  /** como o jogador deve atuar quando o time está com a posse de bola */
  withBall: string;
  /** como o jogador deve atuar quando o time está sem a posse de bola */
  withoutBall: string;
}

export interface Player {
  id: string;
  number: number;
  name: string;
  x: number;
  y: number;
  color: string;
  side: Side;
  /** instruções táticas por fase (com/sem posse) */
  instructions: PlayerInstructions;
}

export type ShapeType = "line" | "arrow" | "bspline" | "rect" | "ellipse" | "text";

export interface Shape {
  id: string;
  type: ShapeType;
  /** pontos em metros do campo (para rect/ellipse: canto A e canto B) */
  points: Pt[];
  color: string;
  /** espessura do traço em metros */
  width: number;
  dashed: boolean;
  text: string;
  fontSize: number;
}

export interface PitchConfig {
  /** largura em metros (eixo x) */
  width: number;
  /** comprimento em metros (eixo y) */
  height: number;
}

export interface BoardState {
  version: number;
  title: string;
  pitch: PitchConfig;
  players: Player[];
  shapes: Shape[];
}
