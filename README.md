# Midnight Games

A static browser arcade collection for GitHub Pages. The existing site includes Midnight Pizzeria Merge, FNAF ChessLab, Water Sort, **Lock Pop Arcade**, **Fahhh Soundboard**, and **NIGHTFALL**.

Lock Pop Arcade is an original one-button circular timing game built with semantic HTML, modern CSS, vanilla JavaScript modules, Canvas, Web Audio, localStorage, and a local user-provided MP3 miss effect. It has no runtime dependencies, backend, analytics, ads, CDNs, external images, or external fonts.

Fahhh Soundboard is a static quick-button audio toy and rough loop sequencer. It reuses the local `games/lock-pop/assets/miss-fahhh.mp3` sample for the Fahhh button and generates the other low-fi pad sounds with Web Audio. It has no runtime dependencies, backend, analytics, ads, CDNs, external images, or external fonts.

NIGHTFALL is a static browser-based classic first-person shooter route. It uses a pinned Dwasm WebAssembly engine build with Freedoom Phase 1 v0.13.0 game content. The engine, WASM module, and packaged data are lazy-loaded only after the player presses Start Game. It has no backend, account, API key, analytics, ads, CDN, remote WAD loading, multiplayer, or runtime network dependency beyond the local static assets.

NIGHTFALL also includes a small project-local PWAD, `games/nightfall/assets/nightfall-face.wad`, that replaces the status-bar portrait with a pixelated local artwork patch. The editable 24x32 source and preview live beside the WAD, and `scripts/nightfall/make-face-pwad.ps1` can rebuild the patch from a reference image using the Freedoom palette.

## Lock Pop Gameplay

The marker travels around the circular dial. Trigger the lock when the marker overlaps the target notch. A normal hit scores 1 point, a perfect center hit scores 2 points, and a miss ends the run immediately. Each hit moves the target to a fair new location, changes direction, raises speed smoothly, and tightens the target within tested limits.

## Controls

- **Space** or **Enter**: start, hit, resume, or restart
- **Click** or **tap** the dial: start, hit, resume, or restart
- **Escape** or **P**: pause or resume
- **R**: restart after game over
- **M**: mute or unmute

Sound and best score are saved locally in the browser.

## Features

- Circular timing gameplay with normal and perfect hits
- Tested angle wrapping across the 0/360 degree boundary
- Fair target spawning with minimum angular separation and reaction time
- Smooth capped speed curve and target-width floor
- Explicit `READY`, `COUNTDOWN`, `PLAYING`, `PAUSED`, and `GAME_OVER` states
- Canvas scaled for devicePixelRatio
- Automatic pause when the page is hidden, with explicit input required to resume
- Procedural Canvas visuals, procedural SVG favicon, procedural Web Audio effects, and a local MP3 miss cue
- Reduced-motion handling for shake, flashes, and decorative motion
- Keyboard, mouse, touch, and pointer support

## Local Development

Serve the repository root from a local HTTP server:

```bash
python -m http.server 8000
```

Open:

- Main site: `http://localhost:8000/`
- Lock Pop Arcade: `http://localhost:8000/games/lock-pop/`
- Fahhh Soundboard: `http://localhost:8000/games/soundboard/`
- NIGHTFALL: `http://localhost:8000/games/nightfall/`

The files also use relative paths so the site works from a repository subpath such as `https://username.github.io/repository-name/`.

This repository also includes a Node static server:

```bash
npm run serve
```

Build the local Pages artifact:

```bash
npm run build:pages
```

## Tests

Run the pure game-logic tests with Node's built-in test runner:

```bash
npm test
```

Run syntax checks:

```bash
npm run check:syntax
```

Run NIGHTFALL-specific verification:

```bash
npm run build:nightfall
npm run test:nightfall
npm run audit:nightfall
```

