# WDMA — Global Operations Command

Console interface for the World Disaster Management Authority coordination
dashboard.

> **EXERCISE — SIMULATED DATA — NOT FOR OPERATIONAL USE.**
> This is a UI build wrapped around a fictional outbreak drill. The World
> Disaster Management Authority is a fictional organization, every record and
> figure is generated from a fixed seed, and the classification markings are
> exercise props. Nothing here is connected to a live feed, telemetry source or
> partner system, and nothing reflects any real organization, event, pathogen or
> system. **The access gate does not check, store or transmit credentials** —
> any input is admitted.

## The drill

The console opens on an access gate. After the operator is admitted the watch
floor runs normally for a short while, then the exercise begins:

| T+ | What happens |
|---|---|
| 0s | Access granted — normal watch |
| 20s | Full-screen bulletin: biological event confirmed |
| 30s | Outbreak view takes over — the console goes dark and the dashboard gives way to the containment board |

From there a contagion walks out of the seed nation (United States) along a
travel graph across the twenty member states. Nations move through
SECURE → ELEVATED → CONTESTED → OVERRUN → DARK, incoming traffic reports what
each one is seeing, and full-screen bulletins fire as the global picture
degrades — civilian comms, the data backbone, national command nets, partner
nodes going silent.

**Directives** (`Q W E R T`, or click) spend command capacity, which regenerates
over time:

| Key | Directive | Effect |
|---|---|---|
| Q | Enforce cordon | Halves travel transfer for 18 s |
| W | Medical airlift | Pushes USAR and field hospitals into the three worst nations |
| E | Isolate networks | Restores comms and data integrity |
| R | Vaccine program | Advances the counter-agent — the only route home |
| T | Martial law | Heavy global suppression, lasting cost to civil integrity |

**Win** by running the counter-agent to 100% while holding global infection
under 35% — the console then walks back up through a restoration sequence and
returns to normal watch. **Lose** if global infection reaches 88%, and the
terminal plays out its own end: contact at 1,000 m, blast doors going one by
one, then the final data preservation stage.

Suppression alone will not finish it. While the counter-agent is incomplete an
uneliminated reservoir keeps seeding fresh clusters, and that pressure grows
with elapsed time, so every run reaches a verdict.

Balance was tuned against a headless harness: an idle terminal is lost around
T+83s, inattentive play around T+113s, and focused play wins around T+50s.

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
index.html                  page structure + access gate
assets/css/styles.css       tokens, layout, console chrome
assets/css/scenario.css     gate, full-screen bulletins, outbreak view
assets/js/data.js           partner rosters + seeded mock data
assets/js/app.js            rendering, hand-built SVG charts, filtering, telemetry
assets/js/scenario-data.js  travel graph, traffic templates, bulletin scripts
assets/js/scenario.js       gate, bulletin queue, contagion engine, endings
```

`window.WDMA_SIM` exposes the engine (`start`, `step`, `run`, `mean`) so the
scenario can be played headlessly while tuning.

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
