param(
  [string]$BuildRoot = "build/nightfall-upstream",
  [string]$OutputRoot = "build/nightfall-dwasm"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
$BuildRootPath = Join-Path $RepoRoot $BuildRoot
$OutputRootPath = Join-Path $RepoRoot $OutputRoot
$DwasmSource = Join-Path $RepoRoot "third_party/dwasm"
$EmsdkEnv = Join-Path $BuildRootPath "emsdk/emsdk_env.ps1"
$CmakeExe = Join-Path $BuildRootPath "cmake-3.31.6-windows-x86_64/bin/cmake.exe"
$NinjaExe = Join-Path $BuildRootPath "ninja-1.12.1/ninja.exe"
$ToolchainFile = Join-Path $BuildRootPath "emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake"

$ExpectedFreedoomHash = "7323bcc168c5a45ff10749b339960e98314740a734c30d4b9f3337001f9e703d"
$ExpectedPrboomxHash = "506fe7159eaf0a6cb479f866131ec7653638bb08928029cb8dabe1b3b1c9474d"

function Require-Path($Path, $Label) {
  if (-not (Test-Path $Path)) {
    throw "$Label not found at $Path. Install the pinned NIGHTFALL toolchain cache first."
  }
}

function Assert-Sha256($Path, $Expected) {
  $Actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
  if ($Actual -ne $Expected) {
    throw "SHA-256 mismatch for $Path. Expected $Expected, got $Actual."
  }
}

Require-Path $EmsdkEnv "emsdk environment script"
Require-Path $CmakeExe "CMake"
Require-Path $NinjaExe "Ninja"
Require-Path $ToolchainFile "Emscripten CMake toolchain"
Require-Path $DwasmSource "Dwasm source"

Assert-Sha256 (Join-Path $DwasmSource "wasm/fs/freedoom1.wad") $ExpectedFreedoomHash
Assert-Sha256 (Join-Path $DwasmSource "wasm/fs/prboomx.wad") $ExpectedPrboomxHash

$env:EMSDK_QUIET = "1"
& $EmsdkEnv | Out-Null

$EmccVersion = (& emcc --version | Select-Object -First 1)
if ($EmccVersion -notmatch "4\.0\.8") {
  throw "Expected Emscripten 4.0.8, got: $EmccVersion"
}

& $CmakeExe `
  -S $DwasmSource `
  -B $OutputRootPath `
  -G Ninja `
  "-DCMAKE_TOOLCHAIN_FILE=$ToolchainFile" `
  "-DCMAKE_MAKE_PROGRAM=$NinjaExe" `
  "-DBUILD_GL=OFF" `
  "-DBUILD_SERVER=OFF"

& $CmakeExe --build $OutputRootPath --target index

$EngineOutput = Join-Path $RepoRoot "games/nightfall/engine"
New-Item -ItemType Directory -Force $EngineOutput | Out-Null
Copy-Item -LiteralPath (Join-Path $OutputRootPath "index.js") -Destination (Join-Path $EngineOutput "index.js") -Force
Copy-Item -LiteralPath (Join-Path $OutputRootPath "index.wasm") -Destination (Join-Path $EngineOutput "index.wasm") -Force
Copy-Item -LiteralPath (Join-Path $OutputRootPath "index.data") -Destination (Join-Path $EngineOutput "index.data") -Force

& node (Join-Path $RepoRoot "scripts/nightfall/build.mjs")
