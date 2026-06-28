import test from "node:test";
import assert from "node:assert/strict";
import {
  NIGHTFALL_ENGINE_FILES,
  NIGHTFALL_PATCH_FILES,
  SAFE_STARTUP_ARGUMENTS,
  getIgnoredQueryArguments,
  makeStartupArguments,
  resolveEngineFile,
  resolvePatchFile,
  resolveRuntimeFile
} from "../games/nightfall/src/config.js";

const configModuleUrl = new URL("../games/nightfall/src/config.js", import.meta.url).href;

test("NIGHTFALL startup arguments are fixed and safe", () => {
  assert.deepEqual(SAFE_STARTUP_ARGUMENTS, [
    "-iwad",
    "/freedoom1.wad",
    "-file",
    "/nightfall-face.wad",
    "-skill",
    "3",
    "-warp",
    "1",
    "1"
  ]);
  assert.deepEqual(getIgnoredQueryArguments("?unsafe=-file"), []);

  const first = makeStartupArguments();
  const second = makeStartupArguments();
  first.unshift("mutated");
  assert.notDeepEqual(first, second);
  assert.deepEqual(second, SAFE_STARTUP_ARGUMENTS);
});

test("NIGHTFALL engine paths resolve relative to the route", () => {
  const scriptUrl = resolveEngineFile(NIGHTFALL_ENGINE_FILES.script, configModuleUrl);
  const wasmUrl = resolveRuntimeFile(NIGHTFALL_ENGINE_FILES.wasm, configModuleUrl);
  const dataUrl = resolveRuntimeFile(NIGHTFALL_ENGINE_FILES.data, configModuleUrl);
  const facePatchUrl = resolvePatchFile(NIGHTFALL_PATCH_FILES.facePatch, configModuleUrl);

  assert.match(scriptUrl, /\/games\/nightfall\/engine\/index\.js$/);
  assert.match(wasmUrl, /\/games\/nightfall\/engine\/index\.wasm$/);
  assert.match(dataUrl, /\/games\/nightfall\/engine\/index\.data$/);
  assert.match(facePatchUrl, /\/games\/nightfall\/assets\/nightfall-face\.wad$/);
  assert.throws(() => resolveEngineFile("remote.wad", configModuleUrl), /Unexpected NIGHTFALL engine file/);
  assert.throws(() => resolvePatchFile("remote.wad", configModuleUrl), /Unexpected NIGHTFALL patch file/);
});
