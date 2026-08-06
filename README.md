# WDMA — Global Operations Command

Console interface for the World Disaster Management Authority coordination
dashboard.

> **EXERCISE — SIMULATED DATA — NOT FOR OPERATIONAL USE.**
> This is a UI build. The World Disaster Management Authority is a fictional
> organization, every record and figure is generated from a fixed seed, and the
> classification markings are exercise props. Nothing here is connected to a live
> feed, telemetry source or partner system, and nothing reflects any real
> organization, event or system.

## Running it

No build step, no dependencies. Open `index.html` in a browser, or serve the
directory:

```sh
npx serve .
```

## What's on the console

| Block | Contents |
|---|---|
| **Classification banners** | Top and bottom markings, carrying the exercise caveat |
| **Command bar** | OPCON level, operator, terminal, live date-time group |
| **Secure link strip** | Link state, channel, cipher suite, peer key fingerprint, RTT, frame error, COMSEC keymat with rekey countdown, session timer, TEMPEST zone |
| **01 · Partner Countries & Institutions** | 40 partner organizations across four sectors with node IDs and access markings, plus 20 member states |
| **02 · Operational Picture** | Scope filters, hero readout and four KPI readouts with sparklines, event trend by hazard class, tasking by AO, precedence mix and operational phase, active tasking log |
| **03 · Force Readiness** | Committed-vs-available capacity meters and command posture — global, not scoped by the filters |

The four filters (AO, hazard class, precedence, reporting window) sit in one row
above everything they scope, and the operational views all re-render against the
same slice. The readiness block sits outside that scope and says so.

Session state is live: the date-time group, session timer, rekey countdown and
RTT all tick.

## Files

```
index.html            page structure
assets/css/styles.css tokens, layout, console chrome
assets/js/data.js     partner rosters + seeded mock data
assets/js/app.js      rendering, hand-built SVG charts, filtering, telemetry
```

## Design notes

- **Colour.** Categorical slots 1–3 (blue / orange / aqua) carry hazard-class
  identity; the reserved four-step status palette carries message precedence and
  never doubles as a series colour. Both modes were run through the palette
  validator against these exact surfaces — lightness band, chroma floor, CVD
  separation, normal-vision floor, contrast. Dark is the default surface; light is
  separately stepped, not an automatic flip.
- **Precedence never reads by colour alone** — every indicator ships a glyph and a
  P1–P4 code beside the hue.
- **Every chart has a table view.** The `TBL` toggle swaps the plot for its
  WCAG-clean equivalent, so no value is reachable only through a tooltip.
- **Charts are hand-built SVG** with no charting library. Mark colours are CSS
  custom properties in inline styles, so a theme change repaints them without a
  re-render. The ranked bar chart is drawn at its container's real pixel width so
  labels never scale down with the viewBox.
- Theme follows the OS setting; the toggle overrides it and persists to
  `localStorage`.

## Status

UI only. Next steps would be wiring the views to real feeds, replacing the mock
data layer, and adding auth and role-based access.
