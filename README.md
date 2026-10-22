# INDIAN-RAILWAYS

A research-led, browser-based 3D Indian Railways game prototype. The project is being built in small, reviewable stages so the railway, route, and scenery can be improved without turning the first version into an oversized simulator.

## Current milestone: Ground + sky

- Interactive Three.js environment study of the rocky Deccan landscape around Secunderabad.
- Procedural terrain, ground texture, granite outcrops, sparse scrub, atmospheric sky, and an afternoon-to-evening light slider.
- Orbit and zoom the camera with the mouse. No train, tracks, station building, login, or saved player data has been added yet.
- Railway asset files are not stored in Supabase. Supabase is reserved for authentication and small player-stat records in a later stage.

The scene is a regional terrain study, not a survey-accurate reconstruction of a particular station platform. Sources and assumptions are documented in [`docs/research/scene-01-ground-sky.md`](docs/research/scene-01-ground-sky.md).

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

The repository's GitHub Pages environment currently permits public deployments from `main` only. Pushes to the active Arena review branch run the build check; merging approved work into `main` publishes it to the same public Pages URL. The Arena live preview is available for reviewing branch changes before they go live.

## Planned stages

1. Ground and sky (current)
2. Research and add track, sleepers, signals, and overhead equipment
3. Build the selected Vande Bharat train and cab/exterior views
4. Add simulator-style power, braking, route, and station-stop gameplay
5. Add Supabase sign-in and small text/number-based player statistics, protected by database access policies
6. Performance, accessibility, security, and route expansion

## Performance approach

The first scene uses a small number of draw calls, instanced rocks, merged grass geometry, generated textures, and a capped device-pixel ratio. Later route sections should reuse geometry, compress textures/models, and reduce detail with distance. High-detail assets will be added only after their source and licence are checked.
