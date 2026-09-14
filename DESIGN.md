# Design System: StudyFlow AI

## 1. Visual Theme & Atmosphere
A restrained, gallery-airy interface with confident asymmetric layouts and fluid spring-physics motion. The atmosphere is clinical yet warm — like a well-lit architecture studio, instilling absolute trust in the AI's mathematical precision. It avoids all generic "AI neon" tropes in favor of structural clarity and quiet confidence.

## 2. Color Palette & Roles
- **Canvas White** (`#F9FAFB`) — Primary background surface for light mode, reducing harsh glare.
- **Pure Surface** (`#FFFFFF`) — Card and container fill for light mode.
- **Obsidian Canvas** (`#09090B`) — Primary background surface for dark mode.
- **Charcoal Ink** (`#18181B`) — Primary text, Zinc-950 depth.
- **Muted Steel** (`#71717A`) — Secondary text, descriptions, metadata.
- **Whisper Border** (`rgba(226,232,240,0.5)`) — Card borders, 1px structural lines in light mode.
- **Shadow Border** (`rgba(255,255,255,0.05)`) — 1px structural lines in dark mode.
- **Precision Cobalt** (`#2563EB`) — Single accent for CTAs, active states, focus rings, and verification checkmarks.

## 3. Typography Rules
- **Display:** `Outfit` — Track-tight, controlled scale, weight-driven hierarchy. Used for the Hero headline and major section breaks.
- **Body:** `Plus Jakarta Sans` — Relaxed leading, 65ch max-width, neutral secondary color.
- **Mono:** `JetBrains Mono` — For metrics, analytics numbers, math equations, and code blocks.
- **Banned:** `Inter` (for premium contexts), generic system fonts. Serif fonts banned entirely.

## 4. Component Stylings
* **Buttons:** Flat, no outer glow. Tactile -1px translate on active state using spring physics. Precision Cobalt fill for primary, ghost/outline for secondary.
* **Cards:** Generously rounded corners (1.5rem to 2rem). Diffused whisper shadow in light mode, purely structural 1px border in dark mode. Used only when elevation serves hierarchy.
* **Inputs:** Label above, error below. Focus ring in Precision Cobalt. No floating labels.
* **Badges:** Small, pill-shaped (`rounded-full`), highly legible contrast (e.g., Cobalt text on light Cobalt background).
* **Loaders:** Skeletal shimmer matching exact layout dimensions. No circular spinners.

## 5. Layout Principles
Grid-first responsive architecture. Asymmetric splits for Hero sections.
Strict single-column collapse below 768px. Max-width containment (1200px / 75rem).
No flexbox percentage math. Generous internal padding (3rem to 4rem between sections).
No overlapping elements — every element occupies its own clear spatial zone.
The generic "3 equal cards horizontally" feature row is BANNED. We use a 2-column zig-zag or asymmetric bento grids where sizes deliberately vary.

## 6. Motion & Interaction
Spring physics for all interactive elements (Framer Motion: `stiffness: 100, damping: 20`).
Staggered cascade reveals for content loading.
Perpetual micro-loops on active dashboard components (e.g., a very slow, subtle Y-axis float on decorative icons).
Hardware-accelerated transforms (`opacity` and `transform`) only.

## 7. Anti-Patterns (Banned)
- No emojis anywhere.
- No `Inter` font for display.
- No generic serif fonts.
- No pure black (`#000000`).
- No neon/outer glow shadows.
- No oversaturated gradients on large headers.
- No custom mouse cursors.
- No overlapping elements.
- No 3-column equal grids.
- No generic names in placeholders.
- No fake round numbers (`99.99%`).
- No AI copywriting clichés ("Elevate", "Seamless", "Unleash").
- No filler UI text: "Scroll to explore", "Swipe down", scroll arrows.
- No centered Hero sections.
