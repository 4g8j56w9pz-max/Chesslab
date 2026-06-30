import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = resolve(repoRoot, "_site");

if (!siteRoot.startsWith(repoRoot)) {
  throw new Error("Refusing to write Pages artifact outside the repository.");
}

rmSync(siteRoot, { recursive: true, force: true });
mkdirSync(resolve(siteRoot, "games"), { recursive: true });

for (const file of [
  "index.html",
  "chesslab.html",
  "chessgame.html",
  "app.js",
  "chesslab-app.js",
  "leaderboard-config.js",
  "manifest.json",
  "service-worker.js",
  "style.css",
  "styles.css",
  ".nojekyll"
]) {
  cpSync(resolve(repoRoot, file), resolve(siteRoot, file), { recursive: true });
}

for (const directory of [
  "icons",
  "pieces",
  "games/water-sort",
  "games/lock-pop",
  "games/soundboard",
  "games/nightfall"
]) {
  cpSync(resolve(repoRoot, directory), resolve(siteRoot, directory), { recursive: true });
}

console.log(`Pages artifact written to ${siteRoot}`);
