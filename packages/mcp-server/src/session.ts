import { BoardController } from "@tattico/core";
import type { BoardState } from "@tattico/core";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface TacticMeta {
  name: string;
  updatedAt: string;
}

export interface PitchStyle {
  background?: string;
  pitchColor?: string;
  lineColor?: string;
}

/**
 * Sessão do quadro tático compartilhada entre:
 * - o servidor MCP (ferramentas da IA) e
 * - a ponte HTTP/SSE (app web em tempo real).
 *
 * Toda mutação do controller dispara os listeners (SSE no navegador).
 * Táticas são persistidas como JSON em <dataDir>/tactics.
 */
export class BoardSession {
  readonly controller: BoardController;
  readonly dataDir: string;
  /** estilo visual usado nas exportações (export_svg / export_png) */
  pitchStyle: PitchStyle = {};
  private listeners = new Set<() => void>();

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    mkdirSync(join(dataDir, "tactics"), { recursive: true });
    this.controller = new BoardController();
    // qualquer mudança de estado (ferramenta MCP ou POST /api/state) propaga
    this.controller.onChange = () => this.emit();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(): void {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch (err) {
        console.error("erro no listener da sessão:", err);
      }
    }
  }

  private tacticPath(name: string): string {
    const slug =
      name
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "tatica";
    return join(this.dataDir, "tactics", `${slug}.json`);
  }

  listTactics(): TacticMeta[] {
    const dir = join(this.dataDir, "tactics");
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try {
          const raw = JSON.parse(readFileSync(join(dir, f), "utf-8")) as {
            name?: string;
            updatedAt?: string;
          };
          return {
            name: raw.name ?? f.replace(/\.json$/, ""),
            updatedAt: raw.updatedAt ?? "",
          };
        } catch {
          return { name: f.replace(/\.json$/, ""), updatedAt: "" };
        }
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  saveTactic(name: string): void {
    const file = this.tacticPath(name);
    const payload = {
      name: name.trim(),
      updatedAt: new Date().toISOString(),
      state: this.controller.state,
    };
    writeFileSync(file, JSON.stringify(payload, null, 2), "utf-8");
  }

  loadTactic(name: string): boolean {
    const file = this.tacticPath(name);
    if (!existsSync(file)) return false;
    const raw = JSON.parse(readFileSync(file, "utf-8")) as { state: BoardState };
    if (!raw.state || !Array.isArray(raw.state.players)) return false;
    this.controller.loadState(raw.state);
    return true;
  }

  deleteTactic(name: string): boolean {
    const file = this.tacticPath(name);
    if (!existsSync(file)) return false;
    unlinkSync(file);
    return true;
  }
}
