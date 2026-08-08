#!/usr/bin/env node
/**
 * Cliente MCP de linha de comando para o quadro TATICO.
 * Conecta ao servidor via transporte HTTP streamable (o MESMO processo que o
 * app web usa), chama uma ferramenta e imprime a resposta — o resultado reflete
 * ao vivo no navegador.
 *
 * Uso:
 *   node scripts/mcp-cli.mjs <ferramenta> ['{"arg": valor}']
 *   node scripts/mcp-cli.mjs tools
 *
 * Exemplos:
 *   node scripts/mcp-cli.mjs get_board_summary
 *   node scripts/mcp-cli.mjs add_player '{"x":34,"y":50,"side":"home","number":10,"name":"Neymar"}'
 *   node scripts/mcp-cli.mjs set_formation '{"side":"home","formation":"4-3-3"}'
 *
 * Env: MCP_URL (padrão http://localhost:3001/mcp)
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const toolName = process.argv[2];
const argsJson = process.argv[3];

if (!toolName) {
  console.log("Uso: node scripts/mcp-cli.mjs <ferramenta> ['{\"arg\": valor}']");
  console.log("     node scripts/mcp-cli.mjs tools   (lista as ferramentas)");
  process.exit(1);
}

const url = new URL(process.env.MCP_URL ?? "http://localhost:3001/mcp");
const transport = new StreamableHTTPClientTransport(url);
const client = new Client({ name: "tattico-cli", version: "1.0.0" }, { capabilities: {} });

try {
  await client.connect(transport);

  if (toolName === "tools") {
    const { tools } = await client.listTools();
    for (const t of tools) {
      console.log(`• ${t.name} — ${t.description ?? ""}`);
    }
    await client.close();
    process.exit(0);
  }

  let args = {};
  if (argsJson) {
    try {
      args = JSON.parse(argsJson);
    } catch {
      console.error("Argumentos JSON inválidos:", argsJson);
      await client.close();
      process.exit(1);
    }
  }

  const res = await client.callTool({ name: toolName, arguments: args });
  if (res?.content) {
    for (const c of res.content) {
      console.log(c.type === "text" ? c.text : JSON.stringify(c));
    }
  } else {
    console.log(JSON.stringify(res));
  }
  await client.close();
  if (res?.isError) process.exit(1);
} catch (err) {
  console.error("✗ Falha ao conectar/chamar MCP:", err?.message ?? err);
  console.error("  O servidor está rodando? (npm run dev:mcp / porta 3001)");
  process.exit(1);
}
