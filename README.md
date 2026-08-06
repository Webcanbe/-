# WDMA — Global Operations Command

Interface prototype for the World Disaster Management Authority coordination
dashboard. **This is a UI build only** — every figure, incident record and status
indicator is simulated placeholder data. Nothing is wired to a live feed,
telemetry source or partner system.

## Running it

No build step, no dependencies. Open `index.html` in a browser, or serve the
directory:

```sh
npx serve .
```

## What's on the page

| Section | Contents |
|---|---|
| **Partner Countries & Institutions** | The standing coordination framework — 40 partner organizations across 4 sectors (defense, finance, health, industry) plus 20 member states |
| **Global Operations Overview** | Scope filters, hero figure, KPI tiles, reported-event trend, severity mix + Tier 1/2 watchlist, active incident log, operations by region |
| **Deployable Capacity** | Standing readiness meters and command posture — global, not scoped by the filters |

The four filters (region, hazard class, severity tier, reporting window) sit in a
single row above everything they scope; the operations views all re-render against
the same slice. The capacity section sits outside that scope and says so.

## Files

```
index.html            page structure
assets/css/styles.css design tokens, layout, chart chrome
assets/js/data.js     partner directory + deterministically generated mock data
assets/js/app.js      rendering, hand-built SVG charts, filtering, interactions
```

Mock figures come from a seeded PRNG, so the numbers are stable across reloads
rather than reshuffling on every refresh.

## Design notes

- **Colour.** Categorical slots 1–3 (blue / orange / aqua) carry hazard-class
  identity; the reserved four-step status palette carries severity state and never
  doubles as a series colour. Both modes were run through the palette validator
  (lightness band, chroma floor, CVD separation, normal-vision floor, contrast).
  Dark mode is separately stepped for the dark surface, not an automatic flip.
- **Severity never reads by colour alone** — every severity indicator ships a glyph
  and a tier label alongside the hue.
- **Every chart has a table view.** The Table toggle on each figure swaps the plot
  for its WCAG-clean equivalent, so no value is reachable only through a tooltip.
- **Charts are hand-built SVG** with no charting library, and mark colours are
  written as CSS custom properties in inline styles so a theme switch repaints them
  without a re-render.
- The theme follows the OS setting by default; the toggle overrides it and persists
  to `localStorage`.

## Status

UI only. Next steps would be wiring the views to real feeds, replacing the mock
data layer, and adding auth/roles.
