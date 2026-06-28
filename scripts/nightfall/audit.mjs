import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const runtimeRoot = resolve(repoRoot, "games/nightfall");

const textExtensions = new Set([".html", ".css", ".js", ".json", ".svg", ".txt"]);
const prohibitedRuntimeFiles = new Set([
  "doom.wad",
  "doom1.wad",
  "doomu.wad",
  "doom2.wad",
  "plutonia.wad",
  "tnt.wad"
]);

const errors = [];

for (const filePath of walk(runtimeRoot)) {
  const relativePath = normalize(relative(repoRoot, filePath));
  const basename = filePath.split(/[\\/]/).pop().toLowerCase();

  if (prohibitedRuntimeFiles.has(basename)) {
    errors.push(`Prohibited runtime file present: ${relativePath}`);
  }

  if (!textExtensions.has(extname(filePath).toLowerCase())) {
    continue;
  }

  const text = readFileSync(filePath, "utf8");
  if (/https?:\/\//i.test(text)) {
    errors.push(`External URL found in runtime text: ${relativePath}`);
  }
  if (/\b(?:doom|doom1|doomu|doom2|plutonia|tnt)\.wad\b/i.test(text)) {
    errors.push(`Prohibited asset filename found in runtime text: ${relativePath}`);
  }
  if (/curl\s+.*\|\s*sh/i.test(text)) {
    errors.push(`Unsafe installer pattern found in runtime text: ${relativePath}`);
  }
}

const manifest = JSON.parse(readFileSync(resolve(repoRoot, "games/nightfall/engine/build-manifest.json"), "utf8"));
for (const file of manifest.files) {
  const absolutePath = resolve(repoRoot, file.path);
  const bytes = statSync(absolutePath).size;
  const hash = createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
  if (bytes !== file.bytes) {
    errors.push(`${file.path} byte size mismatch in build manifest.`);
  }
  if (hash !== file.sha256) {
    errors.push(`${file.path} SHA-256 mismatch in build manifest.`);
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  process.exitCode = 1;
} else {
  console.log("NIGHTFALL runtime audit passed.");
}

function walk(root) {
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const filePath = join(root, entry.name);
    if (entry.isDirectory()) {
      result.push(...walk(filePath));
    } else {
      result.push(filePath);
    }
  }
  return result;
}

function normalize(path) {
  return path.replaceAll("\\", "/");
}
