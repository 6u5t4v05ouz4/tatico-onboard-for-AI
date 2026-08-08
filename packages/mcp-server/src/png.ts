/** Conversão de SVG → PNG no servidor usando @resvg/resvg-js (binário nativo). */
export async function svgToPngDataUrl(svg: string): Promise<string | null> {
  try {
    const { Resvg } = await import("@resvg/resvg-js");
    // largura alvo fixa (~1600px) — evita renderizar os 7600px nativos do SVG
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 1600 },
      font: { loadSystemFonts: true, defaultFontFamily: "Arial" },
    });
    const png = resvg.render().asPng();
    return `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
  } catch (err) {
    console.error("[png] resvg indisponível:", err);
    return null;
  }
}
