import { GameState, LockPopEngine } from "./game-engine.js";
import { LockPopRenderer } from "./renderer.js";
import { ArcadeAudio } from "./audio.js";
import {
  loadBestScore,
  loadMutedPreference,
  saveBestScore,
  saveMutedPreference
} from "./storage.js";

const canvas = document.getElementById("game-canvas");
const playfield = document.getElementById("playfield");
const primaryButton = document.getElementById("primary-action");
const pauseButton = document.getElementById("pause-action");
const muteButton = document.getElementById("mute-action");
const scoreElement = document.getElementById("score-value");
const bestElement = document.getElementById("best-value");
const statusElement = document.getElementById("status-value");
const speedElement = document.getElementById("speed-value");
const perfectIndicator = document.getElementById("perfect-indicator");
const liveRegion = document.getElementById("live-region");

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const engine = new LockPopEngine();
const renderer = new LockPopRenderer(canvas, { reducedMotion: reducedMotionQuery.matches });
const audio = new ArcadeAudio({
  muted: loadMutedPreference(),
  missSoundUrl: new URL("../assets/miss-fahhh.mp3", import.meta.url).href
});

let bestScore = loadBestScore();
let displayScore = 0;
let lastFrameTime = performance.now();
let lastState = engine.state;
let muted = loadMutedPreference();
let frameRequest = 0;
let effectId = 0;
const effects = [];

bestElement.textContent = String(bestScore);
updateControls(engine.getSnapshot());

