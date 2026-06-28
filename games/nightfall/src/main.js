import {
  NIGHTFALL_ENGINE_FILES,
  NIGHTFALL_PATCH_FILES,
  NIGHTFALL_STORAGE_KEYS,
  makeStartupArguments,
  resolveEngineFile,
  resolvePatchFile,
  resolveRuntimeFile
} from "./config.js";
import {
  InputStateMachine,
  actionsFromMoveVector,
  actionsFromTurnVector
} from "./input-state.js";
import { BrowserInputDispatcher } from "./input-dispatch.js";

const dom = {
  startGame: document.querySelector("#start-game"),
  controlsOpen: document.querySelector("#controls-open"),
  creditsOpen: document.querySelector("#credits-open"),
  controlsDialog: document.querySelector("#controls-dialog"),
  creditsDialog: document.querySelector("#credits-dialog"),
  fullscreenButton: document.querySelector("#fullscreen-button"),
  touchToggle: document.querySelector("#touch-toggle"),
  audioButton: document.querySelector("#audio-button"),
  viewport: document.querySelector("#game-viewport"),
  canvas: document.querySelector("#game-canvas"),
  loadingPanel: document.querySelector("#loading-panel"),
  loadingTitle: document.querySelector("#loading-title"),
  loadingStatus: document.querySelector("#loading-status"),
  loadingProgress: document.querySelector("#loading-progress"),
  errorPanel: document.querySelector("#error-panel"),
  errorMessage: document.querySelector("#error-message"),
  retryButton: document.querySelector("#retry-button"),
  runtimeState: document.querySelector("#runtime-state"),
  touchControls: document.querySelector("#touch-controls"),
  movePad: document.querySelector("#move-pad"),
  turnPad: document.querySelector("#turn-pad"),
  runToggle: document.querySelector("#run-toggle"),
  firstRunHint: document.querySelector("#first-run-hint"),
  dismissFirstRun: document.querySelector("#dismiss-first-run")
};

const input = new InputStateMachine(new BrowserInputDispatcher({ targetWindow: window }));
const PAGE_TITLE = "NIGHTFALL | Midnight Games";
const FULLSCREEN_SETTLE_TIMEOUT_MS = 900;

let engineStarted = false;
let engineFailed = false;
let engineReady = false;
let engineModule = null;
let engineScript = null;
let firstRunTimer = 0;
let fallbackFullscreen = false;

document.documentElement.dataset.engineReady = "false";

dom.canvas.addEventListener("contextmenu", event => event.preventDefault());
dom.startGame.addEventListener("click", startGame);
dom.retryButton.addEventListener("click", () => window.location.reload());
dom.controlsOpen.addEventListener("click", () => openDialog(dom.controlsDialog));
dom.creditsOpen.addEventListener("click", () => openDialog(dom.creditsDialog));
for (const button of document.querySelectorAll(".controls-open-secondary")) {
  button.addEventListener("click", () => openDialog(dom.controlsDialog));
}
for (const button of document.querySelectorAll(".credits-open-secondary")) {
  button.addEventListener("click", () => openDialog(dom.creditsDialog));
}
dom.fullscreenButton.addEventListener("click", toggleFullscreen);
dom.audioButton.addEventListener("click", enableAudio);
dom.touchToggle.addEventListener("click", () => setTouchControlsVisible(!isTouchControlsVisible(), true));
dom.dismissFirstRun.addEventListener("click", dismissFirstRunHint);
document.addEventListener("fullscreenchange", syncFullscreenButton);
document.addEventListener("webkitfullscreenchange", syncFullscreenButton);
window.visualViewport?.addEventListener("resize", syncVisualViewportSize);
window.visualViewport?.addEventListener("scroll", syncVisualViewportSize);
window.addEventListener("resize", syncVisualViewportSize);
window.addEventListener("pagehide", () => {
  if (fallbackFullscreen) {
    exitFallbackFullscreen();
  }
});

setupTouchControls();
setTouchControlsVisible(getInitialTouchVisibility(), false);
syncVisualViewportSize();
syncFullscreenButton();

function startGame() {
  if (engineStarted || engineFailed) {
    return;
  }

  engineStarted = true;
  document.body.classList.add("is-engine-active");
  setRuntimeState("Loading");
  updateLoadingStatus("Downloading engine package after Start Game.", 0);
  dom.loadingPanel.hidden = false;
  dom.errorPanel.hidden = true;
  dom.startGame.disabled = true;
  dom.canvas.focus({ preventScroll: true });

  engineModule = createEngineModule();
  window.Module = engineModule;

  engineScript = document.createElement("script");
  engineScript.src = resolveEngineFile(NIGHTFALL_ENGINE_FILES.script);
  engineScript.async = true;
  engineScript.dataset.nightfallEngine = "true";
  engineScript.addEventListener("error", () => failStartup("The engine script could not be loaded."));
  document.body.append(engineScript);
}

