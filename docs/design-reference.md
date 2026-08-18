# Curated Supply — Design Reference

Source: https://www.curated.supply/ (homepage) and /products/xbloom-studio-coffee-machine
Researched 2026-08-18 via raw HTML + live computed styles in a 1280px viewport.

**Platform note:** the site is NOT Shopify — it is built with **Framer** (`<!-- Made in Framer -->`, generator meta `Framer`). All CSS is inlined/generated; colors come from Framer design tokens defined on `body`. Product images are hosted at `assets.curated.supply` (webp, pre-rendered on white).

---

## 1. Typography

Three fonts, all from the **Geist family (Vercel)** — free and open source (Google Fonts / npm `geist`). Loaded from `fonts.gstatic.com` (Google Fonts CDN) plus Framer-hosted copies on `framerusercontent.com/assets/`. Fragment Mono is also loaded from Google Fonts but plays a minor role.

| Role | Font stack | Size / line-height | Weight | Letter-spacing | Color |
|---|---|---|---|---|---|
| H1 / page titles (hero, product title) | `"Geist Variable", sans-serif` | 40px / 44px (1.1em; authored as `2.5rem`) | variable `wght 520` (medium-ish) | **-0.02em** (-0.8px) | `#141414` |
| Section heading "About" (product page) | `Geist` | 32px | 400 | ~-0.02em | `#141414` |
| Sub-headings ("More in", "Featured in", header price) | `Geist`, rendered as H5 | 24px | 400 | tight | `#141414` |
| Body / descriptions | `"Geist", sans-serif` | 16px / 24px | 400 | +0.01em | `#737373` |
| UI text (nav, card titles, buttons, meta) | `"Geist Variable"` | 14px / 20px | variable `wght 450` | +0.01em | `#141414` (primary) / `#737373` (secondary) |
| Small captions | `Geist` | 14px / 20px | 400 | 0 | `#737373` |
| **Prices & numeric data** | `"Geist Mono Variable", monospace` | 14px / 20px | `wght 400` | +0.01em (0.14px) | `#141414` |
| (accents, rarely) | `Fragment Mono` | 14px | 400 | — | — |

- **No uppercase anywhere** — `text-transform: none` throughout; the look comes from smallness + grayness, not caps.
- Geist is used with OpenType alt sets on (`ss02/ss03/ss04...`, `cv03/cv04/cv09/cv11`) for the single-story rounded look.
- Type scale is very flat: essentially 14 / 16 / 24 / 32 / 40.

## 2. Colors

Full token palette (from Framer tokens on `body`):

| Purpose | Hex |
|---|---|
| Page background | `#f2f2f2` (light warm gray) |
| Card / surface background | `#ffffff` |
| Primary text & primary button bg | `#141414` (near-black) |
| Secondary/body text | `#737373` (mid gray) |
| Alt secondary text (one variant) | `#666666` |
| Dark hover / button hover shade | `#2e2e2e` |
| Borders / dividers | `#e2e2e2` (also 60% alpha `#e2e2e299`) |
| Subtle surface / chip bg / icon-button bg | `#f5f5f5` |
| Alt subtle surfaces | `#ebebeb`, `#e8e8e8`, `#fdfdfd`, `#f8f8f8` |
| Muted stroke | `#cccccc` |
| Scrim / soft shadow tint | `#a4a4a433`, `#0c0c0c33` |
| Success dot ("Updated every Sunday" badge) | small green dot next to 14px `#737373` text |

- No brand accent color at all. The only "accent" is black (`#141414`) used for the primary CTA. Everything else is a grayscale ramp.
- Link/interaction color transition: gray `#737373` ⇄ near-black `#141414`, `transition: color .4s cubic-bezier(.44, 0, .56, 1)` (no underlines, `text-decoration: none` everywhere).

## 3. Layout (homepage)

- Content max-width: **1400px** (`max-width:1400px` in CSS; at 1280 viewport content measures 1233px), horizontal page padding **16px**.
- Structure: floating pill nav (centered) → hero (centered, badge + H1 + subtext + email pill form) → sticky-feeling filter bar (category pills left, "Sort by: Featured" dropdown right) → product grid → "Show More" pill button.
- **Product grid**: CSS grid, `grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))` (a secondary grid uses `minmax(280px, 1fr)`), **gap: 16px**. That yields 3 columns at ~1265px viewport (card ≈ 400px), 4 on wide screens. Related-products grid on product page: 3 columns, gap 40px isn't used for cards — cards there also sit in the 16px-gap auto-fill grid.
- Hero H1 is centered; everything below (grid, section titles) is left-aligned.
- Newsletter form: white pill (radius ~28px, height ~40px) containing borderless 14px Geist input (`name@email.com`) + black text "Subscribe" button.
- Filter pills: height 36px, `border-radius: 32px`, padding `8px 12px 8px 10px`, small line icon + 14px Geist (wght 450) `#737373` label; resting bg `#f2f2f2` (blends into page), active pill turns white with dark text. Nav bar items are the same pattern: 14px gray text, active item gets a white pill (padding `6px 12px`, h 36).

## 4. Product card anatomy

Card = white rounded block, flex column:

