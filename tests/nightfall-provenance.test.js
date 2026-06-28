import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");

test("NIGHTFALL provenance lock and license files exist", () => {
  const lock = JSON.parse(readFileSync(resolve(repoRoot, "UPSTREAMS.lock.json"), "utf8"));

  assert.equal(lock.dwasm.commit, "ddf0347a4fc115b11ffb1c5710768b7c47c46698");
  assert.equal(lock.dwasm.license_spdx, "GPL-2.0-or-later");
  assert.equal(lock.dwasm.local_source_path, "third_party/dwasm/");
  assert.equal(lock.freedoom.release, "v0.13.0");
  assert.equal(lock.freedoom.license_spdx, "BSD-3-Clause");
  assert.ok(existsSync(resolve(repoRoot, "licenses/DWASM-LICENSE.txt")));
  assert.ok(existsSync(resolve(repoRoot, "licenses/FREEDOOM-LICENSE.txt")));
  assert.ok(existsSync(resolve(repoRoot, "THIRD_PARTY_NOTICES.md")));
});

test("NIGHTFALL recorded hashes match included build inputs and runtime files", () => {
  const lock = JSON.parse(readFileSync(resolve(repoRoot, "UPSTREAMS.lock.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(resolve(repoRoot, "games/nightfall/engine/build-manifest.json"), "utf8"));

  assert.equal(hash(lock.freedoom.included_file), lock.freedoom.included_file_sha256);
  assert.equal(hash("third_party/dwasm/wasm/fs/prboomx.wad"), "506fe7159eaf0a6cb479f866131ec7653638bb08928029cb8dabe1b3b1c9474d");

  for (const file of manifest.files) {
    assert.equal(hash(file.path), file.sha256, `${file.path} hash`);
    assert.equal(statSync(resolve(repoRoot, file.path)).size, file.bytes, `${file.path} byte size`);
  }
});

test("NIGHTFALL runtime does not include prohibited WAD files", () => {
  const prohibited = new Set(["doom.wad", "doom1.wad", "doomu.wad", "doom2.wad", "plutonia.wad", "tnt.wad"]);
  for (const filePath of walk(resolve(repoRoot, "games/nightfall"))) {
    const fileName = filePath.split(/[\\/]/).pop().toLowerCase();
    assert.equal(prohibited.has(fileName), false, `${fileName} must not be present`);
  }
});

function hash(relativePath) {
  return createHash("sha256").update(readFileSync(resolve(repoRoot, relativePath))).digest("hex");
}

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
