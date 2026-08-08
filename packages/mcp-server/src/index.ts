import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import { BoardSession } from "./session";
import { registerTools } from "./tools";
import { createHttpApp } from "./http";

const NAME = "tattico-board";
const VERSION = "0.1.0";

function resolveDataDir(): string {
  const env = process.env.TATICO_DATA_DIR;
  if (env) return env;
  // padrão: <pasta do pacote>/data
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgRoot = join(here, "..", "..", ".."); // dist/.. -> packages, src/.. -> packages
  const candidates = [
    join(here, "..", "data"), // dist/data ou src/data
    join(pkgRoot, "data"),
  ];
  for (const c of candidates) {
    try {
      mkdirSync(c, { recursive: true });
      return c;
    } catch {
      /* tenta o próximo */
    }
  }
  return join(process.cwd(), "data");
}

function parseTransport(): "stdio" | "http" | "both" {
  // aceita tanto `--transport http` quanto `--transport=http`
  const spaced = process.argv.indexOf("--transport");
  const flag =
    spaced >= 0
      ? process.argv[spaced + 1]
      : process.argv.find((a) => a.startsWith("--transport="))?.split("=")[1];
  const env = process.env.MCP_TRANSPORT;
  const mode = flag ?? env ?? "stdio";
  if (mode === "http" || mode === "both") return mode;
  return "stdio";
}

async function main(): Promise<void> {
  const transport = parseTransport();
  const dataDir = resolveDataDir();
  console.error(`[tattico-mcp] dataDir: ${dataDir}`);
  console.error(`[tattico-mcp] transporte: ${transport}`);

  const session = new BoardSession(dataDir);
  // cada sessão HTTP ganha sua própria instância de McpServer (limitação do SDK),
  // todas compartilhando a mesma sessão/estado do quadro.
  const makeServer = () => {
    const s = new McpServer({ name: NAME, version: VERSION });
    registerTools(s, session);
    return s;
  };

  const httpPort = Number(process.env.MCP_HTTP_PORT ?? 3001);

  if (transport === "http" || transport === "both") {
    const app = createHttpApp(makeServer, session, { name: NAME, version: VERSION });
    app.listen(httpPort, () => {
      console.error(`[tattico-mcp] HTTP pronto em http://localhost:${httpPort}`);
      console.error(`[tattico-mcp] endpoint MCP: POST/GET http://localhost:${httpPort}/mcp`);
      console.error(`[tattico-mcp] estado do board:  GET  http://localhost:${httpPort}/api/state`);
      console.error(`[tattico-mcp] eventos SSE:      GET  http://localhost:${httpPort}/api/events`);
    });
  }

  if (transport === "stdio" || transport === "both") {
    const server = makeServer();
    const stdio = new StdioServerTransport();
    await server.connect(stdio);
    console.error("[tattico-mcp] stdio pronto — conecte via Claude Desktop, Cursor, etc.");
  }
}

main().catch((err) => {
  console.error("[tattico-mcp] erro fatal:", err);
  process.exit(1);
});
