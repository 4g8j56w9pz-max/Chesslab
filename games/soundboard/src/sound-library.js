export const AUDIO_SAMPLE_RATE = 22050;
export const AUDIO_CHANNELS = 1;
export const AUDIO_BITS_PER_SAMPLE = 16;

export const PAD_SLOTS = Object.freeze([
  { id: "pad-1", key: "1" },
  { id: "pad-2", key: "2" },
  { id: "pad-3", key: "3" },
  { id: "pad-4", key: "4" },
  { id: "pad-5", key: "5" },
  { id: "pad-6", key: "6" },
  { id: "pad-7", key: "7" },
  { id: "pad-8", key: "8" },
  { id: "pad-9", key: "9" },
  { id: "pad-10", key: "0" },
  { id: "pad-11", key: "Q" },
  { id: "pad-12", key: "W" }
]);

export const SOUND_LIBRARY = Object.freeze([
  { id: "fahhh", label: "Fahhh", category: "Signature", tag: "sample", color: "#de3341" },
  { id: "laser-shot", label: "Laser Shot", category: "Laser Tag", tag: "shot", color: "#32d9ff" },
  { id: "laser-burst", label: "Laser Burst", category: "Laser Tag", tag: "rapid", color: "#15b7ff" },
  { id: "charge-shot", label: "Charge Shot", category: "Laser Tag", tag: "charge", color: "#7cffe4" },
  { id: "ricochet", label: "Ricochet", category: "Laser Tag", tag: "bounce", color: "#ffd166" },
  { id: "target-lock", label: "Target Lock", category: "Laser Tag", tag: "lock", color: "#ff5c8a" },
  { id: "tag-confirm", label: "Tag Confirm", category: "Laser Tag", tag: "score", color: "#56d364" },
  { id: "shield-ping", label: "Shield Ping", category: "Laser Tag", tag: "shield", color: "#8ee8ff" },
  { id: "shield-crack", label: "Shield Crack", category: "Laser Tag", tag: "break", color: "#ff7a45" },
  { id: "shield-recharge", label: "Shield Recharge", category: "Laser Tag", tag: "ready", color: "#83f28f" },
  { id: "base-alarm", label: "Base Alarm", category: "Laser Tag", tag: "alert", color: "#ff4158" },
  { id: "round-start", label: "Round Start", category: "Laser Tag", tag: "start", color: "#b5ff6a" },
  { id: "round-end", label: "Round End", category: "Laser Tag", tag: "finish", color: "#bfa6ff" },
  { id: "scanner-ping", label: "Scanner Ping", category: "Laser Tag", tag: "scan", color: "#43f5d6" },
  { id: "stealth-blip", label: "Stealth Blip", category: "Laser Tag", tag: "soft", color: "#9aa7ff" },
  { id: "air-horn", label: "Air Horn Style", category: "Hype", tag: "horn", color: "#ffb000" },
  { id: "dj-scratch", label: "DJ Scratch", category: "Hype", tag: "scratch", color: "#f498c2" },
  { id: "bass-drop", label: "Bass Drop", category: "Hype", tag: "drop", color: "#9b5cff" },
  { id: "record-stop", label: "Record Stop", category: "Hype", tag: "vinyl", color: "#cdd6f4" },
  { id: "crowd-hey", label: "Crowd Hey", category: "Hype", tag: "chant", color: "#ff8f70" },
  { id: "hype-hit", label: "Hype Hit", category: "Hype", tag: "sting", color: "#ffdd57" },
  { id: "drama-hit", label: "Drama Hit", category: "Hype", tag: "boom", color: "#ff6b6b" },
  { id: "vinyl-beep", label: "Vinyl Beep", category: "Hype", tag: "beep", color: "#d7ff65" },
  { id: "coin-pickup", label: "Coin Pickup", category: "Arcade", tag: "coin", color: "#ffdc5e" },
  { id: "power-up", label: "Power Up", category: "Arcade", tag: "up", color: "#5efc8d" },
  { id: "one-up", label: "One Up", category: "Arcade", tag: "life", color: "#77ddff" },
  { id: "level-clear", label: "Level Clear", category: "Arcade", tag: "win", color: "#9df56f" },
  { id: "glitch-burst", label: "Glitch Burst", category: "Arcade", tag: "glitch", color: "#e56bff" },
  { id: "jump", label: "8-Bit Jump", category: "Arcade", tag: "jump", color: "#7dd3fc" },
  { id: "bonus-tally", label: "Bonus Tally", category: "Arcade", tag: "count", color: "#f7b267" },
  { id: "game-over", label: "Game Over", category: "Arcade", tag: "down", color: "#a3a3a3" },
  { id: "button-blip", label: "Button Blip", category: "UI", tag: "tap", color: "#88ccff" },
  { id: "score-tick", label: "Score Tick", category: "UI", tag: "tick", color: "#facc15" },
  { id: "success-chime", label: "Success Chime", category: "UI", tag: "ok", color: "#74f27a" },
  { id: "error-buzzer", label: "Error Buzzer", category: "UI", tag: "error", color: "#ff5d5d" },
  { id: "countdown-beep", label: "Countdown Beep", category: "UI", tag: "timer", color: "#f9a03f" },
  { id: "warning-siren", label: "Warning Siren", category: "UI", tag: "warn", color: "#ff3366" },
  { id: "menu-open", label: "Menu Open", category: "UI", tag: "menu", color: "#b4befe" },
  { id: "power-down", label: "Power Down", category: "UI", tag: "off", color: "#94a3b8" }
]);

export const DEFAULT_ASSIGNMENTS = Object.freeze([
  "fahhh",
  "laser-shot",
  "laser-burst",
  "charge-shot",
  "target-lock",
  "tag-confirm",
  "shield-ping",
  "base-alarm",
  "air-horn",
  "dj-scratch",
  "bass-drop",
  "coin-pickup"
]);

export const LASER_PRESET = Object.freeze([
  "laser-shot",
  "laser-burst",
  "charge-shot",
  "ricochet",
  "target-lock",
  "tag-confirm",
  "shield-ping",
  "shield-crack",
  "shield-recharge",
  "base-alarm",
  "round-start",
  "round-end"
]);

export function soundFileStem(soundId) {
  return soundId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function soundSymbol(soundId) {
  return `${soundFileStem(soundId).replace(/-/g, "_").toUpperCase()}_WAV`;
}

export function soundWavPath(soundId) {
  return `./audio/wav/${soundFileStem(soundId)}.wav`;
}

export function soundHeaderPath(soundId) {
  return `./audio/headers/${soundFileStem(soundId)}_wav.h`;
}
