# TATICO — 11v11 Tactical Board with MCP access

A functional clone of [tactical-board.com/big-football-vertical](https://tactical-board.com/big-football-vertical):
an 11v11 football tactical board (vertical pitch ~105×68 m) with **full MCP access** —
any AI (Claude Desktop, Cursor, VS Code, etc.) can see and **edit the board live**.

> ⚠️ Original implementation, built from scratch (own SVG engine, own logic). No code or
> asset from the original site was copied — only the features were reproduced.

## Features

**Board (web app — `apps/web`)**
- Vertical 11v11 football pitch with all markings (penalty areas, penalty spots, arcs, center circle, corner arcs, goal lines)
- Draggable players with number, name and color (2 teams: home/away)
- Ready-made formations: 4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 3-4-3, 5-3-2, 4-1-4-1
- Drawing tools: line, arrow, curve (b-spline), rectangle, ellipse and text — 6 colors, dashed strokes
- Editing: move, resize, recolor, delete; undo/redo; zoom and pan (mouse-wheel zoom, middle-button or Shift+drag to pan)
- **3D view mode**: a real three.js scene with orbital camera, 4 camera presets (Default, Top, Side, Behind goal), players as 3D markers and shapes as thick 3D lines — synced live with the 2D board and lazy-loaded so the 3D engine only downloads when you switch to it
- Per-player tactical instructions (with/without possession)
- Export PNG (high resolution) and SVG
- Save/load tactics (localStorage or via the MCP server)
- i18n: PT-BR / EN-US
- Accessibility: `aria-label`/`aria-pressed` across controls, `prefers-reduced-motion` support

**AI (MCP server — `packages/mcp-server`)** — 24 tools:
`get_board_state`, `new_board`, `set_title`, `add_player`, `move_player`, `update_player`,
`update_player_instructions`, `remove_player`, `clear_players`, `set_formation`, `add_shape`,
`update_shape`, `remove_shape`, `clear_shapes`, `undo`, `redo`, `export_svg`, `export_png`,
`save_tactic`, `load_tactic`, `list_tactics`, `delete_tactic`, `get_board_summary`,
`set_pitch_style`

**Live sync**: when the web app connects to the MCP server, the AI and the browser share the
**same state** — the AI sets up a 4-3-3 and the board updates instantly, and anything you
draw in the browser is visible to the AI via `get_board_state`.

## Architecture

```
TATICO/
├─ packages/
│  ├─ core/          # shared engine (state, formations, SVG rendering) — pure TS
│  └─ mcp-server/    # MCP server: stdio + HTTP/SSE + REST bridge for the web app
└─ apps/
   └─ web/           # React + Vite app (interactive board, 2D + 3D)
```

`core` is the single source of truth for state (players, shapes, version). The MCP server and
the web app operate on the same session; changes on one side propagate to the other via SSE.

## How to run

```bash
npm install

# terminal 1 — web app (http://localhost:5173)
npm run dev:web

# terminal 2 — MCP server with HTTP + stdio (http://localhost:3001) — required to sync with the AI
npm run dev:mcp       # equivalent to dev:both (HTTP on port 3001 + stdio for Claude/Cursor)
```

In the web app: in the right-hand panel, click **Connect** (default URL `http://localhost:3001`).
The status turns green and the AI can see/edit the board.

## Connect an AI via MCP

### Claude Desktop

Edit `claude_desktop_config.json` (Claude → Settings → Developer → Edit Config):

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

Then run `npm run build` (or `npm run build -w @tattico/mcp-server`) and restart Claude.

> 💡 **For live sync with the web app** (the AI sees/edits the SAME board as the browser),
> use the HTTP transport instead of stdio — Claude Desktop talks to the same process that
> the web app connects to (keep `npm run dev:mcp` running):
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
> With stdio, each server process has its own board (state separate from the web app).

### Cursor

`.cursor/mcp.json` at the project root:

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

### Other clients (HTTP transport)

The server also exposes MCP at `POST /mcp` (streamable HTTP) and `GET /mcp/sse` — point your
client at `http://localhost:3001/mcp`.

### Example prompts for the AI

> "Set up the home team in a 4-3-3 with the striker pushed highest."
> "Draw an arrow from the left-back to the left winger."
> "Export the board as PNG."

## Useful scripts

| Command | What it does |
|---|---|
| `npm run dev:web` | Web app at http://localhost:5173 |
| `npm run dev:http` | MCP server over HTTP (port 3001) |
| `npm run dev:mcp` | MCP server stdio + HTTP (port 3001) — what the web app needs to Connect |
| `npm run build` | Builds web + server |
| `npm run typecheck` | Typechecks all packages |
| `npm run smoke` | Smoke test for core/server |

## Roadmap — missing features

**3D view (view-only today)**
- [ ] Edit directly in 3D (raycasting to place players and draw shapes on the pitch)
- [ ] Export the 3D view as PNG (client-side canvas capture)
- [ ] Camera sync between 2D and 3D modes (same viewport when switching)

**Presentation & sharing**
- [ ] Keyframe animations + video export (like the original site)
- [ ] Share via link and real-time collaboration
- [ ] Pitch style editor in the UI (colors/background — currently only via `set_pitch_style` for exports)

**Content & quality**
- [ ] Custom (user-defined) formations
- [ ] Other sports (futsal, basketball, etc.)
- [ ] Automated test suite (unit + end-to-end)
