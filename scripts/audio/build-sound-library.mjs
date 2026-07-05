import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUDIO_BITS_PER_SAMPLE,
  AUDIO_CHANNELS,
  AUDIO_SAMPLE_RATE,
  SOUND_LIBRARY,
  soundFileStem,
  soundHeaderPath,
  soundSymbol,
  soundWavPath
} from "../../games/soundboard/src/sound-library.js";
import { buildProgmemHeader, validateWav } from "./wav-to-progmem.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const wavRoot = resolve(repoRoot, "games/soundboard/audio/wav");
const headerRoot = resolve(repoRoot, "games/soundboard/audio/headers");
const manifestPath = resolve(repoRoot, "games/soundboard/audio/manifest.json");
const fahhhHeaderPath = resolve(repoRoot, "laser-tag-audio/fahhh_wav.h");

const TWO_PI = Math.PI * 2;

function main() {
  rmSync(resolve(repoRoot, "games/soundboard/audio"), { recursive: true, force: true });
  mkdirSync(wavRoot, { recursive: true });
  mkdirSync(headerRoot, { recursive: true });

  const files = [];

  for (const sound of SOUND_LIBRARY) {
    const stem = soundFileStem(sound.id);
    const symbol = soundSymbol(sound.id);
    const wavPath = resolve(wavRoot, `${stem}.wav`);
    const headerPath = resolve(headerRoot, `${stem}_wav.h`);
    const wavBytes = sound.id === "fahhh" ? readWavFromHeader(fahhhHeaderPath) : renderGeneratedWav(sound.id);

    validateWav(wavBytes, `${stem}.wav`);
    writeFileSync(wavPath, wavBytes);
    writeFileSync(headerPath, buildProgmemHeader(wavBytes, symbol, `${stem}.wav`), "ascii");

    files.push({
      id: sound.id,
      label: sound.label,
      category: sound.category,
      tag: sound.tag,
      wav: soundWavPath(sound.id),
      header: soundHeaderPath(sound.id),
      symbol,
      bytes: wavBytes.length
    });
  }

  writeFileSync(manifestPath, `${JSON.stringify({
    format: "mono 16-bit PCM WAV",
    sampleRate: AUDIO_SAMPLE_RATE,
    channels: AUDIO_CHANNELS,
    bitsPerSample: AUDIO_BITS_PER_SAMPLE,
    files
  }, null, 2)}\n`, "utf8");

  console.log(`Wrote ${files.length} WAV files to ${wavRoot}`);
  console.log(`Wrote ${files.length} Arduino headers to ${headerRoot}`);
  console.log(`Wrote ${manifestPath}`);
}

function readWavFromHeader(headerPath) {
  const header = readFileSync(headerPath, "utf8");
  const matches = header.match(/0x[0-9A-Fa-f]{2}/g);

  if (!matches?.length) {
    throw new Error(`No byte array found in ${headerPath}.`);
  }

  return Buffer.from(matches.map(value => Number.parseInt(value.slice(2), 16)));
}

