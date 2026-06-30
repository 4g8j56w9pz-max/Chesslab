const STEP_COUNT = 8;
const STORAGE_KEYS = Object.freeze({
  muted: "fahhhSoundboard.muted",
  tempo: "fahhhSoundboard.tempo",
  pattern: "fahhhSoundboard.pattern"
});

const PAD_DEFINITIONS = Object.freeze([
  { id: "fahhh", label: "Fahhh", tag: "sample", key: "1", color: "#de3341" },
  { id: "kick", label: "Thump", tag: "kick", key: "2", color: "#ffd166" },
  { id: "hat", label: "Tick", tag: "hat", key: "3", color: "#26c6da" },
  { id: "clap", label: "Clack", tag: "clap", key: "4", color: "#56d364" },
  { id: "bass", label: "Wob", tag: "bass", key: "5", color: "#ff7a45" },
  { id: "zap", label: "Zap", tag: "sweep", key: "6", color: "#9ad7ff" },
  { id: "blip", label: "Bleep", tag: "tone", key: "7", color: "#d7ff65" },
  { id: "crunch", label: "Crunch", tag: "noise", key: "8", color: "#f498c2" }
]);

const SEQUENCE_LANES = Object.freeze(["fahhh", "kick", "hat", "clap"]);

const DEFAULT_PATTERN = Object.freeze({
  fahhh: [false, false, false, false, false, false, false, true],
  kick: [true, false, false, false, true, false, false, false],
  hat: [false, true, false, true, false, true, false, true],
  clap: [false, false, false, false, true, false, false, false]
});

const dom = {
  padGrid: document.getElementById("pad-grid"),
  sequenceGrid: document.getElementById("sequence-grid"),
  muteButton: document.getElementById("mute-button"),
  playLoopButton: document.getElementById("play-loop"),
  clearLoopButton: document.getElementById("clear-loop"),
  tempoSlider: document.getElementById("tempo-slider"),
  tempoReadout: document.getElementById("tempo-readout"),
  loopState: document.getElementById("loop-state"),
  lastSound: document.getElementById("last-sound"),
  hitCount: document.getElementById("hit-count"),
  soundStatus: document.getElementById("sound-status"),
  liveRegion: document.getElementById("live-region"),
  scope: document.querySelector(".scope")
};

const padsById = new Map(PAD_DEFINITIONS.map(pad => [pad.id, pad]));
let audio = null;
let state = null;

function renderPads() {
  const fragment = document.createDocumentFragment();

  for (const pad of PAD_DEFINITIONS) {
    const button = document.createElement("button");
    button.className = "pad-button";
    button.type = "button";
    button.dataset.sound = pad.id;
    button.style.setProperty("--pad-color", pad.color);
    button.innerHTML = `
      <span class="pad-key">${pad.key}</span>
      <strong>${pad.label}</strong>
      <small>${pad.tag}</small>
    `;
    button.addEventListener("click", () => {
      playPad(pad.id);
    });
    fragment.append(button);
  }

  dom.padGrid.replaceChildren(fragment);
}

function renderSequence() {
  const fragment = document.createDocumentFragment();
  const empty = document.createElement("span");
  empty.className = "step-label";
  fragment.append(empty);

  for (let step = 0; step < STEP_COUNT; step += 1) {
    const label = document.createElement("span");
    label.className = "step-label";
    label.textContent = String(step + 1);
    fragment.append(label);
  }

  for (const soundId of SEQUENCE_LANES) {
    const pad = padsById.get(soundId);
    const laneLabel = document.createElement("span");
    laneLabel.className = "sequence-label";
    laneLabel.textContent = pad.label;
    fragment.append(laneLabel);

    for (let step = 0; step < STEP_COUNT; step += 1) {
      const cell = document.createElement("button");
      cell.className = "sequence-cell";
      cell.type = "button";
      cell.dataset.sound = soundId;
      cell.dataset.step = String(step);
      cell.style.setProperty("--cell-color", pad.color);
      cell.addEventListener("click", () => {
        state.pattern[soundId][step] = !state.pattern[soundId][step];
        savePattern();
        renderPatternCells();
      });
      fragment.append(cell);
    }
  }

  dom.sequenceGrid.replaceChildren(fragment);
  renderPatternCells();
}

function renderPatternCells() {
  for (const cell of dom.sequenceGrid.querySelectorAll(".sequence-cell")) {
    const soundId = cell.dataset.sound;
    const step = Number.parseInt(cell.dataset.step, 10);
    const isOn = Boolean(state.pattern[soundId]?.[step]);
    const isCurrent = state.isLooping && step === state.currentStep;
    const pad = padsById.get(soundId);

    cell.classList.toggle("is-on", isOn);
    cell.classList.toggle("is-current", isCurrent);
    cell.setAttribute("aria-pressed", isOn ? "true" : "false");
    cell.setAttribute("aria-label", `${pad.label} step ${step + 1} ${isOn ? "on" : "off"}`);
  }
}

