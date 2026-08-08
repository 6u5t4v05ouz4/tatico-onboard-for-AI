import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { randomUUID } from "node:crypto";
import { renderBoardSvg } from "@tattico/core";
import type { BoardSession } from "./session";
import { svgToPngDataUrl } from "./png";

interface HttpInfo {
  name: string;
  version: string;
}

interface SessionHandle {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
}

/**
 * Servidor HTTP que expõe:
 * 1. Endpoints MCP (/mcp streamable HTTP e /mcp/sse + /mcp/messages) — para IAs remotas
 * 2. Ponte REST/SSE (/api/*) — para o app web acompanhar/editar o mesmo quadro em tempo real
 *
 * Nota: o SDK MCP permite apenas UMA conexão (transport) por instância de McpServer.
 * Por isso cada sessão HTTP ganha a própria instância, todas compartilhando o BoardSession.
 */
export function createHttpApp(
  createServer: () => McpServer,
  session: BoardSession,
  info: HttpInfo,
): express.Express {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  // CORS simples (app web roda em outra porta)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, mcp-session-id, last-event-id");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // ------------------------------------------------------------------ MCP
  // streamable HTTP (sessões com estado; uma instância de servidor por sessão)
  const sessions = new Map<string, SessionHandle>();

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    const existing = typeof sessionId === "string" ? sessions.get(sessionId) : undefined;
    if (existing) {
      await existing.transport.handleRequest(req, res, req.body);
      return;
    }
    const server = createServer();
    const handle: SessionHandle = { transport: undefined!, server };
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        sessions.set(sid, handle);
      },
    });
    handle.transport = transport;
    // limpa a sessão se o cliente cair sem DELETE
    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid && sessions.has(sid)) sessions.delete(sid);
    };
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("[mcp/http] erro:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: String(err) });
      }
    }
  });

  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    const t = typeof sessionId === "string" ? sessions.get(sessionId)?.transport : undefined;
    if (!t) {
      res.status(400).json({ error: "Sessão MCP não encontrada. Use POST /mcp para iniciar." });
      return;
    }
    await t.handleRequest(req, res);
  });

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    const handle = typeof sessionId === "string" ? sessions.get(sessionId) : undefined;
    if (!handle) {
      res.status(400).json({ error: "Sessão MCP não encontrada." });
      return;
    }
    try {
      await handle.transport.handleRequest(req, res);
      await handle.server.close();
    } finally {
      const sid = handle.transport.sessionId as string;
      sessions.delete(sid);
    }
  });

  // transporte SSE (clientes que preferem o protocolo SSE clássico)
  let sseServer: McpServer | undefined;
  let sseTransport: SSEServerTransport | undefined;
  app.get("/mcp/sse", async (_req, res) => {
    sseServer = createServer();
    sseTransport = new SSEServerTransport("/mcp/messages", res);
    await sseServer.connect(sseTransport);
  });
  app.post("/mcp/messages", async (req, res) => {
    if (!sseTransport || !sseServer) {
      res.status(400).json({ error: "Sem conexão SSE ativa. Abra GET /mcp/sse primeiro." });
      return;
    }
    await sseTransport.handlePostMessage(req, res, req.body);
  });

  // ------------------------------------------------------------------ REST
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      name: info.name,
      version: info.version,
      stateVersion: session.controller.state.version,
    });
  });

  app.get("/api/state", (_req, res) => {
    res.json(session.controller.state);
  });

  app.post("/api/state", (req, res) => {
    const body = req.body;
    if (!body || typeof body !== "object" || !Array.isArray(body.players) || !Array.isArray(body.shapes)) {
      res.status(400).json({ error: "Estado inválido: esperado { players, shapes, pitch, title, version }" });
      return;
    }
    session.controller.loadState(body);
    res.json({ ok: true, version: session.controller.state.version });
  });

  // SSE de eventos do quadro (broadcast para o app web)
  app.get("/api/events", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("retry: 2000\n\n");
    const send = () => {
      const payload = JSON.stringify(session.controller.state);
      res.write(`event: state\ndata: ${payload}\n\n`);
    };
    send();
    const unsub = session.subscribe(send);
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 25000);
    req.on("close", () => {
      clearInterval(heartbeat);
      unsub();
    });
  });

  // táticas
  app.get("/api/tactics", (_req, res) => {
    res.json(session.listTactics());
  });

  app.post("/api/tactics/save", (req, res) => {
    const name = String(req.body?.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "Campo 'name' obrigatório." });
      return;
    }
    session.saveTactic(name);
    res.json({ ok: true });
  });

  app.post("/api/tactics/load", (req, res) => {
    const name = String(req.body?.name ?? "").trim();
    const ok = session.loadTactic(name);
    res.json({ ok, loaded: ok ? name : null });
  });

  app.delete("/api/tactics/:name", (req, res) => {
    const ok = session.deleteTactic(req.params.name);
    res.json({ ok });
  });

  // exportação
  app.get("/api/export.svg", (_req, res) => {
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(
      renderBoardSvg(session.controller.state, {
        background: session.pitchStyle.background ?? "#0b1220",
        pitchColor: session.pitchStyle.pitchColor ?? "#1e7d3c",
        lineColor: session.pitchStyle.lineColor,
      }),
    );
  });

  app.get("/api/export.png", async (_req, res) => {
    const svg = renderBoardSvg(session.controller.state, {
      background: session.pitchStyle.background ?? "#0b1220",
      pitchColor: session.pitchStyle.pitchColor ?? "#1e7d3c",
      lineColor: session.pitchStyle.lineColor,
    });
    const dataUrl = await svgToPngDataUrl(svg);
    if (!dataUrl) {
      res.status(500).json({ error: "Falha ao gerar PNG no servidor." });
      return;
    }
    const buf = Buffer.from(dataUrl.split(",")[1], "base64");
    res.setHeader("Content-Type", "image/png");
    res.send(buf);
  });

  return app;
}