function renderGeneratedWav(soundId) {
  const samples = createTrack(1.8);
  const rng = createRng(hashString(soundId));

  switch (soundId) {
    case "laser-shot":
      laserShot(samples, 0, rng);
      break;
    case "laser-burst":
      [0, 0.12, 0.24].forEach(offset => laserShot(samples, offset, rng));
      break;
    case "charge-shot":
      tone(samples, { start: 0, duration: 0.46, frequency: 180, endFrequency: 1320, gain: 0.16, type: "triangle" });
      tone(samples, { start: 0.39, duration: 0.31, frequency: 1080, endFrequency: 110, gain: 0.34, type: "square" });
      noise(samples, { start: 0.39, duration: 0.14, gain: 0.18, filterType: "bandpass", frequency: 2100, rng });
      break;
    case "heavy-laser":
      heavyLaser(samples, 0, rng);
      break;
    case "long-laser":
      longLaser(samples, 0, rng);
      break;
    case "pulse-stream":
      [0, 0.14, 0.28, 0.42, 0.56].forEach(offset => laserShot(samples, offset, rng));
      tone(samples, { start: 0, duration: 0.72, frequency: 170, endFrequency: 95, gain: 0.11, type: "sine" });
      break;
    case "overcharge-shot":
      tone(samples, { start: 0, duration: 0.52, frequency: 130, endFrequency: 1550, gain: 0.18, type: "triangle" });
      noise(samples, { start: 0.1, duration: 0.36, gain: 0.08, filterType: "bandpass", frequency: 2600, rng });
      heavyLaser(samples, 0.48, rng);
      break;
    case "scatter-burst":
      [0, 0.055, 0.11, 0.19, 0.26].forEach((offset, index) => {
        tone(samples, { start: offset, duration: 0.2, frequency: 900 + index * 170, endFrequency: 120 + index * 25, gain: 0.2, type: index % 2 === 0 ? "square" : "sawtooth" });
        noise(samples, { start: offset, duration: 0.06, gain: 0.09, filterType: "highpass", frequency: 3800, rng });
      });
      break;
    case "beam-sweep":
      tone(samples, { start: 0, duration: 0.48, frequency: 320, endFrequency: 1700, gain: 0.2, type: "sawtooth" });
      tone(samples, { start: 0.34, duration: 0.34, frequency: 1700, endFrequency: 240, gain: 0.22, type: "square" });
      noise(samples, { start: 0.22, duration: 0.4, gain: 0.08, filterType: "bandpass", frequency: 2900, rng });
      break;
    case "ricochet":
      [1600, 1180, 860].forEach((frequency, index) => {
        tone(samples, { start: index * 0.075, duration: 0.09, frequency, endFrequency: frequency * 0.62, gain: 0.13 - index * 0.025, type: "sine" });
      });
      break;
    case "target-lock":
      [480, 620, 780].forEach((frequency, index) => {
        tone(samples, { start: index * 0.105, duration: 0.055, frequency, gain: 0.14, type: "triangle" });
      });
      break;
    case "tag-confirm":
      tone(samples, { start: 0, duration: 0.08, frequency: 523.25, gain: 0.13, type: "sine" });
      tone(samples, { start: 0.075, duration: 0.08, frequency: 659.25, gain: 0.13, type: "sine" });
      tone(samples, { start: 0.15, duration: 0.12, frequency: 783.99, gain: 0.15, type: "sine" });
      noise(samples, { start: 0.15, duration: 0.05, gain: 0.05, filterType: "highpass", frequency: 5000, rng });
      break;
    case "shield-ping":
      tone(samples, { start: 0, duration: 0.25, frequency: 740, gain: 0.11, type: "sine" });
      tone(samples, { start: 0, duration: 0.18, frequency: 1480, gain: 0.06, type: "sine" });
      break;
    case "shield-crack":
      noise(samples, { start: 0, duration: 0.18, gain: 0.18, filterType: "bandpass", frequency: 1700, rng });
      tone(samples, { start: 0.02, duration: 0.2, frequency: 96, endFrequency: 58, gain: 0.22, type: "sawtooth" });
      break;
    case "shield-recharge":
      [260, 330, 440, 660, 880].forEach((frequency, index) => {
        tone(samples, { start: index * 0.055, duration: 0.1, frequency, gain: 0.09 + index * 0.01, type: "triangle" });
      });
      break;
    case "base-alarm":
      [260, 180, 260, 180].forEach((frequency, index) => {
        tone(samples, { start: index * 0.16, duration: 0.12, frequency, gain: 0.16, type: "square" });
      });
      break;
    case "round-start":
      tone(samples, { start: 0, duration: 0.18, frequency: 220, endFrequency: 330, gain: 0.13, type: "sawtooth" });
      tone(samples, { start: 0.16, duration: 0.18, frequency: 330, endFrequency: 494, gain: 0.15, type: "sawtooth" });
      tone(samples, { start: 0.32, duration: 0.22, frequency: 494, gain: 0.18, type: "sawtooth" });
      break;
    case "round-end":
      tone(samples, { start: 0, duration: 0.18, frequency: 660, endFrequency: 440, gain: 0.14, type: "triangle" });
      tone(samples, { start: 0.16, duration: 0.2, frequency: 440, endFrequency: 294, gain: 0.13, type: "triangle" });
      tone(samples, { start: 0.34, duration: 0.28, frequency: 247, gain: 0.14, type: "sine" });
      break;
    case "scanner-ping":
      tone(samples, { start: 0, duration: 0.42, frequency: 520, endFrequency: 1200, gain: 0.08, type: "sine" });
      noise(samples, { start: 0, duration: 0.34, gain: 0.05, filterType: "bandpass", frequency: 2400, rng });
      break;
    case "stealth-blip":
      tone(samples, { start: 0, duration: 0.05, frequency: 360, gain: 0.07, type: "sine" });
      tone(samples, { start: 0.065, duration: 0.05, frequency: 540, gain: 0.06, type: "sine" });
      break;
    case "trigger-click":
      triggerClick(samples, 0, rng);
      break;
    case "trigger-snap":
      triggerClick(samples, 0, rng);
      triggerClick(samples, 0.038, rng);
      tone(samples, { start: 0.01, duration: 0.05, frequency: 180, endFrequency: 90, gain: 0.12, type: "triangle" });
      break;
    case "trigger-press":
      noise(samples, { start: 0, duration: 0.055, gain: 0.14, filterType: "bandpass", frequency: 1200, rng });
      tone(samples, { start: 0.006, duration: 0.08, frequency: 120, endFrequency: 70, gain: 0.16, type: "sine" });
      break;
    case "trigger-reset":
      triggerClick(samples, 0, rng);
      tone(samples, { start: 0.06, duration: 0.11, frequency: 420, endFrequency: 220, gain: 0.12, type: "triangle" });
      triggerClick(samples, 0.16, rng);
      break;
    case "trigger-double-tap":
      triggerClick(samples, 0, rng);
      triggerClick(samples, 0.12, rng);
      break;
    case "trigger-ready":
      triggerClick(samples, 0, rng);
      tone(samples, { start: 0.055, duration: 0.08, frequency: 620, gain: 0.08, type: "sine" });
      tone(samples, { start: 0.12, duration: 0.12, frequency: 930, gain: 0.1, type: "sine" });
      break;
    case "air-horn":
      [233, 277].forEach(frequency => {
        tone(samples, { start: 0, duration: 0.48, frequency, endFrequency: frequency * 0.9, gain: 0.15, type: "sawtooth" });
      });
      noise(samples, { start: 0, duration: 0.45, gain: 0.04, filterType: "bandpass", frequency: 950, rng });
      break;
    case "dj-scratch":
      [700, 240, 880, 300].forEach((frequency, index) => {
        tone(samples, { start: index * 0.055, duration: 0.075, frequency, endFrequency: index % 2 === 0 ? frequency * 0.45 : frequency * 2.2, gain: 0.11, type: "sawtooth" });
      });
      noise(samples, { start: 0, duration: 0.28, gain: 0.08, filterType: "bandpass", frequency: 1700, rng });
      break;
    case "bass-drop":
      noise(samples, { start: 0, duration: 0.22, gain: 0.08, filterType: "highpass", frequency: 2400, rng });
      tone(samples, { start: 0.08, duration: 0.68, frequency: 130, endFrequency: 36, gain: 0.26, type: "sine" });
      break;
    case "record-stop":
      tone(samples, { start: 0, duration: 0.64, frequency: 720, endFrequency: 45, gain: 0.16, type: "sawtooth" });
      noise(samples, { start: 0, duration: 0.18, gain: 0.04, filterType: "highpass", frequency: 3200, rng });
      break;
    case "crowd-hey":
      [180, 230, 290].forEach(frequency => {
        tone(samples, { start: 0, duration: 0.26, frequency, endFrequency: frequency * 0.92, gain: 0.08, type: "sawtooth" });
      });
      noise(samples, { start: 0, duration: 0.24, gain: 0.09, filterType: "bandpass", frequency: 1150, rng });
      break;
    case "hype-hit":
      tone(samples, { start: 0, duration: 0.26, frequency: 160, endFrequency: 84, gain: 0.23, type: "sine" });
      tone(samples, { start: 0, duration: 0.12, frequency: 440, gain: 0.11, type: "square" });
      noise(samples, { start: 0, duration: 0.18, gain: 0.14, filterType: "lowpass", frequency: 1300, rng });
      break;
    case "drama-hit":
      tone(samples, { start: 0, duration: 0.48, frequency: 92, endFrequency: 45, gain: 0.3, type: "sine" });
      noise(samples, { start: 0, duration: 0.34, gain: 0.18, filterType: "lowpass", frequency: 750, rng });
      break;
    case "vinyl-beep":
      tone(samples, { start: 0, duration: 0.07, frequency: 880, gain: 0.1, type: "sine" });
      tone(samples, { start: 0.09, duration: 0.08, frequency: 1174.66, gain: 0.1, type: "sine" });
      break;
    case "viral-boom":
      viralBoom(samples, 0, rng);
      break;
    case "sad-trombone":
      [330, 294, 262, 196].forEach((frequency, index) => {
        tone(samples, { start: index * 0.18, duration: 0.22, frequency, endFrequency: frequency * 0.72, gain: 0.14, type: "sawtooth" });
      });
      break;
    case "bruh-bass":
      tone(samples, { start: 0, duration: 0.5, frequency: 118, endFrequency: 72, gain: 0.28, type: "sawtooth" });
      tone(samples, { start: 0.04, duration: 0.44, frequency: 178, endFrequency: 92, gain: 0.16, type: "square" });
      noise(samples, { start: 0.02, duration: 0.14, gain: 0.05, filterType: "bandpass", frequency: 700, rng });
      break;
    case "censor-bleep":
      tone(samples, { start: 0, duration: 0.44, frequency: 1000, gain: 0.18, type: "sine" });
      tone(samples, { start: 0, duration: 0.44, frequency: 2000, gain: 0.06, type: "sine" });
      break;
    case "wow-rise":
      tone(samples, { start: 0, duration: 0.44, frequency: 240, endFrequency: 920, gain: 0.13, type: "triangle" });
      tone(samples, { start: 0.16, duration: 0.32, frequency: 480, endFrequency: 1320, gain: 0.1, type: "sine" });
      break;
    case "suspense-sting":
      tone(samples, { start: 0, duration: 0.72, frequency: 72, endFrequency: 54, gain: 0.24, type: "sine" });
      tone(samples, { start: 0.38, duration: 0.16, frequency: 920, endFrequency: 1280, gain: 0.1, type: "triangle" });
      noise(samples, { start: 0.1, duration: 0.45, gain: 0.09, filterType: "lowpass", frequency: 900, rng });
      break;
    case "laugh-blip":
      [340, 430, 380, 510, 460].forEach((frequency, index) => {
        const start = index * 0.075;
        tone(samples, { start, duration: 0.07, frequency, endFrequency: frequency * 1.28, gain: 0.09, type: "triangle" });
        noise(samples, { start, duration: 0.035, gain: 0.035, filterType: "bandpass", frequency: 1300, rng });
      });
      break;
    case "comedy-boing":
      tone(samples, { start: 0, duration: 0.18, frequency: 170, endFrequency: 740, gain: 0.16, type: "sawtooth" });
      tone(samples, { start: 0.16, duration: 0.42, frequency: 740, endFrequency: 120, gain: 0.15, type: "triangle" });
      break;
    case "fail-buzzer":
      tone(samples, { start: 0, duration: 0.18, frequency: 180, gain: 0.17, type: "square" });
      tone(samples, { start: 0.2, duration: 0.24, frequency: 140, gain: 0.17, type: "square" });
      noise(samples, { start: 0, duration: 0.08, gain: 0.05, filterType: "bandpass", frequency: 500, rng });
      break;
    case "chat-alert":
      [880, 1174.66, 1567.98].forEach((frequency, index) => {
        tone(samples, { start: index * 0.07, duration: 0.07, frequency, gain: 0.1, type: "sine" });
      });
      break;
    case "rimshot":
      noise(samples, { start: 0, duration: 0.035, gain: 0.18, filterType: "highpass", frequency: 3200, rng });
      tone(samples, { start: 0, duration: 0.08, frequency: 190, endFrequency: 85, gain: 0.14, type: "sine" });
      noise(samples, { start: 0.09, duration: 0.05, gain: 0.16, filterType: "bandpass", frequency: 2100, rng });
      tone(samples, { start: 0.14, duration: 0.08, frequency: 840, gain: 0.08, type: "triangle" });
      break;
    case "surprise-pop":
      noise(samples, { start: 0, duration: 0.06, gain: 0.16, filterType: "bandpass", frequency: 1800, rng });
      tone(samples, { start: 0.02, duration: 0.16, frequency: 420, endFrequency: 1040, gain: 0.12, type: "triangle" });
      break;
    case "coin-pickup":
      tone(samples, { start: 0, duration: 0.08, frequency: 988, gain: 0.1, type: "square" });
      tone(samples, { start: 0.075, duration: 0.12, frequency: 1318.51, gain: 0.12, type: "square" });
      break;
    case "power-up":
      [220, 277, 330, 440, 554, 660].forEach((frequency, index) => {
        tone(samples, { start: index * 0.052, duration: 0.09, frequency, gain: 0.09, type: "triangle" });
      });
      break;
    case "one-up":
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        tone(samples, { start: index * 0.08, duration: 0.1, frequency, gain: 0.1, type: "square" });
      });
      break;
    case "level-clear":
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        tone(samples, { start: index * 0.08, duration: 0.13, frequency, gain: 0.11, type: "triangle" });
      });
      break;
    case "glitch-burst":
      for (let index = 0; index < 8; index += 1) {
        const frequency = 180 + rng() * 1800;
        tone(samples, { start: index * 0.025, duration: 0.045, frequency, endFrequency: frequency * (0.6 + rng() * 1.5), gain: 0.08, type: index % 2 === 0 ? "square" : "sawtooth" });
      }
      break;
    case "jump":
      tone(samples, { start: 0, duration: 0.18, frequency: 240, endFrequency: 720, gain: 0.12, type: "square" });
      break;
    case "bonus-tally":
      for (let index = 0; index < 6; index += 1) {
        tone(samples, { start: index * 0.055, duration: 0.045, frequency: 780 + index * 70, gain: 0.08, type: "triangle" });
      }
      break;
    case "game-over":
      [392, 349.23, 293.66, 196].forEach((frequency, index) => {
        tone(samples, { start: index * 0.13, duration: 0.16, frequency, gain: 0.12, type: "triangle" });
      });
      break;
    case "button-blip":
      tone(samples, { start: 0, duration: 0.055, frequency: 660, gain: 0.08, type: "sine" });
      break;
    case "score-tick":
      tone(samples, { start: 0, duration: 0.04, frequency: 1046.5, gain: 0.07, type: "triangle" });
      break;
    case "success-chime":
      tone(samples, { start: 0, duration: 0.12, frequency: 523.25, gain: 0.09, type: "sine" });
      tone(samples, { start: 0.1, duration: 0.12, frequency: 659.25, gain: 0.09, type: "sine" });
      tone(samples, { start: 0.2, duration: 0.16, frequency: 783.99, gain: 0.1, type: "sine" });
      break;
    case "error-buzzer":
      tone(samples, { start: 0, duration: 0.16, frequency: 180, gain: 0.14, type: "square" });
      tone(samples, { start: 0.17, duration: 0.16, frequency: 150, gain: 0.13, type: "square" });
      break;
    case "countdown-beep":
      tone(samples, { start: 0, duration: 0.11, frequency: 880, gain: 0.11, type: "sine" });
      break;
    case "warning-siren":
      [520, 320, 520, 320, 520].forEach((frequency, index) => {
        tone(samples, { start: index * 0.12, duration: 0.11, frequency, gain: 0.11, type: "sawtooth" });
      });
      break;
    case "menu-open":
      tone(samples, { start: 0, duration: 0.18, frequency: 360, endFrequency: 720, gain: 0.08, type: "triangle" });
      tone(samples, { start: 0.12, duration: 0.07, frequency: 960, gain: 0.06, type: "sine" });
      break;
    case "power-down":
      tone(samples, { start: 0, duration: 0.48, frequency: 420, endFrequency: 80, gain: 0.13, type: "triangle" });
      break;
    default:
      throw new Error(`No renderer for ${soundId}.`);
  }

  return encodeWav(trimSilence(samples));
}

