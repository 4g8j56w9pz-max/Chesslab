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
  { id: "heavy-laser", label: "Heavy Laser", category: "Laser Tag", tag: "loud", color: "#00b4ff" },
  { id: "long-laser", label: "Long Laser", category: "Laser Tag", tag: "long", color: "#45f0ff" },
  { id: "pulse-stream", label: "Pulse Stream", category: "Laser Tag", tag: "stream", color: "#64ffda" },
  { id: "overcharge-shot", label: "Overcharge Shot", category: "Laser Tag", tag: "big", color: "#f7ff5c" },
  { id: "scatter-burst", label: "Scatter Burst", category: "Laser Tag", tag: "spread", color: "#57a7ff" },
  { id: "beam-sweep", label: "Beam Sweep", category: "Laser Tag", tag: "sweep", color: "#b5fff6" },
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
  { id: "trigger-click", label: "Trigger Click", category: "Trigger", tag: "click", color: "#f6d365" },
  { id: "trigger-snap", label: "Trigger Snap", category: "Trigger", tag: "snap", color: "#fda085" },
  { id: "trigger-press", label: "Trigger Press", category: "Trigger", tag: "press", color: "#fbc2eb" },
  { id: "trigger-reset", label: "Trigger Reset", category: "Trigger", tag: "reset", color: "#a6c1ee" },
  { id: "trigger-double-tap", label: "Double Tap", category: "Trigger", tag: "double", color: "#d4fc79" },
  { id: "trigger-ready", label: "Trigger Ready", category: "Trigger", tag: "ready", color: "#96e6a1" },
  { id: "air-horn", label: "Air Horn Style", category: "Hype", tag: "horn", color: "#ffb000" },
  { id: "dj-scratch", label: "DJ Scratch", category: "Hype", tag: "scratch", color: "#f498c2" },
  { id: "bass-drop", label: "Bass Drop", category: "Hype", tag: "drop", color: "#9b5cff" },
  { id: "record-stop", label: "Record Stop", category: "Hype", tag: "vinyl", color: "#cdd6f4" },
  { id: "crowd-hey", label: "Crowd Hey", category: "Hype", tag: "chant", color: "#ff8f70" },
  { id: "hype-hit", label: "Hype Hit", category: "Hype", tag: "sting", color: "#ffdd57" },
  { id: "drama-hit", label: "Drama Hit", category: "Hype", tag: "boom", color: "#ff6b6b" },
  { id: "vinyl-beep", label: "Vinyl Beep", category: "Hype", tag: "beep", color: "#d7ff65" },
  { id: "bruh-sample", label: "Bruh", category: "Meme", tag: "sample", color: "#f59e0b" },
  { id: "cartoon-run", label: "Cartoon Run", category: "Meme", tag: "sample", color: "#38bdf8" },
  { id: "na-na-nan-no", label: "Na Na Nan No", category: "Meme", tag: "sample", color: "#f472b6" },
  { id: "we-do-not-care", label: "We Do Not Care", category: "Meme", tag: "sample", color: "#a3e635" },
  { id: "viral-boom", label: "Viral Boom", category: "Meme", tag: "boom", color: "#ff3d7f" },
  { id: "sad-trombone", label: "Sad Trombone", category: "Meme", tag: "fail", color: "#ffb86b" },
  { id: "bruh-bass", label: "Bruh Bass", category: "Meme", tag: "drop", color: "#8f7cff" },
  { id: "censor-bleep", label: "Censor Bleep", category: "Meme", tag: "beep", color: "#f9f871" },
  { id: "wow-rise", label: "Wow Rise", category: "Meme", tag: "rise", color: "#72f1b8" },
  { id: "suspense-sting", label: "Suspense Sting", category: "Meme", tag: "reveal", color: "#ff6ad5" },
  { id: "laugh-blip", label: "Laugh Blip", category: "Meme", tag: "laugh", color: "#fdfd96" },
  { id: "comedy-boing", label: "Comedy Boing", category: "Meme", tag: "bounce", color: "#7ee7ff" },
  { id: "fail-buzzer", label: "Fail Buzzer", category: "Meme", tag: "fail", color: "#ff5c5c" },
  { id: "chat-alert", label: "Chat Alert", category: "Meme", tag: "ping", color: "#5cff9d" },
  { id: "rimshot", label: "Rimshot", category: "Meme", tag: "hit", color: "#ffd166" },
  { id: "surprise-pop", label: "Surprise Pop", category: "Meme", tag: "pop", color: "#ff9ff3" },
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
  "trigger-click",
  "trigger-snap",
  "trigger-press",
  "laser-shot",
  "heavy-laser",
  "long-laser",
  "pulse-stream",
  "laser-burst",
  "overcharge-shot",
  "target-lock",
  "tag-confirm"
]);

export const MEME_PRESET = Object.freeze([
  "bruh-sample",
  "cartoon-run",
  "na-na-nan-no",
  "we-do-not-care",
  "viral-boom",
  "sad-trombone",
  "bruh-bass",
  "censor-bleep",
  "wow-rise",
  "suspense-sting",
  "laugh-blip",
  "rimshot"
]);

export const LASER_PRESET = Object.freeze([
  "trigger-click",
  "trigger-snap",
  "laser-shot",
  "heavy-laser",
  "long-laser",
  "pulse-stream",
  "laser-burst",
  "scatter-burst",
  "charge-shot",
  "overcharge-shot",
  "target-lock",
  "tag-confirm"
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
