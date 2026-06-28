# NIGHTFALL Implementation Record

## Architecture

NIGHTFALL lives at `games/nightfall/` as a self-contained static route. The arcade switchers link to that route, but the main arcade pages do not import the NIGHTFALL loader or fetch its engine payload.

Runtime files:

- `games/nightfall/index.html` - accessible shell, launcher, controls, credits, and canvas.
- `games/nightfall/styles.css` - route-specific visual and touch-control styles.
- `games/nightfall/src/config.js` - fixed safe startup arguments and base-relative runtime path helpers.
- `games/nightfall/src/input-state.js` - pure input state machine used by automated tests.
- `games/nightfall/src/input-dispatch.js` - browser keyboard-event dispatch adapter.
- `games/nightfall/src/main.js` - Emscripten loader, progress handling, audio/fullscreen controls, and touch controls.
- `games/nightfall/engine/` - committed generated Emscripten runtime files.

The Dwasm/PrBoomX source and the Freedoom WAD used by the package are isolated under `third_party/dwasm/`. Shared arcade code does not contain copied GPL engine source.

## Upstream Sources

Dwasm is pinned in `UPSTREAMS.lock.json`:

- Repository: `https://github.com/GMH-Code/Dwasm`
- Commit: `ddf0347a4fc115b11ffb1c5710768b7c47c46698`
- Local source path: `third_party/dwasm/`
- Verified license: `GPL-2.0-or-later`

Freedoom is pinned in `UPSTREAMS.lock.json`:

- Repository: `https://github.com/freedoom/freedoom`
- Release: `v0.13.0`
- Asset: `freedoom-0.13.0.zip`
- Asset SHA-256: `3f9b264f3e3ce503b4fb7f6bdcb1f419d93c7b546f4df3e874dd878db9688f59`
- Included WAD: `third_party/dwasm/wasm/fs/freedoom1.wad`
- Included WAD SHA-256: `7323bcc168c5a45ff10749b339960e98314740a734c30d4b9f3337001f9e703d`
- Verified license: `BSD-3-Clause`

No proprietary WAD file is required or accepted by NIGHTFALL v1.

## Build Method

The committed runtime was built with:

- Emscripten SDK `4.0.8 (70404efec4458b60b953bc8f1529f2fa112cdfd1)`
- CMake `3.31.6`
- Ninja `1.12.1`
- `BUILD_GL=OFF`
- `BUILD_SERVER=OFF`
- No pthreads
- No GL4ES
- No Timidity or soundfont package

The Dwasm package embeds:

- `/defaults/prboomX.cfg`
- `/freedoom1.wad`
- `/prboomx.wad`

The Pages artifact ships only `index.js`, `index.wasm`, and `index.data`; it does not ship a duplicate standalone WAD under `games/nightfall/`.

`npm run build:nightfall` verifies the pinned WAD hashes and writes `games/nightfall/engine/build-manifest.json` with byte sizes and SHA-256 hashes for the generated runtime files.

`scripts/nightfall/rebuild-engine.ps1` rebuilds the committed runtime from `third_party/dwasm/` using the pinned local Emscripten, CMake, and Ninja toolchain cache, then copies the generated files and rewrites the manifest.

## Dwasm Patch Points

`third_party/dwasm/CMakeLists.txt` is intentionally modified in three narrow ways:

- Uses `-sSDL2_MIXER_FORMATS=wav,mid` for Emscripten 4 on Windows instead of a shell-quoted list.
- Uses `${CMAKE_CURRENT_SOURCE_DIR}/wasm/...` for Emscripten shell/package paths so out-of-tree builds work.
- Exports Emscripten `callMain` and uses `Module.noInitialRun`. The NIGHTFALL shell calls `callMain()` with a fixed argument list after runtime initialization.

URL query strings are ignored and are never passed into native/WASM startup parsing.

## Runtime