function laserShot(samples, start, rng) {
  tone(samples, { start, duration: 0.29, frequency: 1320, endFrequency: 150, gain: 0.34, type: "square" });
  tone(samples, { start: start + 0.015, duration: 0.25, frequency: 760, endFrequency: 95, gain: 0.16, type: "sawtooth" });
  noise(samples, { start, duration: 0.1, gain: 0.13, filterType: "highpass", frequency: 4000, rng });
}

function heavyLaser(samples, start, rng) {
  tone(samples, { start, duration: 0.46, frequency: 980, endFrequency: 82, gain: 0.36, type: "square" });
  tone(samples, { start: start + 0.02, duration: 0.42, frequency: 180, endFrequency: 48, gain: 0.24, type: "sine" });
  noise(samples, { start, duration: 0.16, gain: 0.18, filterType: "bandpass", frequency: 1900, rng });
}

function longLaser(samples, start, rng) {
  tone(samples, { start, duration: 0.82, frequency: 1250, endFrequency: 260, gain: 0.28, type: "sawtooth" });
  tone(samples, { start: start + 0.12, duration: 0.68, frequency: 880, endFrequency: 180, gain: 0.18, type: "square" });
  noise(samples, { start: start + 0.04, duration: 0.5, gain: 0.08, filterType: "bandpass", frequency: 2500, rng });
}

