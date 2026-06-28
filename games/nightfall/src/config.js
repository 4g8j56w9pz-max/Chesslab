export const NIGHTFALL_STORAGE_KEYS = Object.freeze({
  touchControlsVisible: "midnight.nightfall.touchControlsVisible",
  firstRunHelpDismissed: "midnight.nightfall.firstRunHelpDismissed"
});

export const NIGHTFALL_ENGINE_FILES = Object.freeze({
  script: "index.js",
  wasm: "index.wasm",
  data: "index.data"
});

export const SAFE_STARTUP_ARGUMENTS = Object.freeze([
  "-iwad",
  "/freedoom1.wad",
  "-skill",
  "3",
  "-warp",
  "1",
  "1"
]);

export function makeStartupArguments() {
  return [...SAFE_STARTUP_ARGUMENTS];
}

export function resolveEngineFile(fileName, baseUrl = import.meta.url) {
  if (!Object.values(NIGHTFALL_ENGINE_FILES).includes(fileName)) {
    throw new Error(`Unexpected NIGHTFALL engine file: ${fileName}`);
  }

  return new URL(`../engine/${fileName}`, baseUrl).href;
}

export function resolveRuntimeFile(fileName, baseUrl = import.meta.url) {
  return new URL(`../engine/${fileName}`, baseUrl).href;
}

export function getIgnoredQueryArguments() {
  return [];
}