- Wrapper: `background: #ffffff`, **border-radius: 16px**, **no border, no shadow** — separation from the `#f2f2f2` page is purely tonal.
- Image zone (the whole zone is the `<a>` to the product): padding `24px 16px 8px`; image `aspect-ratio: 1` (square), `object-fit: contain`, `border-radius: 8px`, on white (product photos pre-cut on white bg).
- Text row: padding `0 16px 16px`, flex row, gap 16px, space-between:
  - Left column (gap 4px):
    - Meta line: `Brand · Category` (e.g. "Apple · Tech"), 14px Geist, `#737373`, dot separator `·` with 6px gaps.
    - Title: 14px Geist, `#141414` — same size as meta, distinguished only by color. No truncation styling issues (single line).
  - Right: **price in Geist Mono**, 14px, `#141414` (e.g. `$1,599`) — the mono font is the card's most distinctive detail.
- Corner arrow chip (top-right in image area on hover-capable layouts / next to text row): 36px circle, bg `#f5f5f5`, radius 48px, 20px arrow glyph (`↗`) in `#737373` — it is a separate external "purchase" link.
- **Hover behavior**: no scale, no shadow, no border change. The product image nudges down ~3px (`transform: translateY(3px)`, animated) — a subtle "settle" micro-interaction; text/links cross-fade gray→black over 0.4s. Cards also appear on scroll with a scale-from-0.95 + fade entrance.

## 5. Product detail page (xBloom Studio Coffee Machine)

Not a classic image-left/info-right PDP — it's a **stacked editorial layout**, all inside the same 1400px/16px container on `#f2f2f2`:

1. **Header band** (full content width): breadcrumb `xBloom · Coffee` (16px Geist `#737373`) above a row with H1 title left (40px, wght 520, -0.02em, `#141414`) and, right-aligned: price (H5, 24px Geist `#141414`), a thin divider, and a **"Purchase Link ↗" button**: bg `#141414`, white 14px Geist text, radius 28px, padding `8px 12px`, height 36px (outbound affiliate link).
2. **Hero image**: single large image, ~1153x640 (full content width), radius 8px, product centered on white — reads as a giant white card.
3. **"About" section**: H3 "About" 32px `#141414`, then description paragraphs constrained to **max-width 540px**, 16px/24px Geist `#737373`, 16px gaps — left-aligned narrow measure, lots of empty gray to the right.
4. **"More in [Category]"**: H5 24px + "See all" link (16px `#737373`), then the same product cards as the homepage (3-up).
5. **"Featured in"** lists section, then footer (link columns "Navigation / Info / Legal", 14px, dark on light; same gray page bg).
- Back button: circular white chip with ← arrow, top-left of the nav bar.
- Prices in related cards again in Geist Mono 14px.

## 6. General vibe & distinctive details

- **Ultra-minimal grayscale editorial catalog.** Zero accent color, zero borders, zero shadows; hierarchy is done entirely with white-on-gray surfaces, two text grays, and generous whitespace.
- Everything interactive is a **pill** (radius 28–48px): nav, filters, buttons, email form, icon chips. Content surfaces are soft rectangles (radius 8px images, 16px cards).
- **Mono price** (Geist Mono) against sans everything-else is the signature typographic move.
- Sentence case only — no uppercase labels, no letterspaced overlines.
- Small type: UI runs at 14px; even card titles are 14px, differentiated from meta only by color (#141414 vs #737373).
- Micro-interactions are restrained: 0.4s color cross-fades, 3px image nudge on card hover, scale-0.95 fade-in on scroll.
- Details: green status dot + "Updated every Sunday" badge; `·` middot separators for meta; ↗ north-east arrows in circular chips for external links; "Sort by: Featured" inline dropdown; "Show More" white pill button (bg #fff, radius 28px, padding 8px 12px, 14px text).

## Quick token sheet (copy-paste)

```css
:root {
  --bg: #f2f2f2;
  --surface: #ffffff;
  --surface-subtle: #f5f5f5;
  --border: #e2e2e2;
  --text: #141414;
  --text-secondary: #737373;
  --text-hover-dark: #2e2e2e;

  --font-sans: "Geist", "Geist Variable", sans-serif;   /* free — Vercel/Google Fonts */
  --font-mono: "Geist Mono", monospace;                  /* prices, numbers */

  --radius-card: 16px;
  --radius-img: 8px;
  --radius-pill: 28px;   /* buttons/forms; chips up to 48px */

  --h1: 400 40px/44px var(--font-sans);      /* wght 520, letter-spacing -0.02em */
  --h-section: 400 32px var(--font-sans);
  --h-sub: 400 24px var(--font-sans);
  --body: 400 16px/24px var(--font-sans);    /* letter-spacing 0.01em, color #737373 */
  --ui: 450 14px/20px var(--font-sans);      /* letter-spacing 0.01em */
  --price: 400 14px/20px var(--font-mono);   /* letter-spacing 0.01em */

  --container-max: 1400px;
  --page-pad: 16px;
  --grid-gap: 16px;      /* grid: repeat(auto-fill, minmax(340px, 1fr)) */
  --transition: color .4s cubic-bezier(.44, 0, .56, 1);
}
```