function renderState() {
  dom.muteButton.textContent = state.muted ? "Sound Off" : "Sound On";
  dom.muteButton.setAttribute("aria-pressed", state.muted ? "true" : "false");
  dom.playLoopButton.textContent = state.isLooping ? "Stop" : "Play";
  dom.tempoSlider.value = String(state.tempo);
  dom.tempoReadout.textContent = String(state.tempo);
  dom.loopState.textContent = state.isLooping ? `Step ${state.currentStep + 1}` : "Stopped";
  dom.hitCount.textContent = String(state.hitCount);
  renderPatternCells();
}

async function playPad(soundId, options = {}) {
  const pad = padsById.get(soundId);
  if (!pad) {
    return;
  }

  const played = await audio.play(soundId);
  flashPad(soundId);
  pulseScope(soundId);

  if (!options.fromLoop) {
    state.hitCount += 1;
    dom.lastSound.textContent = pad.label;
    setStatus(played ? pad.label : "Silent");
    announce(`${pad.label}.`);
    renderState();
  }
}

function toggleMute() {
  state.muted = !state.muted;
  audio.setMuted(state.muted);
  saveBoolean(STORAGE_KEYS.muted, state.muted);
  setStatus(state.muted ? "Muted" : "Ready");
  renderState();
}

function toggleLoop() {
  if (state.isLooping) {
    stopLoop();
  } else {
    startLoop();
  }
}

function startLoop() {
  state.isLooping = true;
  state.currentStep = -1;
  audio.unlock();
  runLoopStep();
  renderState();
}

function stopLoop() {
  if (state.loopTimer) {
    window.clearTimeout(state.loopTimer);
    state.loopTimer = 0;
  }

  state.isLooping = false;
  state.currentStep = -1;
  renderState();
}

function runLoopStep() {
  if (!state.isLooping) {
    return;
  }

  state.currentStep = (state.currentStep + 1) % STEP_COUNT;
  const activeSounds = SEQUENCE_LANES.filter(soundId => state.pattern[soundId]?.[state.currentStep]);

  for (const soundId of activeSounds) {
    playPad(soundId, { fromLoop: true });
    flashSequenceCell(soundId, state.currentStep);
  }

  dom.loopState.textContent = `Step ${state.currentStep + 1}`;
  renderPatternCells();
  state.loopTimer = window.setTimeout(runLoopStep, getStepMs());
}

function getStepMs() {
  return Math.round(60000 / state.tempo / 2);
}

function clearPattern() {
  for (const soundId of SEQUENCE_LANES) {
    state.pattern[soundId] = Array.from({ length: STEP_COUNT }, () => false);
  }
  savePattern();
  setStatus("Cleared");
  renderPatternCells();
}

function updateTempo() {
  state.tempo = Number.parseInt(dom.tempoSlider.value, 10);
  saveNumber(STORAGE_KEYS.tempo, state.tempo);
  renderState();
}

function handleKeyboard(event) {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
  if (isTyping || event.repeat) {
    return;
  }

  const pad = PAD_DEFINITIONS.find(candidate => event.key === candidate.key);
  if (pad) {
    event.preventDefault();
    playPad(pad.id);
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    toggleLoop();
  }
}

function flashPad(soundId) {
  const button = dom.padGrid.querySelector(`[data-sound="${soundId}"]`);
  if (!button) {
    return;
  }

  button.classList.remove("is-hot");
  void button.offsetWidth;
  button.classList.add("is-hot");
  window.setTimeout(() => {
    button.classList.remove("is-hot");
  }, 210);
}

function flashSequenceCell(soundId, step) {
  const cell = dom.sequenceGrid.querySelector(`[data-sound="${soundId}"][data-step="${step}"]`);
  if (!cell) {
    return;
  }

  cell.classList.remove("is-hit");
  void cell.offsetWidth;
  cell.classList.add("is-hit");
  window.setTimeout(() => {
    cell.classList.remove("is-hit");
  }, 180);
}

function pulseScope(soundId) {
  const pad = padsById.get(soundId);
  const bars = Array.from(dom.scope.querySelectorAll("span"));
  for (const [index, bar] of bars.entries()) {
    const phase = (index + pad.key.charCodeAt(0)) % 5;
    const level = 12 + ((phase + 1) * 9) + Math.floor(Math.random() * 28);
    bar.style.setProperty("--level", String(level));
  }

  dom.scope.classList.add("is-hot");
  if (state.visualTimer) {
    window.clearTimeout(state.visualTimer);
  }

  state.visualTimer = window.setTimeout(() => {
    dom.scope.classList.remove("is-hot");
    setScopeIdle();
  }, 180);
}

