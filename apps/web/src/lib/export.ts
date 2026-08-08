import { renderBoardSvg } from "@tattico/core";
import type { BoardState } from "@tattico/core";

/** Baixa um arquivo de texto (SVG/JSON). */
export function downloadText(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Converte o SVG do quadro para PNG usando canvas (resolução alta). */
export async function downloadPng(state: BoardState, filename: string): Promise<void> {
  const svg = renderBoardSvg(state, { background: "#0b1220", pitchColor: "#1e7d3c" });
  // escala em px por metro — ~1600px de largura para boa qualidade
  const w = 1600;
  const h = Math.round((state.pitch.height + 8) / (state.pitch.width + 8) * w);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Falha ao carregar SVG"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");
    ctx.drawImage(img, 0, 0, w, h);
    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = filename;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function svgFor(state: BoardState): string {
  return renderBoardSvg(state, { background: "#0b1220", pitchColor: "#1e7d3c" });
}