function frame(now) {
  const rawDelta = Math.max(0, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  const snapshot = engine.update(rawDelta);
  if (snapshot.state !== lastState) {
    handleStateChange(snapshot.state);
    lastState = snapshot.state;
  }

  pruneEffects(now);
  updateDisplayScore(rawDelta, snapshot.score);
  updateHud(snapshot);
  renderer.render(snapshot, {
    now,
    effects,
    displayScore,
    bestScore
  });

  frameRequest = window.requestAnimationFrame(frame);
}

function updateDisplayScore(deltaSeconds, targetScore) {
  if (displayScore === targetScore) {
    return;
  }

  const blend = Math.min(1, Math.max(0.2, deltaSeconds * 12));
  displayScore += (targetScore - displayScore) * blend;
  if (Math.abs(displayScore - targetScore) < 0.04) {
    displayScore = targetScore;
  }
}

function updateHud(snapshot) {
  scoreElement.textContent = String(Math.round(displayScore));
  bestElement.textContent = String(bestScore);
  statusElement.textContent = getStateLabel(snapshot.state);
  speedElement.textContent = `${snapshot.speed.toFixed(1)}x`;
  updateControls(snapshot);
}

function updateControls(snapshot) {
  primaryButton.disabled = snapshot.state === GameState.COUNTDOWN;
  primaryButton.textContent = getPrimaryLabel(snapshot.state);
  pauseButton.disabled = ![GameState.COUNTDOWN, GameState.PLAYING, GameState.PAUSED].includes(snapshot.state);
  pauseButton.textContent = snapshot.state === GameState.PAUSED ? "Resume" : "Pause";
  muteButton.textContent = muted ? "Sound is off" : "Sound is on";
  muteButton.setAttribute("aria-pressed", muted ? "true" : "false");
}

function getPrimaryLabel(state) {
  if (state === GameState.READY) {
    return "Start";
  }
  if (state === GameState.PLAYING) {
    return "Hit";
  }
  if (state === GameState.PAUSED) {
    return "Resume";
  }
  if (state === GameState.GAME_OVER) {
    return "Again";
  }
  return "Set";
}

function getStateLabel(state) {
  if (state === GameState.COUNTDOWN) {
    return "Ready";
  }

  return state
    .toLowerCase()
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function handleStateChange(state) {
  if (state === GameState.PLAYING) {
    announce("Run active.");
  } else if (state === GameState.PAUSED) {
    announce("Paused.");
  }
}

async function primaryAction() {
  const state = engine.state;

  if (state === GameState.COUNTDOWN) {
    return;
  }

  if (state === GameState.READY || state === GameState.GAME_OVER) {
    displayScore = 0;
    engine.startRun();
    lastState = engine.state;
    await audio.playStart();
    addEffect({ type: "start", duration: 240 });
    announce("Starting.");
    updateHud(engine.getSnapshot());
    return;
  }

  if (state === GameState.PAUSED) {
    engine.resume();
    lastState = engine.state;
    await audio.playStart();
    announce("Resuming.");
    updateHud(engine.getSnapshot());
    return;
  }

  if (state === GameState.PLAYING) {
    await attemptHit();
  }
}

async function attemptHit() {
  const beforeHit = engine.getSnapshot();
  const result = engine.attemptHit();
  const event = engine.lastEvent;

  if (!result.accepted) {
    return;
  }

  if (result.hit) {
    syncBestScore();
    addEffect({
      type: result.perfect ? "perfect" : "hit",
      angle: event.targetAngle,
      width: beforeHit.targetWidth,
      duration: result.perfect ? 620 : 420
    });

    if (result.perfect) {
      showPerfectIndicator();
      await audio.playPerfect();
      announce(`Perfect. Score ${engine.score}.`);
    } else {
      await audio.playHit();
      announce(`Hit. Score ${engine.score}.`);
    }
  } else {
    syncBestScore();
    addEffect({
      type: "miss",
      angle: event.markerAngle,
      width: beforeHit.targetWidth,
      duration: reducedMotionQuery.matches ? 120 : 360
    });
    showMissShake();
    await audio.playMiss();
    announce(`Game over. Score ${engine.score}. Best ${bestScore}.`);
  }

  updateHud(engine.getSnapshot());
}

async function togglePause() {
  if (engine.state === GameState.PLAYING || engine.state === GameState.COUNTDOWN) {
    engine.pause("manual");
    lastState = engine.state;
    announce("Paused.");
  } else if (engine.state === GameState.PAUSED) {
    engine.resume();
    lastState = engine.state;
    await audio.playStart();
    announce("Resuming.");
  }

  updateHud(engine.getSnapshot());
}

function toggleMute() {
  muted = !muted;
  audio.setMuted(muted);
  saveMutedPreference(muted);
  updateControls(engine.getSnapshot());
  announce(muted ? "Sound off." : "Sound on.");
}

function syncBestScore() {
  if (engine.score > bestScore) {
    bestScore = engine.score;
    saveBestScore(bestScore);
  }
}

function addEffect(effect) {
  if (effect.type === "start") {
    return;
  }

  effects.push({
    id: effectId += 1,
    startedAt: performance.now(),
    ...effect
  });
}

function pruneEffects(now) {
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    const effect = effects[index];
    if (now - effect.startedAt > (effect.duration || 420)) {
      effects.splice(index, 1);
    }
  }
}

function showPerfectIndicator() {
  perfectIndicator.classList.remove("is-visible");
  void perfectIndicator.offsetWidth;
  perfectIndicator.classList.add("is-visible");
}

function showMissShake() {
  if (reducedMotionQuery.matches) {
    return;
  }

  playfield.classList.remove("is-miss-shake");
  void playfield.offsetWidth;
  playfield.classList.add("is-miss-shake");
  window.setTimeout(() => {
    playfield.classList.remove("is-miss-shake");
  }, 360);
}

function announce(message) {
  liveRegion.textContent = "";
  window.setTimeout(() => {
    liveRegion.textContent = message;
  }, 20);
}

function handleKeyboard(event) {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
  const isNativeButton = target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement;

  if (isTyping) {
    return;
  }

  if ((event.code === "Space" || event.code === "Enter") && !isNativeButton) {
    event.preventDefault();
    if (!event.repeat) {
      primaryAction();
    }
  } else if (event.code === "Escape" || event.code === "KeyP") {
    event.preventDefault();
    if (!event.repeat) {
      togglePause();
    }
  } else if (event.code === "KeyM") {
    event.preventDefault();
    if (!event.repeat) {
      toggleMute();
    }
  } else if (event.code === "KeyR" && engine.state === GameState.GAME_OVER) {
    event.preventDefault();
    if (!event.repeat) {
      primaryAction();
    }
  }
}

function handleCanvasPointer(event) {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  event.preventDefault();
  canvas.focus({ preventScroll: true });
  primaryAction();
}

function handleResize() {
  renderer.resize();
  renderer.render(engine.getSnapshot(), {
    now: performance.now(),
    effects,
    displayScore,
    bestScore
  });
}

function handleVisibilityChange() {
  if (document.hidden && (engine.state === GameState.PLAYING || engine.state === GameState.COUNTDOWN)) {
    engine.pause("hidden");
    lastState = engine.state;
    updateHud(engine.getSnapshot());
    announce("Paused.");
  }
}

primaryButton.addEventListener("click", () => {
  primaryAction();
});

pauseButton.addEventListener("click", () => {
  togglePause();
});

muteButton.addEventListener("click", () => {
  toggleMute();
});

if (window.PointerEvent) {
  canvas.addEventListener("pointerdown", handleCanvasPointer);
} else {
  canvas.addEventListener("click", event => {
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    primaryAction();
  });
}

window.addEventListener("keydown", handleKeyboard);
window.addEventListener("resize", handleResize);
window.addEventListener("orientationchange", handleResize);
document.addEventListener("visibilitychange", handleVisibilityChange);
reducedMotionQuery.addEventListener?.("change", event => {
  renderer.setReducedMotion(event.matches);
});

frameRequest = window.requestAnimationFrame(frame);
window.addEventListener("pagehide", () => {
  window.cancelAnimationFrame(frameRequest);
});