function viralBoom(samples, start, rng) {
  tone(samples, { start, duration: 0.72, frequency: 84, endFrequency: 32, gain: 0.34, type: "sine" });
  tone(samples, { start: start + 0.015, duration: 0.5, frequency: 150, endFrequency: 42, gain: 0.18, type: "sawtooth" });
  noise(samples, { start, duration: 0.28, gain: 0.18, filterType: "lowpass", frequency: 680, rng });
}

function triggerClick(samples, start, rng) {
  noise(samples, { start, duration: 0.026, gain: 0.16, filterType: "highpass", frequency: 5200, rng });
  tone(samples, { start: start + 0.004, duration: 0.045, frequency: 620, endFrequency: 180, gain: 0.09, type: "triangle" });
}

function createTrack(durationSeconds) {
  return new Float32Array(Math.ceil(durationSeconds * AUDIO_SAMPLE_RATE));
}

function tone(samples, { start, duration, frequency, endFrequency, gain, type }) {
  const startIndex = Math.max(0, Math.floor(start * AUDIO_SAMPLE_RATE));
  const frameCount = Math.max(1, Math.floor(duration * AUDIO_SAMPLE_RATE));
  let phase = 0;

  for (let frame = 0; frame < frameCount && startIndex + frame < samples.length; frame += 1) {
    const progress = frame / frameCount;
    const currentFrequency = endFrequency
      ? frequency * ((Math.max(1, endFrequency) / frequency) ** progress)
      : frequency;
    phase += TWO_PI * currentFrequency / AUDIO_SAMPLE_RATE;
    samples[startIndex + frame] += waveValue(type, phase) * gain * envelope(progress, duration);
  }
}

