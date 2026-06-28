# NIGHTFALL Manual Test Checklist

Do not mark a device/browser as passed unless it was actually tested.

## Automated Baseline

- [ ] `npm run build:nightfall`
- [ ] `npm run audit:nightfall`
- [ ] `npm run test:nightfall`
- [ ] `npm test`
- [ ] `npm run check:syntax`
- [ ] `npm run build:pages`
- [ ] Browser smoke test from a non-root base path, such as `/test-repository/`

## Desktop

### Chrome

- [ ] Route loads directly at `/games/nightfall/`
- [ ] Home page does not request engine JS, WASM, or data before Start Game
- [ ] Start Game loads `index.js`, `index.wasm`, and `index.data`
- [ ] Canvas appears and renders nonuniform/changing pixels
- [ ] Keyboard movement works
- [ ] Keyboard turning works
- [ ] Mouse fire works
- [ ] Pointer lock or mouse turn behavior verified
- [ ] Fullscreen works where browser automation allows it
- [ ] Audio starts only after user interaction
- [ ] Enable Audio control appears if the audio context is suspended
- [ ] Save game survives reload
- [ ] Settings survive reload where Dwasm supports them
- [ ] Gamepad input works where Dwasm/browser supports it
- [ ] Credits dialog opens and closes
- [ ] Back to Arcade returns to the landing page
- [ ] No unexpected external network traffic after local assets load

### Firefox

- [ ] Repeat Chrome checklist

### Safari

- [ ] Repeat Chrome checklist

## iPhone/iPad Safari

- [ ] Direct route loads
- [ ] Landscape edge touch layout is usable without blocking the center view
- [ ] Portrait shows rotate recommendation without hard blocking play
- [ ] Left pad supports forward/back/strafe
- [ ] Right pad turns left/right
- [ ] Multi-touch move + turn + fire works simultaneously
- [ ] FIRE target is reachable
- [ ] USE button works
- [ ] RUN lock works and releases on interruption
- [ ] MAP button works
- [ ] MENU button works
- [ ] Touch visibility toggle persists
- [ ] Safe-area insets are respected
- [ ] Fullscreen button enters the in-page Safari fallback and Exit Fullscreen restores the shell
- [ ] Page does not scroll during active gameplay controls
- [ ] No stuck input after pointer cancellation, app switch, orientation change, or page hide
- [ ] Audio startup works from user gesture
- [ ] Home-screen mode works if the arcade PWA shell is installed

## GitHub Pages

- [ ] Repository subpath route works
- [ ] Direct NIGHTFALL URL works
- [ ] Refresh on direct NIGHTFALL URL works
- [ ] WASM is served with a usable MIME type
- [ ] `index.data` loads from a relative URL
- [ ] No missing assets
- [ ] No backend, account, API key, database, analytics, or remote runtime dependency
- [ ] No proprietary WAD or original commercial game asset appears in the Pages artifact
