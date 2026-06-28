import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");

const expected = {
  dwasmCommit: "ddf0347a4fc115b11ffb1c5710768b7c47c46698",
  freedoomRelease: "v0.13.0",
  freedoomWadSha256: "7323bcc168c5a45ff10749b339960e98314740a734c30d4b9f3337001f9e703d",
  prboomxWadSha256: "506fe7159eaf0a6cb479f866131ec7653638bb08928029cb8dabe1b3b1c9474d",
  nightfallFaceWadSha256: "b4a4b52673d6c205c9c36f1a3243aeee68672b13cfb6bb97be1c71d6e206a7b6",
  nightfallFaceSourceSha256: "dfa934986e79a6136a1136fe2ec1848fb73648c6009bf42aef2489a417ea7f28",
  nightfallFacePreviewSha256: "188cd394e9017ca33feb42a8ad25a648e74c7d0005067f4c8598d9f767596f8a"
};

const runtimeFiles = [
  "games/nightfall/engine/index.js",
  "games/nightfall/engine/index.wasm",
  "games/nightfall/engine/index.data",
  "games/nightfall/assets/nightfall-face.wad",
  "games/nightfall/assets/nightfall-face-source.png",
  "games/nightfall/assets/nightfall-face-preview.png"
];

const inputFiles = [
  {
    path: "third_party/dwasm/wasm/fs/freedoom1.wad",
    sha256: expected.freedoomWadSha256
  },
  {
    path: "third_party/dwasm/wasm/fs/prboomx.wad",
    sha256: expected.prboomxWadSha256
  },
  {
    path: "games/nightfall/assets/nightfall-face.wad",
    sha256: expected.nightfallFaceWadSha256
  },
  {
    path: "games/nightfall/assets/nightfall-face-source.png",
    sha256: expected.nightfallFaceSourceSha256
  },
  {
    path: "games/nightfall/assets/nightfall-face-preview.png",
    sha256: expected.nightfallFacePreviewSha256
  }
];

for (const inputFile of inputFiles) {
  const actualHash = sha256(inputFile.path);
  if (actualHash !== inputFile.sha256) {
    throw new Error(`${inputFile.path} hash mismatch: expected ${inputFile.sha256}, got ${actualHash}`);
  }
}

for (const runtimeFile of runtimeFiles) {
  statSync(resolve(repoRoot, runtimeFile));
}

const manifest = {
  build_timestamp: new Date().toISOString(),
  repository_commit: git(["rev-parse", "HEAD"]) ?? "unknown",
  dwasm_commit: expected.dwasmCommit,
  freedoom_release: expected.freedoomRelease,
  toolchain: {
    emscripten_version: "4.0.8 (70404efec4458b60b953bc8f1529f2fa112cdfd1)",
    cmake_version: "3.31.6",
    ninja_version: "1.12.1",
    build_environment: "Windows PowerShell with pinned local emsdk, CMake, and Ninja caches"
  },
  files: runtimeFiles.map(filePath => {
    const absolutePath = resolve(repoRoot, filePath);
    return {
      path: filePath,
      bytes: statSync(absolutePath).size,
      sha256: sha256(filePath)
    };
  })
};

writeFileSync(
  resolve(repoRoot, "games/nightfall/engine/build-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log("NIGHTFALL build manifest written.");

function sha256(filePath) {
  const absolutePath = resolve(repoRoot, filePath);
  return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
}

function git(args) {
  try {
    return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}