function noise(samples, { start, duration, gain, filterType, frequency, rng }) {
  const startIndex = Math.max(0, Math.floor(start * AUDIO_SAMPLE_RATE));
  const frameCount = Math.max(1, Math.floor(duration * AUDIO_SAMPLE_RATE));
  const alpha = Math.min(0.98, Math.max(0.01, frequency / (frequency + AUDIO_SAMPLE_RATE)));
  let low = 0;
  let band = 0;

  for (let frame = 0; frame < frameCount && startIndex + frame < samples.length; frame += 1) {
    const raw = rng() * 2 - 1;
    low += alpha * (raw - low);
    const high = raw - low;

    let value = raw;
    if (filterType === "lowpass") {
      value = low;
    } else if (filterType === "highpass") {
      value = high;
    } else if (filterType === "bandpass") {
      band += 0.18 * (high - band);
      value = band;
    }

    samples[startIndex + frame] += value * gain * envelope(frame / frameCount, duration);
  }
}

function waveValue(type, phase) {
  switch (type) {
    case "square":
      return Math.sin(phase) >= 0 ? 1 : -1;
    case "triangle":
      return (2 / Math.PI) * Math.asin(Math.sin(phase));
    case "sawtooth":
      return 2 * ((phase / TWO_PI) % 1) - 1;
    case "sine":
    default:
      return Math.sin(phase);
  }
}

