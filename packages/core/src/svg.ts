import type { BoardState, Player, Pt, Shape } from "./types";

/**
 * Renderização do quadro tático em SVG puro (string).
 * Usado tanto pelo app web (exportação) quanto pelo servidor MCP (export_svg / export_png).
 * Escala: 1 unidade de viewBox = 1 metro. Padrão adiciona margem de 4 m ao redor.
 */

export const BOARD_PAD = 4;

export interface BoardSvgOptions {
  /** margem ao redor do campo em metros */
  padding?: number;
  /** cor de fundo (fora do gramado) */
  background?: string;
  /** cor das linhas do campo */
  lineColor?: string;
  /** cor do gramado */
  pitchColor?: string;
  /** exibir nomes dos jogadores */
  showNames?: boolean;
  /** multiplicador de resolução (px por metro) */
  scale?: number;
}

export function renderBoardSvg(state: BoardState, opts: BoardSvgOptions = {}): string {
  const pad = opts.padding ?? 4;
  const scale = opts.scale ?? 1;
  const W = state.pitch.width + pad * 2;
  const H = state.pitch.height + pad * 2;

  const lineColor = opts.lineColor ?? "#ffffff";
  const pitchColor = opts.pitchColor ?? "#1e7d3c";
  const background = opts.background ?? "#0b1220";

  const pitchSvg = renderPitchMarkings(state, { lineColor, pitchColor });
  const shapesSvg = state.shapes.map((s) => renderShape(s)).join("\n");
  const playersSvg = state.players.map((p) => renderPlayer(p, opts.showNames ?? true)).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W * scale * 100}" height="${H * scale * 100}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${pitchColor}"/>
      <stop offset="100%" stop-color="${shade(pitchColor, -18)}"/>
    </linearGradient>
    <pattern id="stripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(90)">
      <rect width="4" height="8" fill="rgba(255,255,255,0.035)"/>
    </pattern>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="${background}"/>
  <g transform="translate(${pad} ${pad})">
    <rect x="0" y="0" width="${state.pitch.width}" height="${state.pitch.height}" fill="url(#grass)"/>
    <rect x="0" y="0" width="${state.pitch.width}" height="${state.pitch.height}" fill="url(#stripes)"/>
    ${pitchSvg}
    ${shapesSvg}
    ${playersSvg}
  </g>
</svg>`;
}

/** Escurece/clareia uma cor hex em percentual (-100..100). */
export function shade(hex: string, percent: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (n >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (n & 0xff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function renderPitchMarkings(
  state: BoardState,
  colors: { lineColor: string; pitchColor: string },
): string {
  const { width: w, height: h } = state.pitch;
  const lw = 0.14; // largura de linha ~14 cm
  const line = colors.lineColor;
  const cx = w / 2;
  const cy = h / 2;
  const boxDepth = 16.5;
  const boxWidth = 40.32;
  const goalDepth = 5.5;
  const goalWidth = 18.32;
  const spotY = 11;
  const r = 9.15;

  const stroke = `stroke="${line}" stroke-width="${lw}" fill="none"`;

  const el: string[] = [];
  // limite do campo
  el.push(`<rect x="0" y="0" width="${w}" height="${h}" ${stroke}/>`);
  // linha do meio
  el.push(`<line x1="0" y1="${cy}" x2="${w}" y2="${cy}" ${stroke}/>`);
  // circulo central
  el.push(`<circle cx="${cx}" cy="${cy}" r="${r}" ${stroke}/>`);
  el.push(`<circle cx="${cx}" cy="${cy}" r="0.4" fill="${line}"/>`);

  // áreas de pênalti e áreas do gol
  const areas = [
    [cx - boxWidth / 2, 0, boxWidth, boxDepth],
    [cx - boxWidth / 2, h - boxDepth, boxWidth, boxDepth],
    [cx - goalWidth / 2, 0, goalWidth, goalDepth],
    [cx - goalWidth / 2, h - goalDepth, goalWidth, goalDepth],
  ] as const;
  for (const [x, y, ww, hh] of areas) {
    el.push(`<rect x="${x}" y="${y}" width="${ww}" height="${hh}" ${stroke}/>`);
  }

  // marcas de pênalti
  el.push(`<circle cx="${cx}" cy="${spotY}" r="0.3" fill="${line}"/>`);
  el.push(`<circle cx="${cx}" cy="${h - spotY}" r="0.3" fill="${line}"/>`);

  // arcos de pênalti (fora da área, centrados na marca)
  el.push(penaltyArc(cx, spotY, boxDepth, true, line, lw));
  el.push(penaltyArc(cx, h - spotY, h - boxDepth, false, line, lw));

  // arcos de escanteio
  const corner = 1;
  el.push(`<path d="M 0 ${corner} A ${corner} ${corner} 0 0 0 ${corner} 0" ${stroke}/>`);
  el.push(`<path d="M ${w} ${corner} A ${corner} ${corner} 0 0 1 ${w - corner} 0" ${stroke}/>`);
  el.push(`<path d="M 0 ${h - corner} A ${corner} ${corner} 0 0 1 ${corner} ${h}" ${stroke}/>`);
  el.push(`<path d="M ${w} ${h - corner} A ${corner} ${corner} 0 0 0 ${w - corner} ${h}" ${stroke}/>`);

  // metas (trave)
  el.push(`<line x1="${cx - 3.66}" y1="-0.4" x2="${cx + 3.66}" y2="-0.4" ${stroke}/>`);
  el.push(`<line x1="${cx - 3.66}" y1="${h + 0.4}" x2="${cx + 3.66}" y2="${h + 0.4}" ${stroke}/>`);

  return el.join("\n");
}

/** Arco de pênalti: semicírculo de raio 9.15 m centrado na marca, aberto para fora da área. */
function penaltyArc(
  cx: number,
  spotY: number,
  boxEdgeY: number,
  top: boolean,
  line: string,
  lw: number,
): string {
  const r = 9.15;
  const dx = Math.sqrt(r * r - Math.pow(Math.abs(spotY - boxEdgeY), 2));
  const x1 = cx - dx;
  const x2 = cx + dx;
  // sweep flag: o arco deve "sair" da área em direção ao centro do campo.
  // Indo da esquerda para a direita no SVG (y para baixo), sweep=1 arqueia para cima
  // e sweep=0 para baixo — logo a área de cima precisa de 0 e a de baixo de 1.
  const sweep = top ? 0 : 1;
  return `<path d="M ${x1.toFixed(2)} ${boxEdgeY.toFixed(2)} A ${r} ${r} 0 0 ${sweep} ${x2.toFixed(2)} ${boxEdgeY.toFixed(2)}" stroke="${line}" stroke-width="${lw}" fill="none"/>`;
}

export function renderPlayer(p: Player, showName = true): string {
  const r = 2.4; // raio do jogador em metros
  const num = escapeXml(String(p.number));
  const name = showName && p.name ? escapeXml(p.name) : "";

  return `<g transform="translate(${p.x} ${p.y})">
  <circle r="${r}" fill="${p.color}" stroke="rgba(0,0,0,0.5)" stroke-width="0.4"/>
  <circle r="${r}" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="0.3"/>
  <text text-anchor="middle" dominant-baseline="central" y="0" font-size="2.6" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">${num}</text>
  ${name ? `<text text-anchor="middle" dominant-baseline="hanging" y="${r + 0.9}" font-size="1.9" font-weight="600" fill="#fff" style="paint-order:stroke;stroke:#000;stroke-width:0.5px" font-family="system-ui, sans-serif">${name}</text>` : ""}