function createEngineModule() {
  let mainCalled = false;

  return {
    noInitialRun: true,
    canvas: dom.canvas,
    preRun: [preloadNightfallFacePatch],
    locateFile(path) {
      return resolveRuntimeFile(path);
    },
    setStatus(text) {
      if (!text) {
        return;
      }
      const progress = parseEmscriptenProgress(text);
      updateLoadingStatus(text, progress);
    },
    monitorRunDependencies(left) {
      if (left > 0) {
        updateLoadingStatus(`Preparing runtime dependencies: ${left} remaining.`, null);
      }
    },
    onRuntimeInitialized() {
      updateLoadingStatus("Runtime initialized. Launching content.", null);
      queueMicrotask(() => {
        if (mainCalled) return;
        if (engineFailed) return;
        if (typeof engineModule.callMain !== "function") {
          failStartup("The engine runtime did not export the expected startup function.");
          return;
        }
        mainCalled = true;
        try {
          // callMain mutates the argument array, so it must receive a fresh fixed list.
          engineModule.callMain(makeStartupArguments());
        } catch (error) {
          failStartup(formatError(error));
        }
      });
    },
    onAbort(reason) {
      failStartup(`Engine aborted: ${formatError(reason)}`);
    },
    print(text) {
      console.log(`[nightfall] ${text}`);
    },
    printErr(text) {
      console.warn(`[nightfall] ${text}`);
    },
    hideConsole() {
      markEngineReady();
    },
    showConsole() {
      setRuntimeState("Console");
    },
    winResized() {},
    captureMouse() {
      if (window.matchMedia("(pointer: coarse)").matches) {
        return;
      }
      dom.canvas.requestPointerLock?.().catch?.(() => {});
    },
    softExit(status) {
      setRuntimeState(`Exited ${status}`);
    }
  };
}