function envelope(progress, duration) {
  const attack = Math.min(0.018, duration * 0.25);
  const release = Math.min(0.08, duration * 0.45);
  const elapsed = progress * duration;

  if (elapsed < attack) {
    return elapsed / attack;
  }

  if (elapsed > duration - release) {
    return Math.max(0, (duration - elapsed) / release);
  }

  return 1;
}

function trimSilence(samples) {
  let lastAudible = samples.length - 1;
  while (lastAudible > 0 && Math.abs(samples[lastAudible]) < 0.0008) {
    lastAudible -= 1;
  }

  const tailFrames = Math.floor(AUDIO_SAMPLE_RATE * 0.05);
  const minFrames = Math.floor(AUDIO_SAMPLE_RATE * 0.12);
  const length = Math.min(samples.length, Math.max(minFrames, lastAudible + tailFrames));
  return samples.subarray(0, length);
}

function encodeWav(samples) {
  const dataBytes = samples.length * 2;
  const bytes = Buffer.alloc(44 + dataBytes);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(36 + dataBytes, 4);
  bytes.write("WAVE", 8, "ascii");
  bytes.write("fmt ", 12, "ascii");
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(AUDIO_CHANNELS, 22);
  bytes.writeUInt32LE(AUDIO_SAMPLE_RATE, 24);
  bytes.writeUInt32LE(AUDIO_SAMPLE_RATE * AUDIO_CHANNELS * AUDIO_BITS_PER_SAMPLE / 8, 28);
  bytes.writeUInt16LE(AUDIO_CHANNELS * AUDIO_BITS_PER_SAMPLE / 8, 32);
  bytes.writeUInt16LE(AUDIO_BITS_PER_SAMPLE, 34);
  bytes.write("data", 36, "ascii");
  bytes.writeUInt32LE(dataBytes, 40);

  for (let index = 0; index < samples.length; index += 1) {
    const clipped = Math.max(-1, Math.min(1, samples[index]));
    const pcm = Math.round(clipped * 32767);
    bytes.writeInt16LE(pcm, 44 + index * 2);
  }

  return bytes;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ result >>> 15, result | 1);
    result ^= result + Math.imul(result ^ result >>> 7, result | 61);
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
}

main();
