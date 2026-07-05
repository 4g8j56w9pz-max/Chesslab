import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function validateWav(bytes, inputName = "input WAV") {
  if (bytes.length < 44) {
    throw new Error(`${inputName} is too small to be a WAV file.`);
  }

  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error(`${inputName} is not a RIFF/WAVE file.`);
  }

  let offset = 12;
  let fmt = null;
  let hasData = false;

  while (offset + 8 <= bytes.length) {
    const chunkId = bytes.toString("ascii", offset, offset + 4);
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (chunkStart + chunkSize > bytes.length) {
      throw new Error(`${inputName} has an invalid ${chunkId} chunk size.`);
    }

    if (chunkId === "fmt ") {
      fmt = {
        audioFormat: bytes.readUInt16LE(chunkStart),
        channels: bytes.readUInt16LE(chunkStart + 2),
        sampleRate: bytes.readUInt32LE(chunkStart + 4),
        bitsPerSample: bytes.readUInt16LE(chunkStart + 14)
      };
    }

    if (chunkId === "data") {
      hasData = true;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (!fmt) {
    throw new Error(`${inputName} is missing a fmt chunk.`);
  }

  if (!hasData) {
    throw new Error(`${inputName} is missing a data chunk.`);
  }

  if (fmt.audioFormat !== 1) {
    throw new Error(`${inputName} must be PCM WAV, not compressed WAV format ${fmt.audioFormat}.`);
  }

  if (fmt.channels !== 1 || fmt.bitsPerSample !== 16) {
    throw new Error(`${inputName} must be mono 16-bit PCM for the current laser-tag audio path.`);
  }

  return fmt;
}

export function buildProgmemHeader(bytes, symbol, sourceName) {
  validateWav(bytes, sourceName);

  const lines = [
    "#pragma once",
    "",
    "#include <Arduino.h>",
    "",
    `// Generated from ${sourceName}.`,
    `const uint8_t ${symbol}[] PROGMEM = {`
  ];

  for (let index = 0; index < bytes.length; index += 12) {
    const chunk = bytes.subarray(index, Math.min(index + 12, bytes.length));
    const values = Array.from(chunk, byte => `0x${byte.toString(16).toUpperCase().padStart(2, "0")}`);
    const suffix = index + chunk.length < bytes.length ? "," : "";
    lines.push(`  ${values.join(", ")}${suffix}`);
  }

  lines.push("};");
  lines.push("");
  lines.push(`const size_t ${symbol}_SIZE = sizeof(${symbol});`);
  lines.push("");

  return `${lines.join("\n")}\n`;
}

export function wavToProgmemHeader({ inputPath, outputPath, symbol }) {
  const input = resolve(inputPath);
  const output = resolve(outputPath);
  const bytes = readFileSync(input);
  const header = buildProgmemHeader(bytes, symbol, basename(input));
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, header, "ascii");
  return { input, output, byteLength: bytes.length, symbol };
}

function printUsage() {
  console.error("Usage: node scripts/audio/wav-to-progmem.mjs <input.wav> <output.h> <SYMBOL>");
  console.error("Example: node scripts/audio/wav-to-progmem.mjs games/soundboard/audio/wav/laser-shot.wav laser-tag-audio/laser_shot_wav.h LASER_SHOT_WAV");
}

const isCli = fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "");

if (isCli) {
  const [inputPath, outputPath, symbol] = process.argv.slice(2);

  if (!inputPath || !outputPath || !symbol) {
    printUsage();
    process.exitCode = 1;
  } else {
    const result = wavToProgmemHeader({ inputPath, outputPath, symbol });
    console.log(`Wrote ${result.output}`);
    console.log(`${result.symbol}: ${result.byteLength} bytes`);
  }
}
