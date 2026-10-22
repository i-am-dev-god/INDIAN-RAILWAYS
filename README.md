# INDIAN-RAILWAYS

A research-led, browser-based 3D Indian Railways game prototype. Work is delivered in small reviewable stages, with sourced railway facts separated from modelling assumptions.

## Current milestone: Secunderabad station + Vande Bharat 20102 study

- The browser scene has **Current** and **Planned** views for Secunderabad Junction, an eight-coach Vande Bharat 20102 study with a bounded drive prototype, more detailed terminal-building massing, and Station / Exterior / Cab camera choices. The project keeps the earlier generic open-line track/OHE scene as a separate prototype; that generic scene was not Secunderabad Junction.
- **Research-backed counts:** South Central Railway lists 10 passenger platforms. A 2024 report citing the Ministry gives 10 platforms and 11 tracks. The full station Working Rule/yard diagram was not available in an inspectable form, so the yard remains a **best-evidence schematic, not a surveyed/as-built diagram**.
- Ten parallel platform strips and eleven straight tracks are a visual assumption. Track spacing, platform widths/lengths, road-to-platform pairing and the construction phasing are not Secunderabad measurements. The extra service road reported between Platforms 7 and 8 is a lower-confidence secondary-source lead. Switches, signals, approach pointwork and corridor tie-ins are intentionally omitted.
- **Current** uses an illustrative active-work overlay—not a verified 22 October 2026 site survey. **Planned** shows conceptual concourse/roof and G+3 terminal-building massing, carrying the same schematic tracks forward as an explicit **“no verified yard change”** assumption. Building footprints, facade geometry, compass placement and exact as-built progress remain assumptions. Station redevelopment is kept separate from corridor multitracking projects.
- Railway reports support a G+3 terminal scope on both sides and a double-storey concourse; the geometry is schematic because no approved architectural drawing was inspected. The BG gauge and high-platform clearances use general Indian Railways Schedule of Dimensions values. The 11.4 m track spacing is derived from the standard platform-edge offset plus an assumed 8 m island width; neither width nor spacing is site data. See [`docs/research/scene-03-secunderabad-station.md`](docs/research/scene-03-secunderabad-station.md) for evidence, confidence levels and the full assumptions list.
- The train uses the route-reported eight-car 20102 formation (seven Chair Cars and one Executive Chair Car); the coach order, dimensions, pantograph positions, body details and cab interior are qualified assumptions. A first-pass, straight-line drive study now has separate throttle/brake levers, keyboard shortcuts, a 60 km/h prototype cap and a bounded track end. It is **not** a route, signalling, timetable or station-stop simulation. The cab remains generic, not a verified 20102 interior. See [`docs/research/scene-04-vande-bharat-20102.md`](docs/research/scene-04-vande-bharat-20102.md).
- The procedural Deccan sky/ground and evening-light study remains, along with instanced track hardware, clearer OHE portal/cantilever details, wire droppers, platform details and procedural urban-edge context. **Play Now** preserves the guest-first flow and opens the train exterior study.
- A local-only record stores a guest ID, session count, timestamps and approximate foreground playtime in this browser's local storage. Nothing is sent to a server; progress is not synced across browsers/devices and can be cleared with browser site data. If storage is unavailable, the scene works for that visit only.
- No account login or database-backed player data has been added yet. A future Settings flow may let a player explicitly sign in and save/merge guest progress. Supabase remains reserved for authentication and small player-stat records; railway assets/media do not belong there.

## Run locally

Requires Node.js 22 or later.

```bash
npm ci
npm run dev
```

To check the production build:

```bash
npm run build
npm run preview
```

## GitHub Pages

The repository is configured for GitHub Actions-based Pages deployment. The workflow builds this static project and deploys it to:

**https://i-am-dev-god.github.io/INDIAN-RAILWAYS/**

The Pages environment currently permits public deployments from `main` only. Pushes to the active Arena review branch run the build check; merging approved work into `main` publishes it to the same public Pages URL. The Arena live preview is available for reviewing branch changes before they go live.

## Planned stages

1. Ground and sky with local guest progress (complete)
2. Generic broad-gauge track, sleepers, ballast and OHE prototype (complete; not a station layout)
3. Research Secunderabad station and redevelopment evidence (complete to the level needed for a caveated schematic; Working Rule diagram still outstanding)
4. Build current/planned Secunderabad schematic views (first pass complete; no exact yard topology claimed)
5. Obtain an issue-dated official yard drawing; correct track/platform geometry and then add station-specific signalling/interlocking only from verified Working Rule documents
6. Model the research-recommended Vande Bharat 20102 and cab/exterior views (first pass complete; research gaps are documented)
7. Extend and validate drive physics, then add the Secunderabad–Nagpur route, route-specific speed/signalling rules and station-stop gameplay; the current control prototype is forward-only and bounded to the schematic station track
8. Add an optional Settings-based sign-in and explicit guest-progress save/merge flow, then small text/number-based player statistics protected by database access policies
9. Performance, accessibility, security and route expansion

## Performance approach

The environment uses a continuous terrain mesh, generated textures, instanced rock/building massing, sleepers, rails and platform details, tubular OHE wires, and a capped device-pixel ratio. Scene geometry is shared/instanced where practical. Later route sections should reuse geometry, compress textures/models, and reduce detail with distance. High-detail railway assets should be added only after their source, scope and licence are checked. Build output currently flags a large JavaScript chunk; further code-splitting/performance work remains.
