# Design System — TATICO (Quadro Tático 11v11)

> Gerado com a skill **ui-ux-pro-max** (padrão Master + Overrides).
> Consulte este arquivo antes de alterar qualquer UI. Overrides por página:
> `design-system/pages/<nome>.md` (se existir, tem precedência sobre este Master).

## Produto

- **Tipo**: Ferramenta profissional de treinamento (canvas tático de futebol 11v11) + integração IA via MCP
- **Público**: treinadores e analistas táticos (uso desktop, foco e precisão; contexto noturno/vestiário)
- **Tom**: profissional, esportivo, preciso — densidade média, hierarquia forte
- **Stack**: React 18 + Vite (web) + TS; ícones **lucide-react**; CSS custom com tokens

## Padrão visual

- **Estilo**: dark, esportivo, "scoreboard" — superfícies escuras azuladas, gramado como herói,
  acento verde-limão (pitch green), tipografia display condensada para títulos
- **Modo**: dark-first (sem modo claro no roadmap)
- **Metáfora**: análise de jogo — campo = conteúdo principal; painéis laterais = prancheta

## Tokens

```css
:root {
  --bg: #0a0f1c;        /* fundo geral */
  --bg2: #0f172a;       /* barras/painéis */
  --panel: #111a2e;     /* cartões */
  --panel2: #16213a;    /* hover/realce */
  --border: #1e293b;    /* bordas */
  --border2: #2c3e5e;   /* bordas hover */
  --text: #e2e8f0;      /* texto primário */
  --text-dim: #8ea0bd;  /* texto secundário */
  --accent: #22c55e;    /* verde-grama — ação primária, sucesso, foco */
  --accent2: #16a34a;
  --danger: #ef4444;
  --radius: 10px;
  --font-display: "Barlow Condensed", Inter, system-ui, sans-serif; /* títulos, marcas, labels */
  --font-body: "Inter", system-ui, sans-serif;                       /* corpo/UI */
}
```

### Cores funcionais de time (dados, não tokens)
- Home: `#ef4444` (vermelho) · Away: `#3b82f6` (azul) — sempre acompanhadas de texto/forma
- Posse vs Sem posse (instruções): verde (`phase-with`) vs azul (`phase-without`)

## Tipografia

- **Display**: Barlow Condensed 600/700 — `h1` da marca (26px, letter-spacing 3.5px) e `.panel-title`
  (14px, uppercase, letter-spacing 1.4px). Sensação de placar esportivo.
- **Corpo/UI**: Inter 400–700 — base 13–14px (tool denso), hints 12px mínimo.
- Escala: 10 / 12 / 13 / 14 / 18 / 26

## Efeitos

- Sombras: `--shadow` (0 8px 24px rgba(0,0,0,.45)) para elevação; drop-shadow no canvas
- Radii: 8–12px, consistente
- Movimento: 150–300ms; `prefers-reduced-motion` desliga tudo (CSS global)
- Transições: transform/opacity/color/box-shadow (nunca width/height)

## Regras de UI (das 99 diretrizes da skill)

1. **Acessibilidade (crítico)**: `aria-label` em botões só-ícone; `aria-pressed` em toggles
   (ferramentas, times, cores, idioma); `focus-visible` com outline verde em todos os controles;
   SVG do quadro com `role="img"` + `aria-label`; contraste ≥ 4.5:1 (texto) — validado nos tokens.
2. **Ícones**: somente **lucide-react** (nunca emoji como ícone funcional). Emoji ⚽ reservado à
   marca do topbar. Glifos de status (●◌✕○) substituídos por ícones (Wifi, Loader2, AlertCircle, WifiOff).
3. **Estado vazio**: canvas vazio mostra overlay "Quadro vazio" com orientação (i18n).
4. **Feedback**: conexão MCP tem estados conectando/conectado/erro/off visíveis na statusbar e no painel.
5. **Ação primária**: uma CTA primária por tela — "Exportar PNG" (gradiente verde) no topbar.
6. **Responsivo**: ≤1100px encolhe painéis; ≤900px empilha (board primeiro, toolbar horizontal, sidebar abaixo).
7. **i18n**: todas as strings via `apps/web/src/lib/i18n.ts` (PT-BR/EN-US); novas strings devem entrar no dicionário.

## Anti-padrões (evitar)

- Emoji como ícone estrutural (⚽🛡 em controles) — usar lucide
- Texto < 12px (hints/dicas) — manter ≥ 12px
- Hex solto dentro de componentes — sempre por token ou dicionário de cores
- Animar width/height ou transições > 400ms
- Remover outline de foco em favor de `outline: none` puro
- Conveitar estado só por cor (ex.: time) sem texto/forma complementar
- Strings hardcoded fora do dicionário i18n

## Revisão pré-entrega

- [ ] Contrastes 4.5:1 (texto) verificados nos tokens
- [ ] Todos os controles com `:focus-visible`
- [ ] Botões só-ícone com `aria-label`
- [ ] Toggles com `aria-pressed`
- [ ] Sem emoji funcional (só lucide)
- [ ] `prefers-reduced-motion` respeitado
- [ ] Testado em ~900px (empilhado) e desktop