function setScopeIdle() {
  const bars = Array.from(dom.scope.querySelectorAll("span"));
  for (const [index, bar] of bars.entries()) {
    bar.style.setProperty("--level", String(8 + (index % 4) * 5));
  }
}

function setStatus(message) {
  dom.soundStatus.textContent = message;
}

function announce(message) {
  dom.liveRegion.textContent = "";
  window.setTimeout(() => {
    dom.liveRegion.textContent = message;
  }, 20);
}

function loadBoolean(key, fallback) {
  const storage = getStorage();
  if (!storage) {
    return fallback;
  }

  const value = storage.getItem(key);
  return value === null ? fallback : value === "true";
}

function saveBoolean(key, value) {
  const storage = getStorage();
  if (storage) {
    storage.setItem(key, value ? "true" : "false");
  }
}

function loadNumber(key, fallback, min, max) {
  const storage = getStorage();
  if (!storage) {
    return fallback;
  }

  const value = Number.parseInt(storage.getItem(key) || "", 10);
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function saveNumber(key, value) {
  const storage = getStorage();
  if (storage) {
    storage.setItem(key, String(value));
  }
}

function loadPattern() {
  const storage = getStorage();
  if (!storage) {
    return cloneDefaultPattern();
  }

  try {
    const rawPattern = JSON.parse(storage.getItem(STORAGE_KEYS.pattern) || "null");
    return normalizePattern(rawPattern);
  } catch {
    return cloneDefaultPattern();
  }
}

function savePattern() {
  const storage = getStorage();
  if (storage) {
    storage.setItem(STORAGE_KEYS.pattern, JSON.stringify(state.pattern));
  }
}

function normalizePattern(rawPattern) {
  const pattern = cloneDefaultPattern();
  if (!rawPattern || typeof rawPattern !== "object") {
    return pattern;
  }

  for (const soundId of SEQUENCE_LANES) {
    const lane = Array.isArray(rawPattern[soundId]) ? rawPattern[soundId] : [];
    pattern[soundId] = Array.from({ length: STEP_COUNT }, (_, index) => Boolean(lane[index]));
  }

  return pattern;
}

function cloneDefaultPattern() {
  const pattern = {};
  for (const soundId of SEQUENCE_LANES) {
    pattern[soundId] = [...DEFAULT_PATTERN[soundId]];
  }
  return pattern;
}

function getStorage() {
  try {
    const testKey = "fahhhSoundboard.storageTest";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

class SoundButtonAudio {
  constructor({ muted, sampleUrl }) {
    this.context = null;
    this.masterGain = null;
    this.muted = Boolean(muted);
    this.sampleUrl = sampleUrl;
    this.fahhhBuffer = null;
    this.fahhhBufferPromise = null;
    this.noiseBuffer = null;
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.masterGain && this.context) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.28, this.context.currentTime, 0.012);
    }
  }

  async unlock() {
    if (this.muted) {
      return false;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return false;
    }

    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.28;

      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 16;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.12;

      this.masterGain.connect(compressor);
      compressor.connect(this.context.destination);
      this.prepareFahhhSample();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    return this.context.state === "running";
  }

  async play(soundId) {
    if (!await this.unlock()) {
      return false;
    }

    const time = this.context.currentTime + 0.004;
    switch (soundId) {
      case "fahhh":
        await this.playFahhh(time);
        break;
      case "kick":
        this.playKick(time);
        break;
      case "hat":
        this.playHat(time);
        break;
      case "clap":
        this.playClap(time);
        break;
      case "bass":
        this.playBass(time);
        break;
      case "zap":
        this.playZap(time);
        break;
      case "blip":
        this.playBlip(time);
        break;
      case "crunch":
        this.playCrunch(time);
        break;
      default:
        return false;
    }

    return true;
  }

  prepareFahhhSample() {
    if (!this.sampleUrl || this.fahhhBuffer || this.fahhhBufferPromise || typeof fetch !== "function") {
      return;
    }

    this.fahhhBufferPromise = fetch(this.sampleUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error("Fahhh sample failed to load.");
        }
        return response.arrayBuffer();
      })
      .then(arrayBuffer => this.context.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        this.fahhhBuffer = audioBuffer;
        return audioBuffer;
      })
      .catch(() => null);
  }

  async playFahhh(time) {
    if (!this.fahhhBuffer && this.fahhhBufferPromise) {
      await Promise.race([
        this.fahhhBufferPromise,
        new Promise(resolve => window.setTimeout(resolve, 90))
      ]);
    }

    if (this.fahhhBuffer) {
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      source.buffer = this.fahhhBuffer;
      source.playbackRate.value = 1;
      gain.gain.value = 0.92;
      source.connect(gain);
      gain.connect(this.masterGain);
      source.start(time);
      return;
    }

    this.playFahhhFallback(time);
  }

  playFahhhFallback(time) {
    const breath = this.context.createBufferSource();
    const breathFilter = this.context.createBiquadFilter();
    const breathGain = this.context.createGain();
    breath.buffer = this.getNoiseBuffer();
    breathFilter.type = "highpass";
    breathFilter.frequency.value = 1100;
    breathGain.gain.setValueAtTime(0.0001, time);
    breathGain.gain.exponentialRampToValueAtTime(0.18, time + 0.018);
    breathGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
    breath.connect(breathFilter);
    breathFilter.connect(breathGain);
    breathGain.connect(this.masterGain);
    breath.start(time, 0, 0.22);

    const voice = this.context.createOscillator();
    const formant = this.context.createBiquadFilter();
    const voiceGain = this.context.createGain();
    voice.type = "sawtooth";
    voice.frequency.setValueAtTime(170, time + 0.04);
    voice.frequency.exponentialRampToValueAtTime(118, time + 0.58);
    formant.type = "bandpass";
    formant.frequency.value = 760;
    formant.Q.value = 1.1;
    voiceGain.gain.setValueAtTime(0.0001, time + 0.035);
    voiceGain.gain.exponentialRampToValueAtTime(0.22, time + 0.09);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.62);
    voice.connect(formant);
    formant.connect(voiceGain);
    voiceGain.connect(this.masterGain);
    voice.start(time + 0.04);
    voice.stop(time + 0.66);
  }

  playKick(time) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(150, time);
    oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.19);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.82, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(time);
    oscillator.stop(time + 0.26);
  }

  playHat(time) {
    this.playNoise({
      time,
      duration: 0.055,
      gain: 0.16,
      filterType: "highpass",
      frequency: 6800,
      q: 0.6
    });
  }

  playClap(time) {
    for (const offset of [0, 0.032, 0.064]) {
      this.playNoise({
        time: time + offset,
        duration: 0.07,
        gain: 0.13,
        filterType: "bandpass",
        frequency: 1450,
        q: 0.78
      });
    }
  }

  playBass(time) {
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(92, time);
    oscillator.frequency.exponentialRampToValueAtTime(58, time + 0.34);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(620, time);
    filter.frequency.exponentialRampToValueAtTime(180, time + 0.34);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.26, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.38);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(time);
    oscillator.stop(time + 0.4);
  }

  playZap(time) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(780, time);
    oscillator.frequency.exponentialRampToValueAtTime(120, time + 0.17);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.2, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.19);
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(time);
    oscillator.stop(time + 0.21);
  }

  playBlip(time) {
    this.playTone({ time, frequency: 440, duration: 0.08, gain: 0.14, type: "triangle" });
    this.playTone({ time: time + 0.065, frequency: 660, duration: 0.08, gain: 0.12, type: "triangle" });
    this.playTone({ time: time + 0.13, frequency: 990, duration: 0.08, gain: 0.1, type: "sine" });
  }

  playCrunch(time) {
    this.playNoise({
      time,
      duration: 0.18,
      gain: 0.18,
      filterType: "lowpass",
      frequency: 900,
      q: 1.5
    });
    this.playTone({ time, frequency: 86, duration: 0.16, gain: 0.18, type: "sawtooth" });
  }

  playTone({ time, frequency, duration, gain, type }) {
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(gain, time + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(envelope);
    envelope.connect(this.masterGain);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }

  playNoise({ time, duration, gain, filterType, frequency, q }) {
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    source.buffer = this.getNoiseBuffer();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(gain, time + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.masterGain);
    source.start(time, 0, duration + 0.02);
  }

  getNoiseBuffer() {
    if (this.noiseBuffer) {
      return this.noiseBuffer;
    }

    const frameCount = Math.max(1, Math.floor(this.context.sampleRate * 1));
    const buffer = this.context.createBuffer(1, frameCount, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }
}

audio = new SoundButtonAudio({
  muted: loadBoolean(STORAGE_KEYS.muted, false),
  sampleUrl: new URL("../../lock-pop/assets/miss-fahhh.mp3", import.meta.url).href
});

state = {
  muted: loadBoolean(STORAGE_KEYS.muted, false),
  tempo: loadNumber(STORAGE_KEYS.tempo, 100, 70, 150),
  pattern: loadPattern(),
  hitCount: 0,
  isLooping: false,
  currentStep: -1,
  loopTimer: 0,
  visualTimer: 0
};

renderPads();
renderSequence();
renderState();
setScopeIdle();

dom.muteButton.addEventListener("click", toggleMute);
dom.playLoopButton.addEventListener("click", toggleLoop);
dom.clearLoopButton.addEventListener("click", clearPattern);
dom.tempoSlider.addEventListener("input", updateTempo);
window.addEventListener("keydown", handleKeyboard);
window.addEventListener("pagehide", stopLoop);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopLoop();
  }
});