function preloadNightfallFacePatch(module) {
  const dependency = "nightfall-face-pwad";
  module.addRunDependency(dependency);
  updateLoadingStatus("Loading custom status face.", null);

  fetch(resolvePatchFile(NIGHTFALL_PATCH_FILES.facePatch), { credentials: "same-origin" })
    .then(response => {
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.url}`);
      }
      return response.arrayBuffer();
    })
    .then(buffer => {
      // The engine reads WAD paths from argv, so the patch has to exist in MEMFS before callMain.
      module.FS_createDataFile("/", NIGHTFALL_PATCH_FILES.facePatch, new Uint8Array(buffer), true, true, true);
    })
    .catch(error => {
      failStartup(`The custom status face could not be loaded: ${formatError(error)}`);
    })
    .finally(() => {
      module.removeRunDependency(dependency);
    });
}

function parseEmscriptenProgress(text) {
  const match = text.match(/\((\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\)/);
  if (!match) {
    return null;
  }
  const loaded = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(loaded) || !Number.isFinite(total) || total <= 0) {
    return null;
  }
  return Math.max(0, Math.min(100, (loaded / total) * 100));
}

function updateLoadingStatus(text, progress) {
  dom.loadingTitle.textContent = engineReady ? "Ready" : "Loading NIGHTFALL";
  dom.loadingStatus.textContent = text;
  if (typeof progress === "number") {
    dom.loadingProgress.hidden = false;
    dom.loadingProgress.value = progress;
  }
  setRuntimeState(text);
}

function markEngineReady() {
  engineReady = true;
  restorePageTitle();
  // The engine reports its own window title during startup; restore the route title
  // after the ready callback settles so the public browser chrome stays on NIGHTFALL.
  window.setTimeout(restorePageTitle, 0);
  window.setTimeout(restorePageTitle, 500);
  document.documentElement.dataset.engineReady = "true";
  dom.loadingPanel.hidden = true;
  dom.errorPanel.hidden = true;
  setRuntimeState("Ready");
  dom.canvas.focus({ preventScroll: true });
  refreshAudioControl();
  showFirstRunHint();
}

function restorePageTitle() {
  document.title = PAGE_TITLE;
}

function failStartup(message) {
  if (engineFailed) {
    return;
  }

  engineFailed = true;
  input.clearAll("startup failure");
  document.body.classList.remove("is-engine-active");
  dom.errorMessage.textContent = message;
  dom.errorPanel.hidden = false;
  dom.loadingPanel.hidden = true;
  dom.runtimeState.textContent = "Error";
  console.error(`[nightfall] ${message}`);
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function setRuntimeState(text) {
  dom.runtimeState.textContent = text;
}

function openDialog(dialog) {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

async function toggleFullscreen() {
  try {
    if (fallbackFullscreen) {
      exitFallbackFullscreen();
      return;
    }

    if (getFullscreenElement()) {
      await exitNativeFullscreen();
      return;
    }

    if (shouldUseFullscreenFallback()) {
      enterFallbackFullscreen();
      return;
    }

    const fullscreenRequest = requestNativeFullscreen(dom.viewport);
    if (fullscreenRequest) {
      const requestResult = await waitForFullscreenRequest(fullscreenRequest);
      if (requestResult.error) {
        throw requestResult.error;
      }
      if (getFullscreenElement()) {
        syncFullscreenButton();
        return;
      }
      setRuntimeState("Using browser fullscreen fallback.");
    }
  } catch (error) {
    setRuntimeState(`Using browser fullscreen fallback: ${formatError(error)}`);
  }

  enterFallbackFullscreen();
}

function requestNativeFullscreen(element) {
  const request =
    element.requestFullscreen ||
    element.webkitRequestFullscreen ||
    element.msRequestFullscreen;
  return typeof request === "function" ? Promise.resolve(request.call(element)) : null;
}

function shouldUseFullscreenFallback() {
  return isIOSLikeBrowser() || !(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.msFullscreenEnabled);
}

function isIOSLikeBrowser() {
  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

async function waitForFullscreenRequest(fullscreenRequest) {
  let requestError = null;
  const observedRequest = fullscreenRequest
    .then(() => true)
    .catch(error => {
      requestError = error;
      return false;
    });
  const completed = await Promise.race([
    observedRequest,
    new Promise(resolve => window.setTimeout(() => resolve(false), FULLSCREEN_SETTLE_TIMEOUT_MS))
  ]);
  return { completed, error: requestError };
}

function exitNativeFullscreen() {
  const exit =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.msExitFullscreen;
  return typeof exit === "function" ? exit.call(document) : Promise.resolve();
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null;
}

function enterFallbackFullscreen() {
  fallbackFullscreen = true;
  syncVisualViewportSize();
  document.body.classList.add("is-nightfall-fullscreen");
  releaseAllInputs("fullscreen fallback entered");
  syncFullscreenButton();
  window.scrollTo(0, 0);
  window.setTimeout(() => dom.canvas.focus({ preventScroll: true }), 0);
}

function exitFallbackFullscreen() {
  fallbackFullscreen = false;
  document.body.classList.remove("is-nightfall-fullscreen");
  releaseAllInputs("fullscreen fallback exited");
  syncFullscreenButton();
  window.setTimeout(() => dom.canvas.focus({ preventScroll: true }), 0);
}

function syncFullscreenButton() {
  const active = fallbackFullscreen || Boolean(getFullscreenElement());
  dom.fullscreenButton.textContent = active ? "Exit Fullscreen" : "Fullscreen";
  dom.fullscreenButton.setAttribute("aria-pressed", String(active));
  dom.fullscreenButton.setAttribute("aria-label", active ? "Exit fullscreen" : "Enter fullscreen");
}

function syncVisualViewportSize() {
  const viewport = window.visualViewport;
  const width = viewport?.width || window.innerWidth;
  const height = viewport?.height || window.innerHeight;
  document.documentElement.style.setProperty("--nightfall-vvw", `${Math.round(width)}px`);
  document.documentElement.style.setProperty("--nightfall-vvh", `${Math.round(height)}px`);
}

async function enableAudio() {
  const audioContext = engineModule?.SDL2?.audioContext;
  if (!audioContext || audioContext.state !== "suspended") {
    refreshAudioControl();
    return;
  }

  try {
    await audioContext.resume();
  } catch (error) {
    setRuntimeState(`Audio resume failed: ${formatError(error)}`);
  }
  refreshAudioControl();
}

function refreshAudioControl() {
  const audioContext = engineModule?.SDL2?.audioContext;
  dom.audioButton.hidden = !audioContext || audioContext.state !== "suspended";
}

function getInitialTouchVisibility() {
  const stored = readLocalStorage(NIGHTFALL_STORAGE_KEYS.touchControlsVisible);
  if (stored !== null) {
    return stored === "true";
  }
  return window.matchMedia("(pointer: coarse)").matches;
}

function isTouchControlsVisible() {
  return !dom.touchControls.hidden;
}

function setTouchControlsVisible(isVisible, persist) {
  dom.touchControls.hidden = !isVisible;
  dom.touchToggle.setAttribute("aria-pressed", String(isVisible));
  if (persist) {
    writeLocalStorage(NIGHTFALL_STORAGE_KEYS.touchControlsVisible, String(isVisible));
  }
  if (!isVisible) {
    input.clearAll("touch controls hidden");
    resetTouchVisuals();
  }
}

function setupTouchControls() {
  setupPad(dom.movePad, actionsFromMoveVector);
  setupPad(dom.turnPad, actionsFromTurnVector);

  for (const button of dom.touchControls.querySelectorAll("[data-action]")) {
    setupTouchButton(button, button.dataset.action);
  }

  dom.runToggle.addEventListener("click", event => {
    event.preventDefault();
    const isLocked = input.toggleRunLock();
    dom.runToggle.classList.toggle("is-active", isLocked);
    dom.runToggle.setAttribute("aria-pressed", String(isLocked));
  });

  window.addEventListener("blur", () => releaseAllInputs("blur"));
  window.addEventListener("pagehide", () => releaseAllInputs("pagehide"));
  window.addEventListener("orientationchange", () => releaseAllInputs("orientation change"));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") {
      releaseAllInputs("visibility change");
    }
  });
}

function setupPad(pad, vectorToActions) {
  const knob = pad.querySelector(".pad-knob");
  let pointerId = null;

  pad.addEventListener("pointerdown", event => {
    if (pointerId !== null) return;
    event.preventDefault();
    pointerId = event.pointerId;
    pad.setPointerCapture(pointerId);
    pad.classList.add("is-active");
    updatePad(event);
  });

  pad.addEventListener("pointermove", event => {
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    updatePad(event);
  });

  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    pad.addEventListener(eventName, event => {
      if (event.pointerId !== pointerId) return;
      event.preventDefault();
      input.clearPointer(pointerId);
      pointerId = null;
      pad.classList.remove("is-active");
      knob.style.transform = "";
    });
  }

  function updatePad(event) {
    const rect = pad.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxDistance = Math.max(1, Math.min(rect.width, rect.height) / 2);
    const normalizedX = Math.max(-1, Math.min(1, (event.clientX - centerX) / maxDistance));
    const normalizedY = Math.max(-1, Math.min(1, (event.clientY - centerY) / maxDistance));
    const knobX = normalizedX * 28;
    const knobY = normalizedY * 28;
    knob.style.transform = `translate(${knobX}px, ${knobY}px)`;
    input.setPointerActions(pointerId, vectorToActions(normalizedX, normalizedY));
  }
}

function setupTouchButton(button, action) {
  const activePointers = new Set();

  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    activePointers.add(event.pointerId);
    button.setPointerCapture(event.pointerId);
    button.classList.add("is-active");
    input.setPointerActions(event.pointerId, [action]);
  });

  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(eventName, event => {
      if (!activePointers.has(event.pointerId)) return;
      event.preventDefault();
      activePointers.delete(event.pointerId);
      input.clearPointer(event.pointerId);
      if (activePointers.size === 0) {
        button.classList.remove("is-active");
      }
    });
  }
}

function releaseAllInputs(reason) {
  input.clearAll(reason);
  resetTouchVisuals();
}

function resetTouchVisuals() {
  for (const pad of [dom.movePad, dom.turnPad]) {
    pad.classList.remove("is-active");
    pad.querySelector(".pad-knob").style.transform = "";
  }
  for (const button of dom.touchControls.querySelectorAll(".touch-button")) {
    button.classList.remove("is-active");
  }
  dom.runToggle.setAttribute("aria-pressed", "false");
}

function showFirstRunHint() {
  if (readLocalStorage(NIGHTFALL_STORAGE_KEYS.firstRunHelpDismissed) === "true") {
    return;
  }

  dom.firstRunHint.hidden = false;
  window.clearTimeout(firstRunTimer);
  firstRunTimer = window.setTimeout(dismissFirstRunHint, 8500);
}

function dismissFirstRunHint() {
  dom.firstRunHint.hidden = true;
  writeLocalStorage(NIGHTFALL_STORAGE_KEYS.firstRunHelpDismissed, "true");
}

function readLocalStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Local storage is only used for shell preferences; unavailable storage must not block play.
  }
}
