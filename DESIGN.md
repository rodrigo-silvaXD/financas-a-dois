---
version: 1.0
name: financas-a-dois
description: >
  Mobile-first PWA financeiro do casal. Inspiração Apple Wallet / Apple Health / Notas / Oura / Revolut / Monzo:
  MUITO respiro, tipografia grande, cantos generosos, sombras discretas, uma cor primária calma (indigo/navy
  desaturado) e um accent coral muito parcimonioso para o "toque a dois". Sem branco puro, sem preto puro.
  Tema claro e escuro desde o dia 1, ambos confortáveis para uso noturno. Animações estilo Apple: curtas,
  discretas, natural easing.

colors:
  # LIGHT
  light:
    canvas:        "#F8F9FA"   # fundo do app
    surface:       "#FDFDFD"   # card, superfície elevada
    surface-muted: "#F1F2F5"   # pill, campo, chip
    ink:           "#1A1A2E"   # texto principal
    ink-muted:     "#5B5B72"   # texto secundário
    ink-subtle:    "#8A8FA0"   # placeholder / meta
    hairline:      "#E6E7EB"   # divisores 1px
    brand:         "#4C5FA8"   # primário — indigo/navy desaturado
    brand-hover:   "#3E4F92"
    brand-ink:     "#FDFDFD"   # texto sobre brand
    accent:        "#F97066"   # coral — badge "casal", sinais afetivos, uso raríssimo
    success:       "#10B981"
    warning:       "#F59E0B"
    danger:        "#EF4444"

  # DARK — pensado pra uso noturno (não é OLED cru)
  dark:
    canvas:        "#0F1117"
    surface:       "#171A22"
    surface-muted: "#212430"
    ink:           "#E8EAED"
    ink-muted:     "#A0A4B0"
    ink-subtle:    "#6B6F7C"
    hairline:      "#2A2D38"
    brand:         "#8A97D4"   # lavanda navy — legível, sem gritar
    brand-hover:   "#A2AEE0"
    brand-ink:     "#0F1117"
    accent:        "#FB8A80"
    success:       "#34D399"
    warning:       "#FBBF24"
    danger:        "#F87171"

typography:
  # Base 16px, mobile-first. Inter via next/font/google (fallback SF em iOS).
  fontFamily:
    sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    mono: "ui-monospace, 'SF Mono', Menlo, monospace"
  scale:
    display: { fontSize: 34px, lineHeight: 1.15, letterSpacing: -0.02em,  fontWeight: 700 }  # saldos grandes
    title:   { fontSize: 24px, lineHeight: 1.20, letterSpacing: -0.015em, fontWeight: 600 }  # títulos de tela
    heading: { fontSize: 20px, lineHeight: 1.25, letterSpacing: -0.01em,  fontWeight: 600 }  # cards, sheets
    body:    { fontSize: 16px, lineHeight: 1.50, letterSpacing: -0.005em, fontWeight: 400 }
    bodysm:  { fontSize: 14px, lineHeight: 1.45, letterSpacing: 0,         fontWeight: 400 }
    caption: { fontSize: 12px, lineHeight: 1.40, letterSpacing: 0,         fontWeight: 500 }
    button:  { fontSize: 15px, lineHeight: 1.20, letterSpacing: 0,         fontWeight: 600 }

radius:
  sm:  8px    # chips, badges
  md:  12px   # botões, inputs
  lg:  16px   # cards
  xl:  24px   # bottom sheets, modais
  pill: 9999px

spacing:
  # base 4px
  xxs: 4px
  xs:  8px
  sm:  12px
  md:  16px
  lg:  24px
  xl:  32px
  xxl: 48px

shadows:
  none: none
  sm:   "0 1px 2px rgba(20, 22, 30, 0.05), 0 1px 3px rgba(20, 22, 30, 0.04)"
  md:   "0 2px 4px rgba(20, 22, 30, 0.06), 0 4px 12px rgba(20, 22, 30, 0.06)"
  # Nunca shadow-lg. Elevação vem do surface ladder, não da sombra.

