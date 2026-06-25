# Midnight Games

A static browser arcade collection for GitHub Pages. The existing site includes Midnight Pizzeria Merge, FNAF ChessLab, Water Sort, and the fourth game: **Lock Pop Arcade**.

Lock Pop Arcade is an original one-button circular timing game built with semantic HTML, modern CSS, vanilla JavaScript modules, Canvas, Web Audio, and localStorage. It has no runtime dependencies, backend, analytics, ads, CDNs, external images, external fonts, or bundled audio files.

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
- Procedural Canvas visuals, procedural SVG favicon, and procedural Web Audio effects
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

The files also use relative paths so the site works from a repository subpath such as `https://username.github.io/repository-name/`.

## Tests

Run the pure game-logic tests with Node's built-in test runner:

```bash
npm test
```

Run syntax checks:

```bash
npm run check:syntax
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
  tests/game-engine.test.js   Node tests for Lock Pop rules
  .github/workflows/pages.yml GitHub Pages deployment
  LICENSE                     MIT license
```

## Accessibility

Lock Pop uses real buttons for game controls, visible focus states, sufficient contrast, keyboard-complete controls, an accessible Canvas label, and a visually hidden live region for score, pause, and game-over announcements. Targets are shown with shape, outline, and hatch marks instead of color alone. Audio starts only after a user gesture.

## Browser Support

Lock Pop targets current versions of Chrome, Edge, Firefox, and Safari on desktop and mobile. It uses ES modules, Canvas 2D, requestAnimationFrame, localStorage, Pointer Events with a click fallback, and Web Audio with graceful silent behavior if audio is unavailable.

## Original Work

Lock Pop Arcade's code, visuals, procedural sounds, favicon, timing rules, and interface are original to this repository. It does not copy any existing game's code, artwork, audio, text, branding, level designs, or distinctive interface.

## License

MIT. See [LICENSE](./LICENSE).