The Start Game button is the only path that injects `games/nightfall/engine/index.js`. Emscripten then loads `index.wasm` and `index.data` through `Module.locateFile`, using relative URLs so the route works beneath a GitHub Pages repository subpath.

The fixed startup arguments are:

```text
-iwad /freedoom1.wad -skill 3 -warp 1 1
```

The page sets `document.documentElement.dataset.engineReady = "true"` only from Dwasm's `hideConsole` callback after the runtime has initialized and the engine has switched to the canvas.

The Fullscreen button uses the native Fullscreen API where the browser supports it. iPhone/iPad Safari does not expose element fullscreen for this canvas route, so the shell falls back to an in-page fullscreen mode that fixes the runtime panel to the visual viewport, hides nonessential chrome, and keeps an Exit Fullscreen button visible.

## Touch Input

The touch controls use Pointer Events and a small state machine in `input-state.js`. In fullscreen mode, controls are anchored to the visual viewport edges so the center of the game view stays clear: movement sits in the left gutter, action buttons sit at the lower-right edge, and turning uses a low-profile right-side drag zone.

Implemented controls:

- Left movement pad: forward, backward, strafe left, strafe right.
- Right-side drag zone: turn left and turn right.
- Lower-right FIRE, USE, RUN lock, MAP, and MENU buttons.
- Simultaneous movement, turning, and firing through independent pointer IDs.

Cleanup releases all active inputs on `pointerup`, `pointercancel`, `lostpointercapture`, `blur`, `pagehide`, `visibilitychange`, and `orientationchange`.

The current bridge dispatches same-document keyboard events to the SDL/Emscripten layer. Browser smoke testing must verify this on target browsers. If synthetic keyboard events are unreliable on a target, the next compliant fix is a small GPL-side Dwasm input bridge exported from the engine source tree.

## License Boundaries

- Arcade shell files are original project code.
- Dwasm and generated runtime outputs are covered by the Dwasm/PrBoomX GPL lineage.
- Freedoom content is BSD-3-Clause and is included only through the packaged runtime data file and vendored build input.
- Full notices are in `THIRD_PARTY_NOTICES.md`.
- Full upstream license text is in `licenses/DWASM-LICENSE.txt` and `licenses/FREEDOOM-LICENSE.txt`.

## Testing Method

Automated coverage includes:

- Input state machine behavior.
- Safe startup config and base-relative engine path helpers.
- Provenance lock, license presence, and recorded hashes.
- Runtime asset audit for external URLs and prohibited WAD filenames.
- Pages artifact checks after `npm run build:pages`.

Browser smoke testing should run from a non-root route such as `/test-repository/` and verify no engine files are requested before Start Game, then verify JS/WASM/data loading, canvas readiness, credits, and navigation.

## Updating Upstream

To update Dwasm:

1. Choose and record an exact commit.
2. Replace `third_party/dwasm/` with the exact source for that commit.
3. Reapply only the documented patch points or document new ones.
4. Rebuild the runtime with the pinned toolchain.
5. Update `UPSTREAMS.lock.json`, license files if changed, the build manifest, tests, and this record.

To update Freedoom:

1. Use only an official Freedoom release asset.
2. Verify the archive SHA-256 before extraction.
3. Replace only the included `freedoom1.wad`.
4. Update `UPSTREAMS.lock.json`, `licenses/FREEDOOM-LICENSE.txt`, the build manifest, tests, and this record.

Proprietary WAD files must never be committed. They are not needed for NIGHTFALL and would break the redistribution model of this repository.

## Known Limitations

- Physical iPhone/iPad Safari validation is still required unless explicitly recorded in `docs/nightfall-manual-test.md`.
- Save persistence depends on Dwasm's existing browser storage behavior and must be verified in a browser smoke/manual run.
- Touch input currently relies on synthetic key events reaching SDL/Emscripten. If smoke testing proves otherwise, add a GPL-side Dwasm input bridge rather than using timing or click hacks.