motion:
  easing:
    apple:     "cubic-bezier(0.25, 0.1, 0.25, 1.0)"   # geral — inputs, hovers
    apple-out: "cubic-bezier(0.16, 1, 0.3, 1)"        # entradas de sheets/modais
  duration:
    fast: 180ms   # micro (hover, focus)
    base: 220ms   # padrão de transição
    slow: 280ms   # bottom sheet, page transition
  # NUNCA rebote/spring exagerado. Botão tap = scale 0.97 em 180ms.
---

## Overview

App financeiro para casais, PWA instalável. A tela é curada: **poucos elementos, muito respiro, tipografia grande**. Dinheiro é assunto sério — a interface precisa transmitir calma e clareza, não urgência ou hype.

O sistema tem **uma única cor de marca** (indigo/navy desaturado) e um coral quase escondido para pontos afetivos (badges de "casal", pequenos moments). Nada de gradientes atmosféricos, nada de degradê hero. Cor cansa; luz não.

Tema claro e escuro obrigatórios desde o dia 1. O dark **não** é o light invertido — foi calibrado pra uso noturno confortável (fundo `#0F1117`, não OLED cru; brand vira lavanda navy pra legibilidade).

### Palette philosophy
- **`ink` é preto suavizado** (`#1A1A2E`) e **`canvas` é branco quebrado** (`#F8F9FA`). Nada de `#000` / `#FFF` puros — cansa a vista.
- **Brand só nos lugares certos:** botão primário, ícone selecionado no BottomNav, FAB, saldo positivo, links de ação. **Não** vira fundo de card.
- **Accent coral (`#F97066`) é escasso.** Só em: badge "A dois" na conta do casal, marca de conquista partilhada. Em qualquer outro lugar, some.
- **Semânticos** (`success`/`warning`/`danger`) só na função semântica correspondente — nunca decorativos.

## Typography

- **Inter** via `next/font/google`. Fallback SF Pro em iOS mantém a consistência sem download em PWAs instalados.
- Escala mobile-first, tracking negativo em títulos (padrão Apple/iOS).
- **`display` (34/700)** só pra saldos grandes na home. Aparece 1x por tela no máximo.
- Corpo `body` a 16/400 com `line-height: 1.5` — leitura sem esforço.
- Botão `button` a 15/600. **Sem uppercase**. Sem tracking positivo em botão.

## Layout & spacing

- **Container central de largura máx `max-w-md` (28rem / 448px).** Mobile-first sempre; a versão "desktop" é a mobile centralizada com margens. Sem multi-coluna, sem sidebar.
- **Base de 4px.** Padding de card = `lg` (24px). Gap entre cards = `md` (16px).
- **Safe area:** `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` em TopBar e BottomNav — obrigatório em PWA standalone.
- **Whitespace é o assunto principal:** telas com <7 elementos. Se precisar de mais, quebra em sub-telas ou sheets.

## Shapes & elevation

- **`radius.md` 12px em botões e inputs. `radius.lg` 16px em cards. `radius.xl` 24px em bottom sheets/modais.** Chips e badges = `sm` 8px. Nunca pill em botão de ação — só em toggle/tab.
- **Elevação só via 2 sombras** (`shadow-sm`, `shadow-md`). `shadow-lg` proibido. Hierarquia primária vem do surface ladder (`canvas → surface-muted → surface`), não de sombras.

## Motion

- **Easing `apple`** para transições de estado (color/background/scale). **Easing `apple-out`** para entradas de sheet/modal (decelera no fim, sensação de "encosta").
- Durações: `180ms` micro-interações, `220ms` transições padrão, `280ms` sheets. Passou disso, cansa.
- **Botão tap:** `whileTap={{ scale: 0.97 }}` no Framer Motion. Só isso.
- **Bottom sheet:** slide-up com `apple-out`, backdrop com fade `apple`.
- **Sem parallax, sem spring rebote, sem stagger de mais de 60ms.** Curto e discreto.
- **Nada de haptics no PWA** — fora do escopo.

