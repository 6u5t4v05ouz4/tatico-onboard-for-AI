/**
 * Smoke test: exercita controller, sessão, SVG e persistência sem precisar de um cliente MCP.
 * Rode com: npm run smoke -w @tattico/mcp-server
 */
import { BoardController, FORMATIONS, renderBoardSvg } from "@tattico/core";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BoardSession } from "./session";

let failures = 0;

function check(label: string, cond: boolean): void {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}`);
  }
}

async function main(): Promise<void> {
  console.log("== Smoke test: core ==");

  const c = new BoardController();
  check("estado inicial vazio", c.state.players.length === 0 && c.state.shapes.length === 0);
  check("título padrão", c.state.title === "Nova tática");
  check("campo 68x105", c.state.pitch.width === 68 && c.state.pitch.height === 105);

  c.setFormation("home", "4-3-3");
  check("formação 4-3-3 aplicada (11 jogadores)", c.state.players.filter((p) => p.side === "home").length === 11);
  check("goleiro na própria meta (y alto)", c.state.players[0].y > 90);
  check("versão incrementada", c.state.version === 1);

  const gk = c.state.players[0];
  c.movePlayer(gk.id, 30, 20);
  check("movimento de jogador", c.state.players[0].x === 30 && c.state.players[0].y === 20);

  c.addShape({ type: "arrow", points: [{ x: 10, y: 10 }, { x: 50, y: 50 }], color: "#ffffff" });
  c.addShape({ type: "bspline", points: [{ x: 5, y: 80 }, { x: 15, y: 70 }, { x: 25, y: 85 }] });
  c.addShape({ type: "text", points: [{ x: 34, y: 52 }], text: "Ataque", fontSize: 4 });
  check("3 formas criadas", c.state.shapes.length === 3);
  check("undo disponível", c.canUndo);
  c.undo();
  check("undo remove última forma", c.state.shapes.length === 2);
  c.redo();
  check("redo restaura forma", c.state.shapes.length === 3);

  const svg = renderBoardSvg(c.state, { background: "#0b1220", pitchColor: "#1e7d3c" });
  check("SVG é string válida", svg.startsWith("<?xml") && svg.includes("<svg"));
  check("SVG contém círculo central", svg.includes("circle") || svg.includes("line"));
  check("SVG contém área de pênalti", svg.includes("40.32") || svg.includes("16.5"));
  check("arco de pênalti superior sai da área (sweep 0)", /A 9\.15 9\.15 0 0 0 \d/.test(svg));
  check("arco de pênalti inferior sai da área (sweep 1)", /A 9\.15 9\.15 0 0 1 \d/.test(svg));
  check("SVG contém jogadores", svg.includes("</g>"));
  check("SVG contém textos", svg.includes("Ataque"));

  console.log("== Smoke test: sessão + persistência ==");
  const dataDir = mkdtempSync(join(tmpdir(), "tattico-"));
  const session = new BoardSession(dataDir);
  session.controller.setFormation("away", "4-2-3-1");
  session.saveTactic("Clássico 4-2-3-1");
  check("tática salva no disco", session.listTactics().length === 1);
  session.controller.newBoard();
  check("board limpo", session.controller.state.players.length === 0);
  session.loadTactic("Clássico 4-2-3-1");
  check("tática carregada", session.controller.state.players.filter((p) => p.side === "away").length === 11);
  session.deleteTactic("Clássico 4-2-3-1");
  check("tática apagada", session.listTactics().length === 0);
  rmSync(dataDir, { recursive: true, force: true });

  console.log("== Smoke test: formações disponíveis ==");
  check(`formações: ${FORMATIONS.map((f) => f.id).join(", ")}`, FORMATIONS.length >= 7);

  if (failures > 0) {
    console.error(`\n${failures} falha(s) no smoke test.`);
    process.exit(1);
  }
  console.log("\nSmoke test OK ✅");
}

main().catch((err) => {
  console.error("Smoke test quebrou:", err);
  process.exit(1);
});