Rebuild the committed NIGHTFALL engine payload from the vendored source with the pinned local toolchain cache:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/nightfall/rebuild-engine.ps1
```

## GitHub Pages Deployment

This repository includes `.github/workflows/pages.yml`. On pushes to `main`, the workflow checks out the repository, sets up Node, runs tests, builds a minimal static Pages artifact, uploads it, and deploys with the official GitHub Pages artifact/deployment actions.

One-time repository setting:

**Settings -> Pages -> Source -> GitHub Actions**

After that, push to `main` or run the workflow manually from the Actions tab.

## File Structure

```text
/
  index.html                  Existing Merge game and site entry
  chesslab.html               Existing ChessLab game
  games/
    water-sort/               Existing Water Sort game
    lock-pop/                 Lock Pop Arcade
      index.html
      styles.css
      assets/favicon.svg
      src/
        main.js
        game-engine.js
        renderer.js
        audio.js
        storage.js
    soundboard/               Fahhh Soundboard
      index.html
      styles.css
      src/
        main.js
    nightfall/                 NIGHTFALL static FPS route
      index.html
      styles.css
      assets/
        nightfall-face.wad
        nightfall-face-source.png
        nightfall-face-preview.png
      src/
        config.js
        input-state.js
        input-dispatch.js
        main.js
      engine/
        index.js
        index.wasm
        index.data
        build-manifest.json
  scripts/nightfall/
    make-face-pwad.ps1         Local status-face PWAD builder
    rebuild-engine.ps1        Pinned local Dwasm rebuild script
  third_party/
    dwasm/                     Pinned Dwasm source and build input WADs
  licenses/
    DWASM-LICENSE.txt
    FREEDOOM-LICENSE.txt
  UPSTREAMS.lock.json
  THIRD_PARTY_NOTICES.md
  docs/nightfall-implementation.md
  docs/nightfall-manual-test.md
  tests/game-engine.test.js   Node tests for Lock Pop rules
  .github/workflows/pages.yml GitHub Pages deployment
  LICENSE                     MIT license
```

## Accessibility

Lock Pop uses real buttons for game controls, visible focus states, sufficient contrast, keyboard-complete controls, an accessible Canvas label, and a visually hidden live region for score, pause, and game-over announcements. Targets are shown with shape, outline, and hatch marks instead of color alone. Audio starts only after a user gesture.

Fahhh Soundboard uses real buttons for pads, loop cells, and transport controls, visible focus states, sufficient contrast, local status text, and a visually hidden live region for pad announcements. Audio starts only after a user gesture.

NIGHTFALL provides semantic shell controls, visible focus states, controls and credits dialogs, a content note for fantasy/sci-fi combat, and touch controls for mobile play. The engine canvas itself is not transformed into a screen-reader-native game.

## Browser Support

Lock Pop targets current versions of Chrome, Edge, Firefox, and Safari on desktop and mobile. It uses ES modules, Canvas 2D, requestAnimationFrame, localStorage, Pointer Events with a click fallback, and Web Audio with graceful silent behavior if audio is unavailable.

Fahhh Soundboard targets current versions of Chrome, Edge, Firefox, and Safari on desktop and mobile. It uses ES modules, localStorage, buttons, range inputs, and Web Audio with graceful silent behavior if audio is unavailable.

NIGHTFALL targets current desktop browsers with WebAssembly, Canvas, Web Audio, and keyboard input. Mobile support targets iPhone/iPad Safari in landscape with Pointer Events-based touch controls where supported; iOS uses an in-page fullscreen fallback because Safari does not provide element fullscreen for this canvas route. Physical-device results belong in `docs/nightfall-manual-test.md`.

## Original Work

Lock Pop Arcade's code, visuals, favicon, timing rules, and interface are original to this repository. Fahhh Soundboard's code, visuals, generated sounds, and interface are original to this repository. The miss cue and Fahhh button use the local user-provided `games/lock-pop/assets/miss-fahhh.mp3` asset; verify its license before public distribution if needed.

## License

MIT. See [LICENSE](./LICENSE).

NIGHTFALL includes separately licensed components. Dwasm/PrBoomX source and generated runtime outputs are under `GPL-2.0-or-later`; Freedoom content is `BSD-3-Clause`. The NIGHTFALL status-bar portrait patch is project-local artwork and is distributed separately from Freedoom and Dwasm. See `THIRD_PARTY_NOTICES.md`, `UPSTREAMS.lock.json`, `licenses/DWASM-LICENSE.txt`, and `licenses/FREEDOOM-LICENSE.txt`.

To update Dwasm, choose an exact upstream commit, vendor the corresponding source under `third_party/dwasm/`, preserve license notices, reapply only documented patch points, rebuild with the pinned toolchain, and update the lock file, manifest, tests, and docs.

To update Freedoom, use only an official release asset, verify SHA-256 before extraction, replace `freedoom1.wad`, and update the lock file, manifest, license/credits file, tests, and docs.

Do not commit proprietary WAD files or extracted commercial game assets. NIGHTFALL is designed to run with the included Freedoom Phase 1 content and does not need user-supplied proprietary data.
