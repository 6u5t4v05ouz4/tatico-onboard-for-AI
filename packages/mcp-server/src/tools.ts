import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FORMATIONS, renderBoardSvg } from "@tattico/core";
import type { BoardState, Player, ShapeType, Side } from "@tattico/core";
import type { BoardSession } from "./session";
import { svgToPngDataUrl } from "./png";

/**
 * Todas as ferramentas MCP do quadro tático.
 * Cada ferramenta opera sobre a sessão compartilhada (mesmo estado do app web).
 */
export function registerTools(server: McpServer, session: BoardSession): void {
  const reply = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

  // ------------------------------------------------------------------ estado
  server.tool(
    "get_board_state",
    "Retorna o estado completo do quadro tático em JSON: título, dimensões do campo, jogadores e formas. Use para saber o que está no quadro.",
    {},
    () => reply(JSON.stringify(session.controller.state, null, 2)),
  );

  server.tool(
    "new_board",
    "Apaga tudo e cria um quadro tático vazio (novo título opcional).",
    { title: z.string().optional().describe("Título do novo quadro") },
    ({ title }) => {
      session.controller.newBoard(title ?? "Nova tática");
      return reply(`Quadro limpo. Título: "${session.controller.state.title}".`);
    },
  );

  server.tool(
    "set_title",
    "Define o título do quadro tático.",
    { title: z.string().describe("Novo título") },
    ({ title }) => {
      session.controller.setTitle(title);
      return reply(`Título definido: "${title}".`);
    },
  );

  // ---------------------------------------------------------------- jogadores
  server.tool(
    "add_player",
    "Adiciona um jogador ao quadro. Coordenadas em metros dentro do campo (x: 0..68, y: 0..105). Se número não for informado, escolhe o próximo livre do time.",
    {
      x: z.number().describe("Posição x em metros (0..68)"),
      y: z.number().describe("Posição y em metros (0..105)"),
      side: z.enum(["home", "away"]).optional().describe("Time: home (vermelho) ou away (azul)"),
      number: z.number().int().min(1).max(99).optional().describe("Número da camisa"),
      name: z.string().optional().describe("Nome do jogador"),
      color: z.string().optional().describe("Cor do jogador em hex (ex: #ef4444)"),
    },
    ({ x, y, side, number, name, color }) => {
      const p = session.controller.addPlayer({ x, y, side, number, name, color });
      return reply(
        `Jogador criado: id=${p.id}, número=${p.number}, time=${p.side}, posição=(${p.x.toFixed(1)}, ${p.y.toFixed(1)})m.`,
      );
    },
  );

  server.tool(
    "move_player",
    "Move um jogador para novas coordenadas (metros). Referencie por player_id OU por número+time.",
    {
      player_id: z.string().optional().describe("ID do jogador (ex: p1)"),
      number: z.number().int().optional().describe("Número da camisa do jogador"),
      side: z.enum(["home", "away"]).optional().describe("Time do jogador (usado com number)"),
      x: z.number().describe("Nova posição x em metros (0..68)"),
      y: z.number().describe("Nova posição y em metros (0..105)"),
    },
    ({ player_id, number, side, x, y }) => {
      const p = resolvePlayer(session.controller.state, { player_id, number, side });
      if (p instanceof Error) return reply(p.message);
      session.controller.movePlayer(p.id, x, y);
      return reply(`Jogador ${p.id} (${p.number}) movido para (${x.toFixed(1)}, ${y.toFixed(1)})m.`);
    },
  );

  server.tool(
    "update_player",
    "Atualiza nome, número ou cor de um jogador existente.",
    {
      player_id: z.string().optional().describe("ID do jogador"),
      number: z.number().int().optional().describe("Número da camisa do jogador (como referência)"),
      side: z.enum(["home", "away"]).optional().describe("Time do jogador"),
      name: z.string().optional().describe("Novo nome"),
      new_number: z.number().int().min(1).max(99).optional().describe("Novo número da camisa"),
      color: z.string().optional().describe("Nova cor em hex"),
    },
    ({ player_id, number, side, name, new_number, color }) => {
      const p = resolvePlayer(session.controller.state, { player_id, number, side });
      if (p instanceof Error) return reply(p.message);
      session.controller.updatePlayer(p.id, clean({ name, number: new_number, color }));
      const updated = session.controller.state.players.find((q) => q.id === p.id)!;
      return reply(
        `Jogador ${p.id} atualizado: nome=${updated.name || "(vazio)"}, número=${updated.number}, cor=${updated.color}.`,
      );
    },
  );

  server.tool(
    "update_player_instructions",
    "Escreve as instruções táticas de um jogador: como ele deve atuar COM a posse de bola (with_ball) e SEM a posse de bola (without_ball). Apenas o campo informado é alterado; o outro é preservado. Use para preencher a orientação individual de cada um dos 22 jogadores.",
    {
      player_id: z.string().optional().describe("ID do jogador"),
      number: z.number().int().optional().describe("Número da camisa do jogador"),
      side: z.enum(["home", "away"]).optional().describe("Time do jogador"),
      with_ball: z.string().optional().describe("Instruções para quando o time está COM a posse de bola"),
      without_ball: z.string().optional().describe("Instruções para quando o time está SEM a posse de bola"),
    },
    ({ player_id, number, side, with_ball, without_ball }) => {
      if (with_ball === undefined && without_ball === undefined) {
        return reply("Informe with_ball e/ou without_ball com o texto das instruções.");
      }
      const p = resolvePlayer(session.controller.state, { player_id, number, side });
      if (p instanceof Error) return reply(p.message);
      session.controller.setPlayerInstructions(
        p.id,
        clean({ withBall: with_ball, withoutBall: without_ball }),
      );
      const updated = session.controller.state.players.find((q) => q.id === p.id)!;
      return reply(
        `Instruções de ${p.id} (${updated.number}, ${updated.name || "sem nome"}) atualizadas:\n` +
          `  Com posse: ${updated.instructions.withBall || "(vazio)"}\n` +
          `  Sem posse: ${updated.instructions.withoutBall || "(vazio)"}`,
      );
    },
  );

  server.tool(
    "remove_player",
    "Remove um jogador do quadro.",
    {
      player_id: z.string().optional().describe("ID do jogador"),
      number: z.number().int().optional().describe("Número da camisa do jogador"),
      side: z.enum(["home", "away"]).optional().describe("Time do jogador"),
    },
    ({ player_id, number, side }) => {
      const p = resolvePlayer(session.controller.state, { player_id, number, side });
      if (p instanceof Error) return reply(p.message);
      session.controller.removePlayer(p.id);
      return reply(`Jogador ${p.id} (${p.number}) removido.`);
    },
  );

  server.tool(
    "clear_players",
    "Remove todos os jogadores (ou apenas de um time) do quadro.",
    { side: z.enum(["home", "away"]).optional().describe("Se informado, limpa só esse time") },
    ({ side }) => {
      session.controller.clearPlayers(side);
      return reply(side ? `Jogadores do time ${side} removidos.` : "Todos os jogadores removidos.");
    },
  );

  // --------------------------------------------------------------- formações
  server.tool(
    "set_formation",
    "Posiciona uma formação tática inteira (11 jogadores) para um time. Remove os jogadores atuais do time.",
    {
      side: z.enum(["home", "away"]).describe("Time que recebe a formação"),
      formation: z
        .enum(FORMATIONS.map((f) => f.id) as [string, ...string[]])
        .describe(`Formações disponíveis: ${FORMATIONS.map((f) => f.id).join(", ")}`),
      color: z.string().optional().describe("Cor opcional do time em hex"),
    },
    ({ side, formation, color }) => {
      session.controller.setFormation(side, formation, color);
      const players = session.controller.state.players.filter((p) => p.side === side);
      return reply(
        `Formação ${formation} aplicada ao time ${side}. Jogadores: ${players.length}. Posições:\n` +
          players
            .map((p) => `  ${p.number}. ${p.name} → (${p.x.toFixed(1)}, ${p.y.toFixed(1)})m`)
            .join("\n"),
      );
    },
  );

  // ------------------------------------------------------------------ formas
  server.tool(
    "add_shape",
    "Desenha uma forma no quadro: line (reta), arrow (seta), bspline (curva suave), rect (retângulo), ellipse (elipse) ou text (texto). Pontos em metros (x: 0..68, y: 0..105).",
    {
      type: z
        .enum(["line", "arrow", "bspline", "rect", "ellipse", "text"])
        .describe("Tipo da forma"),
      points: z
        .array(z.object({ x: z.number(), y: z.number() }))
        .min(1)
        .describe("Pontos em metros. line/arrow/rect/ellipse: 2 pontos. bspline: 2+ pontos. text: 1 ponto."),
      color: z.string().optional().describe("Cor em hex (padrão branco)"),
      width: z.number().positive().optional().describe("Espessura do traço em metros (padrão 0.35)"),
      dashed: z.boolean().optional().describe("Linha tracejada"),
      text: z.string().optional().describe("Texto (se type=text)"),
      fontSize: z.number().positive().optional().describe("Tamanho da fonte em metros (padrão 4)"),
    },
    ({ type, points, color, width, dashed, text, fontSize }) => {
      const s = session.controller.addShape({
        type: type as ShapeType,
        points,
        color,
        width,
        dashed,
        text,
        fontSize,
      });
      return reply(
        `Forma criada: id=${s.id}, tipo=${s.type}, pontos=${s.points.length}, cor=${s.color}.`,
      );
    },
  );

  server.tool(
    "update_shape",
    "Atualiza cor, espessura, tracejado, texto ou pontos de uma forma existente.",
    {
      shape_id: z.string().describe("ID da forma (ex: s1)"),
      color: z.string().optional().describe("Nova cor em hex"),
      width: z.number().positive().optional().describe("Nova espessura em metros"),
      dashed: z.boolean().optional().describe("Tracejado"),
      text: z.string().optional().describe("Novo texto (se for forma de texto)"),
      points: z
        .array(z.object({ x: z.number(), y: z.number() }))
        .optional()
        .describe("Novos pontos"),
    },
    ({ shape_id, color, width, dashed, text, points }) => {
      const s = session.controller.state.shapes.find((q) => q.id === shape_id);
      if (!s) return reply(`Forma ${shape_id} não encontrada.`);
      session.controller.updateShape(shape_id, clean({ color, width, dashed, text, points }));
      return reply(`Forma ${shape_id} atualizada.`);
    },
  );

  server.tool(
    "remove_shape",
    "Remove uma forma do quadro.",
    { shape_id: z.string().describe("ID da forma") },
    ({ shape_id }) => {
      const s = session.controller.state.shapes.find((q) => q.id === shape_id);
      if (!s) return reply(`Forma ${shape_id} não encontrada.`);
      session.controller.removeShape(shape_id);
      return reply(`Forma ${shape_id} removida.`);
    },
  );

  server.tool(
    "clear_shapes",
    "Remove todas as formas desenhadas (mantém jogadores).",
    {},
    () => {
      session.controller.clearShapes();
      return reply("Todas as formas removidas.");
    },
  );

  // ------------------------------------------------------------- undo/redo
  server.tool(
    "undo",
    "Desfaz a última ação (jogador, forma, formação).",
    {},
    () => {
      const ok = session.controller.undo();
      return reply(ok ? "Ação desfeita." : "Nada para desfazer.");
    },
  );

  server.tool(
    "redo",
    "Refaz a última ação desfeita.",
    {},
    () => {
      const ok = session.controller.redo();
      return reply(ok ? "Ação refeita." : "Nada para refazer.");
    },
  );

  // ---------------------------------------------------------------- exportar
  server.tool(
    "export_svg",
    "Gera o SVG completo do quadro tático (campo, jogadores e formas). Pode ser salvo como arquivo .svg ou convertido para PNG.",
    {
      background: z.string().optional().describe("Cor de fundo em hex (padrão escuro #0b1220)"),
    },
    ({ background }) => {
      const svg = renderBoardSvg(session.controller.state, {
        background: background ?? session.pitchStyle.background ?? "#0b1220",
        pitchColor: session.pitchStyle.pitchColor ?? "#1e7d3c",
        lineColor: session.pitchStyle.lineColor,
      });
      return reply(svg);
    },
  );

  server.tool(
    "export_png",
    "Gera o quadro tático como imagem PNG (base64 data URL). O PNG já inclui o campo estilizado.",
    {},
    async () => {
      const svg = renderBoardSvg(session.controller.state, {
        background: session.pitchStyle.background ?? "#0b1220",
        pitchColor: session.pitchStyle.pitchColor ?? "#1e7d3c",
        lineColor: session.pitchStyle.lineColor,
      });
      const dataUrl = await svgToPngDataUrl(svg);
      if (!dataUrl) {
        return reply("Erro: não foi possível gerar PNG (biblioteca de renderização indisponível). Tente export_svg.");
      }
      return reply(dataUrl);
    },
  );

  // ------------------------------------------------------------- persistência
  server.tool(
    "save_tactic",
    "Salva o quadro atual com um nome. Fica disponível para carregar depois (mesmo armazenamento do app web).",
    { name: z.string().describe("Nome da tática") },
    ({ name }) => {
      session.saveTactic(name);
      return reply(`Tática "${name.trim()}" salva.`);
    },
  );

  server.tool(
    "load_tactic",
    "Carrega uma tática salva pelo nome, substituindo o quadro atual.",
    { name: z.string().describe("Nome da tática salva") },
    ({ name }) => {
      const ok = session.loadTactic(name);
      return reply(
        ok
          ? `Tática "${name.trim()}" carregada.`
          : `Tática "${name.trim()}" não encontrada. Use list_tactics para ver as salvas.`,
      );
    },
  );

  server.tool(
    "list_tactics",
    "Lista todas as táticas salvas (nome e data de atualização).",
    {},
    () => {
      const list = session.listTactics();
      if (list.length === 0) return reply("Nenhuma tática salva ainda.");
      return reply(
        "Táticas salvas:\n" + list.map((t) => `  • ${t.name} (atualizada em ${t.updatedAt})`).join("\n"),
      );
    },
  );

  server.tool(
    "delete_tactic",
    "Apaga uma tática salva pelo nome.",
    { name: z.string().describe("Nome da tática") },
    ({ name }) => {
      const ok = session.deleteTactic(name);
      return reply(ok ? `Tática "${name.trim()}" apagada.` : `Tática "${name.trim()}" não encontrada.`);
    },
  );

  // ------------------------------------------------------------------ util
  server.tool(
    "get_board_summary",
    "Resumo rápido do quadro: título, nº de jogadores por time e nº de formas.",
    {},
    () => {
      const s = session.controller.state;
      const home = s.players.filter((p) => p.side === "home").length;
      const away = s.players.filter((p) => p.side === "away").length;
      return reply(
        `Título: "${s.title}" | Campo: ${s.pitch.width}×${s.pitch.height}m | Jogadores: ${home} (home), ${away} (away) | Formas: ${s.shapes.length}.`,
      );
    },
  );

  server.tool(
    "set_pitch_style",
    "Altera o estilo visual do quadro exportado (cores do gramado, fundo e linhas).",
    {
      background: z.string().optional().describe("Cor de fundo em hex"),
      pitchColor: z.string().optional().describe("Cor do gramado em hex"),
      lineColor: z.string().optional().describe("Cor das linhas em hex"),
    },
    ({ background, pitchColor, lineColor }) => {
      const style = clean({ background, pitchColor, lineColor });
      session.pitchStyle = style;
      return reply(
        `Estilo atualizado: fundo=${style.background ?? "padrão"}, gramado=${style.pitchColor ?? "padrão"}, linhas=${style.lineColor ?? "padrão"}.`,
      );
    },
  );
}

/** Resolve um jogador por player_id OU por number+side. */
function resolvePlayer(
  state: BoardState,
  ref: { player_id?: string; number?: number; side?: Side },
): Player | Error {
  if (ref.player_id) {
    const p = state.players.find((q) => q.id === ref.player_id);
    return p ?? new Error(`Jogador "${ref.player_id}" não encontrado. Use get_board_state para ver os IDs.`);
  }
  if (ref.number != null) {
    const side = ref.side ?? "home";
    const p = state.players.find((q) => q.number === ref.number && q.side === side);
    if (p) return p;
    return new Error(`Jogador ${ref.number} (${side}) não encontrado.`);
  }
  return new Error("Informe player_id ou number+side para identificar o jogador.");
}

/** Cor padrão do gramado usada nas exportações. */
export function defaultPitchColor(): string {
  return "#1e7d3c";
}

/** Remove chaves undefined — Object.assign com undefined apagaria valores existentes. */
function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}


