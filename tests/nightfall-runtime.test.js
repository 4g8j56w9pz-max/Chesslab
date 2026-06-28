import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const textExtensions = new Set([".html", ".css", ".js", ".json", ".svg"]);

test("NIGHTFALL arcade integration links to the route without preloading engine files", () => {
  for (const file of [
    "index.html",
    "chesslab.html",
    "games/water-sort/index.html",
    "games/lock-pop/index.html"
  ]) {
    const text = readFileSync(resolve(repoRoot, file), "utf8");
    assert.match(text, /nightfall/i, `${file} links NIGHTFALL`);
    assert.doesNotMatch(text, /index\.(?:wasm|data)/, `${file} does not preload large runtime files`);
    assert.doesNotMatch(text, /nightfall-face\.wad/, `${file} does not preload the HUD patch`);
  }
});

test("NIGHTFALL runtime text has no external URLs or prohibited WAD names", () => {
  for (const filePath of walk(resolve(repoRoot, "games/nightfall"))) {
    if (!textExtensions.has(extname(filePath).toLowerCase())) {
      continue;
    }

    const text = readFileSync(filePath, "utf8");
    assert.doesNotMatch(text, /https?:\/\//i, `${relative(repoRoot, filePath)} has no external URL`);
    assert.doesNotMatch(text, /\b(?:doom|doom1|doomu|doom2|plutonia|tnt)\.wad\b/i, `${relative(repoRoot, filePath)} has no prohibited WAD filename`);
  }
});

test("NIGHTFALL service worker does not precache the large engine payload", () => {
  const text = readFileSync(resolve(repoRoot, "service-worker.js"), "utf8");
  assert.doesNotMatch(text, /games\/nightfall\/engine\/index\.(?:js|wasm|data)/);
});

test("NIGHTFALL Pages artifact contains runtime files when built", context => {
  const siteRoot = resolve(repoRoot, "_site");
  if (!existsSync(siteRoot)) {
    context.skip("_site has not been built in this test run");
    return;
  }

  for (const file of [
    "_site/games/nightfall/index.html",
    "_site/games/nightfall/src/main.js",
    "_site/games/nightfall/assets/nightfall-face.wad",
    "_site/games/nightfall/assets/nightfall-face-source.png",
    "_site/games/nightfall/assets/nightfall-face-preview.png",
    "_site/games/nightfall/engine/index.js",
    "_site/games/nightfall/engine/index.wasm",
    "_site/games/nightfall/engine/index.data",
    "_site/games/nightfall/engine/build-manifest.json"
  ]) {
    assert.ok(existsSync(resolve(repoRoot, file)), `${file} exists`);
    assert.ok(statSync(resolve(repoRoot, file)).size > 0, `${file} is nonempty`);
  }

  const nightfallHtml = readFileSync(resolve(repoRoot, "_site/games/nightfall/index.html"), "utf8");
  assert.match(nightfallHtml, /\.\/src\/main\.js/);
  assert.doesNotMatch(nightfallHtml, /index\.(?:wasm|data)/);
});

function walk(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(path));
    } else {
      files.push(path);
    }
  }
  return files;
}
