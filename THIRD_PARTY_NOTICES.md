# Third-Party Notices

This repository contains separately licensed components for NIGHTFALL. The existing Midnight Games arcade code remains under this repository's own license unless a file states otherwise.

## Dwasm / PrBoom+ / PrBoomX

- Upstream: https://github.com/GMH-Code/Dwasm
- Pinned commit: `ddf0347a4fc115b11ffb1c5710768b7c47c46698`
- Local corresponding source: `third_party/dwasm/`
- License: `GPL-2.0-or-later`, verified from the vendored `COPYING` file and source headers.
- Full license text: `licenses/DWASM-LICENSE.txt`
- Runtime outputs built from this source: `games/nightfall/engine/index.js`, `games/nightfall/engine/index.wasm`, and `games/nightfall/engine/index.data`

Local build patch points are limited to the vendored Dwasm build configuration:

- Windows-safe SDL2_mixer format flag.
- Source-relative Emscripten shell and package paths for out-of-tree builds.
- Exported Emscripten `callMain` so the NIGHTFALL shell can pass a fixed safe startup argument list without using URL query text.

## Freedoom

- Upstream: https://github.com/freedoom/freedoom
- Release: `v0.13.0`
- Release asset: `freedoom-0.13.0.zip`
- Asset SHA-256: `3f9b264f3e3ce503b4fb7f6bdcb1f419d93c7b546f4df3e874dd878db9688f59`
- Included content file: `third_party/dwasm/wasm/fs/freedoom1.wad`
- Included WAD SHA-256: `7323bcc168c5a45ff10749b339960e98314740a734c30d4b9f3337001f9e703d`
- License: `BSD-3-Clause`
- Full license text and contributor credits: `licenses/FREEDOOM-LICENSE.txt`

## NIGHTFALL non-affiliation

NIGHTFALL is an independent open-source browser project. Game content is provided by the Freedoom project. Engine technology is provided by the credited open-source projects. This project is not affiliated with or endorsed by id Software, Bethesda Softworks, or ZeniMax Media.

No commercial game assets, shareware game assets, extracted retail data files, or proprietary WAD files are included.