</g>${name ? "" : ""}`;
}

export function renderShape(s: Shape): string {
  const stroke = s.color;
  const width = s.width;
  const dash = s.dashed ? ` stroke-dasharray="${width * 2} ${width * 1.4}"` : "";
  const common = `stroke="${stroke}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round"${dash}`;

  switch (s.type) {
    case "line": {
      const [a, b] = s.points;
      return `<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" ${common}/>`;
    }
    case "arrow": {
      const [a, b] = s.points;
      const head = arrowHead(a, b, width * 6);
      return `<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" ${common}/>
<polygon points="${head}" fill="${stroke}"/>`;
    }
    case "bspline": {
      const d = catmullRomPath(s.points);
      return `<path d="${d}" ${common}/>`;
    }
    case "rect": {
      const [a, b] = s.points;
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const w = Math.abs(a.x - b.x);
      const h = Math.abs(a.y - b.y);
      return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" ${common}/>`;
    }
    case "ellipse": {
      const [a, b] = s.points;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const rx = Math.abs(a.x - b.x) / 2;
      const ry = Math.abs(a.y - b.y) / 2;
      return `<ellipse cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" ${common}/>`;
    }
    case "text": {
      const [a] = s.points;
      const t = escapeXml(s.text || "Texto");
      return `<text x="${a.x.toFixed(2)}" y="${a.y.toFixed(2)}" text-anchor="middle" dominant-baseline="central" font-size="${s.fontSize}" font-weight="600" fill="${stroke}" style="paint-order:stroke;stroke:#000;stroke-width:${(s.fontSize * 0.12).toFixed(2)}px" font-family="system-ui, sans-serif">${t}</text>`;
    }
  }
}

/** Ponta de seta em formato de polígono. */
export function arrowHead(a: Pt, b: Pt, size: number): string {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const p1 = `${b.x},${b.y}`;
  const p2x = b.x - size * Math.cos(ang - 0.45);
  const p2y = b.y - size * Math.sin(ang - 0.45);
  const p3x = b.x - size * Math.cos(ang + 0.45);
  const p3y = b.y - size * Math.sin(ang + 0.45);
  return `${p1} ${p2x.toFixed(2)},${p2y.toFixed(2)} ${p3x.toFixed(2)},${p3y.toFixed(2)}`;
}

/** Caminho suave (Catmull-Rom → Bézier) para b-splines. */
export function catmullRomPath(pts: Pt[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} L ${pts[1].x.toFixed(2)} ${pts[1].y.toFixed(2)}`;
  }
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