## Components

Todos em `frontend/src/components/ui/`. Cada componente tem no máximo as variantes que hoje existem — não invente `variant` que ninguém pediu.

### Button
- **variants:** `primary` (fundo `brand`), `secondary` (fundo `surface-muted`), `ghost` (transparente com hover `surface-muted`).
- **sizes:** `md` (h-11) e `lg` (h-14, largura total em CTAs).
- Corner `md` 12px, weight 600, sem uppercase. `scale 0.97` no tap.

### Input
- Altura 48px, fundo `surface-muted`, corner `md`. Foco: borda `brand` + fundo vira `surface`. Erro: borda `danger` + hint em `danger`.
- Label acima em `bodysm/500 ink-muted`. Hint abaixo em `caption`.

### Card
- Fundo `surface`, borda `hairline` 1px, corner `lg` 16px, padding 16px (24px em cards protagonistas como o de saldo), `shadow-sm`.
- `interactive={true}` aplica `active:scale-[0.99]` sem sombra ao clicar.

### BottomSheet
- Rounded top 24px (`radius.xl`). Backdrop `bg-ink/40` com `backdrop-blur-sm`. Slide-up `apple-out` 280ms. Handle no topo (`h-1 w-10 bg-hairline`).
- Fecha em `Escape` e clique no backdrop. `max-h: 85dvh` com scroll interno.

### Badge
- Corner `sm` 8px, padding `2px 8px`, `caption 12/500`.
- **tones:** `neutral`, `brand`, `success`, `warning`, `danger`. `accent` fica exclusivo para "A dois" (badge da conta compartilhada).

### ProgressBar
- Trilho `surface-muted`, altura 8px, corner `pill`. Preenchimento nos tons semânticos. Label opcional com valor e % nas pontas.

### BottomNav
- 5 slots, `max-w-md`, `safe-bottom`. Fundo `surface/90 + backdrop-blur-md`. Ícone selecionado = `brand`, restante = `ink-subtle`.
- Slot central "Novo" é o CTA — ícone maior (28px vs 22px).

### TopBar
- Sticky, `safe-top`, `bg-canvas/80 + backdrop-blur-md`, altura 56px.
- Contém: back (opcional), título `heading`, slot direito + botão de tema (sol/lua).

### EmptyState
- Ícone dentro de um pill `surface-muted` (padding 16px), título `heading`, descrição `body ink-muted` com `max-w-xs`. Sempre com CTA embaixo (`mt-6`).

## Rules of thumb

**Do**
- Mantenha `<7` elementos por viewport.
- Um único CTA primário por tela.
- Use surface ladder (canvas → surface-muted → surface) para hierarquia, sombras só quando o card precisa "descolar" do fundo.
- Números grandes de dinheiro em `display 34/700` com tracking negativo.
- Anime só o que muda de posição/scale. Nunca `all`.

**Don't**
- Sem `#FFFFFF` nem `#000000` puros.
- Sem gradiente atmosférico atrás de card.
- Sem sombra maior que `shadow-md`.
- Sem tap-highlight cinza do WebKit — desligado no `body` (`-webkit-tap-highlight-color: transparent`).
- Sem uppercase em botão.
- Sem `text-lg` genérico — use tokens (`text-body`, `text-heading`, `text-display`).
- Sem `shadow-lg`, `blur-3xl`, `bg-gradient-to-*` — o design é anti-hype.

## Iteration guide

1. Uma tela nova = decidir primeiro **em qual surface ela vive** (canvas para lista, surface para form em modal).
2. Escolher **exatamente um** dos 7 tamanhos tipográficos. Se você precisou de um novo, provavelmente é uma tela mal desenhada.
3. Escolher **um único CTA** por viewport. Se a tela tem 2 primários, uma delas é secondary.
4. Rodar dark + light + safe-area sem hairline sumindo.
5. Rodar em 375×667 (iPhone SE) — tem que caber.
