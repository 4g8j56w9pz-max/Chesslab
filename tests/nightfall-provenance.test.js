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

test("NIGHTFALL custom status face patch is a local PWAD override", () => {
  const patchPath = "games/nightfall/assets/nightfall-face.wad";
  const sourcePath = "games/nightfall/assets/nightfall-face-source.png";
  const previewPath = "games/nightfall/assets/nightfall-face-preview.png";
  const bytes = readFileSync(resolve(repoRoot, patchPath));

  assert.equal(bytes.subarray(0, 4).toString("ascii"), "PWAD");
  assert.equal(bytes.readInt32LE(4), 62);
  assert.equal(hash(patchPath), "b4a4b52673d6c205c9c36f1a3243aeee68672b13cfb6bb97be1c71d6e206a7b6");
  assert.equal(hash(sourcePath), "dfa934986e79a6136a1136fe2ec1848fb73648c6009bf42aef2489a417ea7f28");
  assert.equal(hash(previewPath), "188cd394e9017ca33feb42a8ad25a648e74c7d0005067f4c8598d9f767596f8a");

  const directoryOffset = bytes.readInt32LE(8);
  const names = new Set();
  for (let index = 0; index < 62; index += 1) {
    const entryOffset = directoryOffset + index * 16;
    names.add(bytes.subarray(entryOffset + 8, entryOffset + 16).toString("ascii").replace(/\0+$/, ""));
  }

  for (const requiredName of ["STFST00", "STFTR02", "STFTL42", "STFOUCH4", "STFEVL4", "STFKILL4", "STFGOD0", "STFDEAD0"]) {
    assert.equal(names.has(requiredName), true, `${requiredName} exists`);
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
