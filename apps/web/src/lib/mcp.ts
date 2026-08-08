import type { BoardState } from "@tattico/core";

export type McpStatus = "off" | "connecting" | "connected" | "error";

export interface TacticMeta {
  name: string;
  updatedAt: string;
}

/**
 * Cliente da ponte HTTP do servidor MCP.
 * - EventSource em /api/events recebe o estado ao vivo (o que a IA faz aparece na hora)
 * - POST /api/state envia edições locais para o servidor (que fica visível para a IA)
 */
export class McpClient {
  url: string;
  status: McpStatus = "off";
  private es: EventSource | null = null;
  private connectTimer: number | null = null;
  onStatus?: (s: McpStatus) => void;
  onState?: (s: BoardState) => void;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    this.disconnect();
    this.setStatus("connecting");
    const es = new EventSource(`${this.url}/api/events`);
    this.es = es;

    // se o servidor não responder em 5s, mostra erro em vez de "conectando…" infinito
    this.connectTimer = window.setTimeout(() => {
      if (this.status === "connecting") {
        es.close();
        this.setStatus("error");
      }
    }, 5000);

    es.addEventListener("state", (e) => {
      try {
        const state = JSON.parse((e as MessageEvent).data) as BoardState;
        this.onState?.(state);
      } catch {
        /* ignora payload inválido */
      }
    });
    es.addEventListener("open", () => {
      if (this.connectTimer !== null) {
        window.clearTimeout(this.connectTimer);
        this.connectTimer = null;
      }
      this.setStatus("connected");
    });
    es.onerror = () => {
      // EventSource tenta reconectar sozinho; refletimos o estado real
      if (es.readyState === EventSource.CLOSED) {
        if (this.connectTimer !== null) {
          window.clearTimeout(this.connectTimer);
          this.connectTimer = null;
        }
        this.setStatus("error");
      } else if (this.status === "connected") {
        // caiu e está tentando reconectar
        this.setStatus("connecting");
      }
    };
  }

  disconnect(): void {
    if (this.connectTimer !== null) {
      window.clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    this.es?.close();
    this.es = null;
    this.setStatus("off");
  }

  async pushState(state: BoardState): Promise<boolean> {
    try {
      const res = await fetch(`${this.url}/api/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async fetchState(): Promise<BoardState | null> {
    try {
      const res = await fetch(`${this.url}/api/state`);
      if (!res.ok) return null;
      return (await res.json()) as BoardState;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------- táticas
  async listTactics(): Promise<TacticMeta[]> {
    try {
      const res = await fetch(`${this.url}/api/tactics`);
      if (!res.ok) return [];
      return (await res.json()) as TacticMeta[];
    } catch {
      return [];
    }
  }

  async saveTactic(name: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.url}/api/tactics/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async loadTactic(name: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.url}/api/tactics/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { ok: boolean };
      return data.ok;
    } catch {
      return false;
    }
  }

  async deleteTactic(name: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.url}/api/tactics/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private setStatus(s: McpStatus): void {
    this.status = s;
    this.onStatus?.(s);
  }
}
