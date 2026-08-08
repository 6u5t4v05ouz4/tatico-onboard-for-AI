# TATICO — Quadro Tático 11v11 com acesso via MCP

Clone funcional do [tactical-board.com/pt/big-football-vertical](https://tactical-board.com/pt/big-football-vertical):
quadro tático de futebol 11v11 (campo vertical ~105×68 m) com **acesso total via MCP** —
qualquer IA (Claude Desktop, Cursor, VS Code, etc.) pode ver e **editar o quadro ao vivo**.

> ⚠️ Implementação original, criada do zero (SVG próprio, lógica própria). Nenhum código ou
> asset do site original foi copiado — apenas as funcionalidades foram reproduzidas.

## Funcionalidades

**Quadro (app web — `apps/web`)**
- Campo de futebol 11v11 vertical com todas as marcações (áreas, pênalti, círculo central, arcos)
- Jogadores arrastáveis com número, nome e cor (2 times: casa/fora)
- Formações prontas: 4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 3-4-3, 5-3-2, 4-1-4-1
- Desenho de formas: linha, seta, curva (b-spline), retângulo, elipse e texto — 6 cores, tracejado
- Edição: mover, redimensionar, recolorir, apagar; undo/redo; zoom e pan
- Exportar PNG (alta resolução) e SVG
- Salvar/carregar táticas (localStorage ou no servidor MCP)

**IA (servidor MCP — `packages/mcp-server`)** — 23 ferramentas:
`get_board_state`, `new_board`, `set_title`, `add_player`, `move_player`, `update_player`,
`remove_player`, `clear_players`, `set_formation`, `add_shape`, `update_shape`, `remove_shape`,
`clear_shapes`, `undo`, `redo`, `export_svg`, `export_png`, `save_tactic`, `load_tactic`,
`list_tactics`, `delete_tactic`, `get_board_summary`, `set_pitch_style`

**Sincronização ao vivo**: quando o app web conecta ao servidor MCP, a IA e o navegador
compartilham o **mesmo estado** — a IA monta um 4-3-3 e o quadro atualiza na hora, e o que
você desenha no navegador fica visível para a IA via `get_board_state`.

## Arquitetura

```
TATICO/
├─ packages/
│  ├─ core/          # motor compartilhado (estado, formações, render SVG) — TS puro
│  └─ mcp-server/    # servidor MCP: stdio + HTTP/SSE + ponte REST para o app web
└─ apps/
   └─ web/           # app React + Vite (quadro interativo)
```

O `core` é a única fonte de verdade do estado (jogadores, formas, versão). O servidor MCP e o
app web operam sobre a mesma sessão; mudanças de um lado propagam para o outro via SSE.

## Como rodar

```bash
npm install

# terminal 1 — app web (http://localhost:5173)
npm run dev:web

# terminal 2 — servidor MCP com HTTP + stdio (http://localhost:3001) — necessário p/ sincronizar com a IA
npm run dev:mcp       # equivale a dev:both (HTTP na porta 3001 + stdio para Claude/Cursor)
```

No app web: no painel direito, clique em **Conectar** (URL padrão `http://localhost:3001`).
O status fica verde e a IA passa a ver/editar o quadro.

## Conectar a IA via MCP

### Claude Desktop

Edite `claude_desktop_config.json` (Claude → Configurações → Developer → Edit Config):

```json
{
  "mcpServers": {
    "tattico": {
      "command": "node",
      "args": ["D:/Users/n4r1g4/Desktop/TATICOBOARD/packages/mcp-server/dist/index.mjs"],
      "env": { "MCP_TRANSPORT": "stdio" }
    }
  }
}
```

Depois rode `npm run build` (ou `npm run build -w @tattico/mcp-server`) e reinicie o Claude.

> 💡 **Para sincronizar ao vivo com o app web** (a IA vê/edita o MESMO quadro do navegador),
> use o transporte HTTP em vez do stdio — o Claude Desktop conversa com o mesmo processo
> que o app web (exija `npm run dev:mcp` rodando):
>
> ```json
> {
>   "mcpServers": {
>     "tattico": {
>       "type": "http",
>       "url": "http://localhost:3001/mcp"
>     }
>   }
> }
> ```
>
> Com o stdio, cada processo do servidor tem seu próprio quadro (estado separado do app web).

### Cursor

`.cursor/mcp.json` na raiz do projeto:

```json
{
  "mcpServers": {
    "tattico": {
      "command": "node",
      "args": ["D:/Users/n4r1g4/Desktop/TATICOBOARD/packages/mcp-server/dist/index.mjs"],
      "env": { "MCP_TRANSPORT": "stdio" }
    }
  }
}
```

### Outros clientes (transporte HTTP)

O servidor também expõe MCP em `POST /mcp` (streamable HTTP) e `GET /mcp/sse` — aponte o
cliente para `http://localhost:3001/mcp`.

### Exemplos de prompts para a IA

> "Monte o time da casa em 4-3-3 com o centroavante mais avançado."
> "Desenhe uma seta do lateral esquerdo até o ponta esquerda."
> "Exporte o quadro como PNG."

## Scripts úteis

| Comando | O que faz |
|---|---|
| `npm run dev:web` | App web em http://localhost:5173 |
| `npm run dev:http` | Servidor MCP HTTP (porta 3001) |
| `npm run dev:mcp` | Servidor MCP stdio + HTTP (porta 3001) — o que o app web precisa para Conectar |
| `npm run build` | Compila web + servidor |
| `npm run typecheck` | Typecheck de todos os pacotes |
| `npm run smoke` | Smoke test do core/servidor |

## Próximos passos sugeridos

- Animações por keyframes + exportação de vídeo (como o site original)
- Compartilhamento por link e colaboração em tempo real
- Outros esportes (futsal, basquete, etc.)
