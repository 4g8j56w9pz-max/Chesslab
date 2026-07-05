import {
  DEFAULT_ASSIGNMENTS,
  LASER_PRESET,
  PAD_SLOTS,
  SOUND_LIBRARY,
  soundFileStem,
  soundHeaderPath,
  soundWavPath
} from "./sound-library.js";

const STORAGE_KEYS = Object.freeze({
  muted: "fxSoundboard.muted.v1",
  assignments: "fxSoundboard.assignments.v1",
  category: "fxSoundboard.category.v1"
});

const dom = {
  padGrid: document.getElementById("pad-grid"),
  libraryGrid: document.getElementById("library-grid"),
  categoryFilter: document.getElementById("category-filter"),
  muteButton: document.getElementById("mute-button"),
  resetButton: document.getElementById("reset-board"),
  laserPresetButton: document.getElementById("laser-preset"),
  lastSound: document.getElementById("last-sound"),
  hitCount: document.getElementById("hit-count"),
  libraryCount: document.getElementById("library-count"),
  assignedCount: document.getElementById("assigned-count"),
  soundStatus: document.getElementById("sound-status"),
  liveRegion: document.getElementById("live-region"),
  scope: document.querySelector(".scope")
};

const soundsById = new Map(SOUND_LIBRARY.map(sound => [sound.id, sound]));
const categories = Array.from(new Set(SOUND_LIBRARY.map(sound => sound.category)));
let audio = null;
let state = null;

function renderCategoryFilter() {
  const fragment = document.createDocumentFragment();
  const allOption = document.createElement("option");
  allOption.value = "All";
  allOption.textContent = "All Sounds";
  fragment.append(allOption);

  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    fragment.append(option);
  }

  dom.categoryFilter.replaceChildren(fragment);
  dom.categoryFilter.value = categories.includes(state.category) ? state.category : "All";
}

function renderPads() {
  const fragment = document.createDocumentFragment();

  for (const [index, slot] of PAD_SLOTS.entries()) {
    const sound = getAssignedSound(index);
    const card = document.createElement("section");
    card.className = "pad-card";
    card.style.setProperty("--pad-color", sound.color);

    const trigger = document.createElement("button");
    trigger.className = "pad-trigger";
    trigger.type = "button";
    trigger.dataset.slot = String(index);
    trigger.setAttribute("aria-label", `Play ${sound.label}`);

    const key = document.createElement("span");
    key.className = "pad-key";
    key.textContent = slot.key;

    const title = document.createElement("strong");
    title.textContent = sound.label;

    const meta = document.createElement("small");
    meta.textContent = `${sound.category} / ${sound.tag}`;

    trigger.append(key, title, meta);
    trigger.addEventListener("click", () => {
      playSlot(index);
    });

    const selectLabel = document.createElement("label");
    selectLabel.className = "assignment-field";
    selectLabel.setAttribute("for", `${slot.id}-select`);

    const labelText = document.createElement("span");
    labelText.textContent = "Sound";

    const select = document.createElement("select");
    select.id = `${slot.id}-select`;
    select.className = "assignment-select";
    select.dataset.slot = String(index);
    select.setAttribute("aria-label", `Assign sound for button ${slot.key}`);
    appendSoundOptions(select, sound.id);
    select.addEventListener("change", event => {
      state.assignments[index] = event.target.value;
      saveAssignments();
      renderPads();
      renderState();
      const assigned = soundsById.get(event.target.value);
      setStatus(`${slot.key}: ${assigned.label}`);
    });

    selectLabel.append(labelText, select);
    card.append(trigger, selectLabel);
    fragment.append(card);
  }

  dom.padGrid.replaceChildren(fragment);
}

function renderLibrary() {
  const activeCategory = state.category;
  const visibleSounds = activeCategory === "All"
    ? SOUND_LIBRARY
    : SOUND_LIBRARY.filter(sound => sound.category === activeCategory);
  const fragment = document.createDocumentFragment();

  for (const sound of visibleSounds) {
    const card = document.createElement("section");
    card.className = "library-card";
    card.dataset.sound = sound.id;
    card.style.setProperty("--sound-color", sound.color);

    const button = document.createElement("button");
    button.className = "library-button";
    button.type = "button";
    button.dataset.sound = sound.id;

    const label = document.createElement("strong");
    label.textContent = sound.label;

    const meta = document.createElement("span");
    meta.textContent = `${sound.category} / ${sound.tag}`;

    button.append(label, meta);
    button.addEventListener("click", () => {
      playSound(sound.id);
    });

    const downloads = document.createElement("div");
    downloads.className = "library-downloads";

    const wavLink = createDownloadLink("WAV", soundWavPath(sound.id), `${soundFileStem(sound.id)}.wav`);
    const headerLink = createDownloadLink("Header", soundHeaderPath(sound.id), `${soundFileStem(sound.id)}_wav.h`);
    downloads.append(wavLink, headerLink);

    card.append(button, downloads);
    fragment.append(card);
  }

  dom.libraryGrid.replaceChildren(fragment);
}

function createDownloadLink(label, href, filename) {
  const link = document.createElement("a");
  link.className = "download-link";
  link.href = href;
  link.download = filename;
  link.textContent = label;
  link.addEventListener("click", event => {
    event.stopPropagation();
  });
  return link;
}

function renderState() {
  dom.muteButton.textContent = state.muted ? "Sound is off" : "Sound is on";
  dom.muteButton.setAttribute("aria-pressed", state.muted ? "true" : "false");
  dom.hitCount.textContent = String(state.hitCount);
  dom.libraryCount.textContent = String(SOUND_LIBRARY.length);
  dom.assignedCount.textContent = String(state.assignments.filter(soundId => soundsById.has(soundId)).length);
}

function appendSoundOptions(select, selectedId) {
  for (const category of categories) {
    const group = document.createElement("optgroup");
    group.label = category;

    for (const sound of SOUND_LIBRARY.filter(candidate => candidate.category === category)) {
      const option = document.createElement("option");
      option.value = sound.id;
      option.textContent = sound.label;
      option.selected = sound.id === selectedId;
      group.append(option);
    }

    select.append(group);
  }
}

function getAssignedSound(index) {
  const soundId = state.assignments[index] ?? DEFAULT_ASSIGNMENTS[index] ?? SOUND_LIBRARY[0].id;
  return soundsById.get(soundId) ?? SOUND_LIBRARY[0];
}

async function playSlot(index) {
  const sound = getAssignedSound(index);
  playSound(sound.id, { slotIndex: index });
}

function playSound(soundId, options = {}) {
  const sound = soundsById.get(soundId);
  if (!sound) {
    return;
  }

  const requestId = state.audioRequestId + 1;
  state.audioRequestId = requestId;
  state.hitCount += 1;
  dom.lastSound.textContent = sound.label;
  setStatus(sound.label);
  announce(`${sound.label}.`);
  flashSound(sound.id, options.slotIndex);
  pulseScope(sound);
  renderState();

  audio.play(sound.id)
    .then(played => {
      if (!played && state.audioRequestId === requestId) {
        setStatus("Silent");
      }
    })
    .catch(() => {
      if (state.audioRequestId === requestId) {
        setStatus("Silent");
      }
    });
}

function toggleMute() {
  state.muted = !state.muted;
  audio.setMuted(state.muted);
  saveBoolean(STORAGE_KEYS.muted, state.muted);
  setStatus(state.muted ? "Muted" : "Ready");
  renderState();
}

function applyLaserPreset() {
  state.assignments = [...LASER_PRESET];
  saveAssignments();
  renderPads();
  renderState();
  setStatus("Laser Set");
}

function resetBoard() {
  state.assignments = [...DEFAULT_ASSIGNMENTS];
  saveAssignments();
  renderPads();
  renderState();
  setStatus("Reset");
}

function updateCategory() {
  state.category = dom.categoryFilter.value;
  saveString(STORAGE_KEYS.category, state.category);
  renderLibrary();
}

function handleKeyboard(event) {
  const target = event.target;
  const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
  if (isTyping || event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  const key = event.key.toUpperCase();
  const slotIndex = PAD_SLOTS.findIndex(slot => slot.key === key);
  if (slotIndex !== -1) {
    event.preventDefault();
    playSlot(slotIndex);
  }
}

function flashSound(soundId, slotIndex) {
  const padSelector = slotIndex === undefined ? `[data-sound="${soundId}"]` : `[data-slot="${slotIndex}"]`;
  const elements = [
    ...dom.padGrid.querySelectorAll(padSelector),
    ...dom.libraryGrid.querySelectorAll(`[data-sound="${soundId}"]`)
  ];

  for (const element of elements) {
    element.classList.remove("is-hot");
    void element.offsetWidth;
    element.classList.add("is-hot");
    window.setTimeout(() => {
      element.classList.remove("is-hot");
    }, 210);
  }
}

function pulseScope(sound) {
  const bars = Array.from(dom.scope.querySelectorAll("span"));
  const seed = sound.id.split("").reduce((total, letter) => total + letter.charCodeAt(0), 0);
  for (const [index, bar] of bars.entries()) {
    const phase = (index + seed) % 7;
    const level = 14 + (phase * 7) + Math.floor(Math.random() * 34);
    bar.style.setProperty("--level", String(level));
    bar.style.setProperty("--bar-color", index % 2 === 0 ? sound.color : "#fff8ed");
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
    bar.style.setProperty("--level", String(8 + (index % 5) * 4));
    bar.style.setProperty("--bar-color", index % 3 === 0 ? "#26c6da" : "#ffd166");
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

function loadString(key, fallback) {
  const storage = getStorage();
  if (!storage) {
    return fallback;
  }

  return storage.getItem(key) || fallback;
}

function saveString(key, value) {
  const storage = getStorage();
  if (storage) {
    storage.setItem(key, value);
  }
}

function loadAssignments() {
  const storage = getStorage();
  if (!storage) {
    return [...DEFAULT_ASSIGNMENTS];
  }

  try {
    const rawAssignments = JSON.parse(storage.getItem(STORAGE_KEYS.assignments) || "null");
    if (!Array.isArray(rawAssignments)) {
      return [...DEFAULT_ASSIGNMENTS];
    }

    return PAD_SLOTS.map((_, index) => {
      const candidate = rawAssignments[index];
      return soundsById.has(candidate) ? candidate : DEFAULT_ASSIGNMENTS[index];
    });
  } catch {
    return [...DEFAULT_ASSIGNMENTS];
  }
}

function saveAssignments() {
  const storage = getStorage();
  if (storage) {
    storage.setItem(STORAGE_KEYS.assignments, JSON.stringify(state.assignments));
  }
}

function getStorage() {
  try {
    const testKey = "fxSoundboard.storageTest";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

class SoundButtonAudio {
  constructor({ muted, sampleUrl, fileUrls }) {
    this.context = null;
    this.masterGain = null;
    this.muted = Boolean(muted);
    this.sampleUrl = sampleUrl;
    this.fileUrls = fileUrls;
    this.activePlayers = new Set();
    this.fahhhBuffer = null;
    this.fahhhBufferPromise = null;
    this.noiseBuffer = null;
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (this.muted) {
      this.stopFilePlayers();
    }

    if (this.masterGain && this.context) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.32, this.context.currentTime, 0.012);
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
      this.masterGain.gain.value = this.muted ? 0 : 0.32;

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
      await Promise.race([
        this.context.resume(),
        new Promise(resolve => window.setTimeout(resolve, 250))
      ]);
    }

    return this.context.state === "running";
  }

  async play(soundId) {
    if (await this.playFile(soundId)) {
      return true;
    }

    if (!await this.unlock()) {
      return false;
    }

    const time = this.context.currentTime + 0.004;
    switch (soundId) {
      case "fahhh":
        await this.playFahhh(time);
        break;
      case "laser-shot":
        this.playLaserShot(time);
        break;
      case "laser-burst":
        this.playLaserBurst(time);
        break;
      case "charge-shot":
        this.playChargeShot(time);
        break;
      case "ricochet":
        this.playRicochet(time);
        break;
      case "target-lock":
        this.playTargetLock(time);
        break;
      case "tag-confirm":
        this.playTagConfirm(time);
        break;
      case "shield-ping":
        this.playShieldPing(time);
        break;
      case "shield-crack":
        this.playShieldCrack(time);
        break;
      case "shield-recharge":
        this.playShieldRecharge(time);
        break;
      case "base-alarm":
        this.playBaseAlarm(time);
        break;
      case "round-start":
        this.playRoundStart(time);
        break;
      case "round-end":
        this.playRoundEnd(time);
        break;
      case "scanner-ping":
        this.playScannerPing(time);
        break;
      case "stealth-blip":
        this.playStealthBlip(time);
        break;
      case "air-horn":
        this.playAirHorn(time);
        break;
      case "dj-scratch":
        this.playDjScratch(time);
        break;
      case "bass-drop":
        this.playBassDrop(time);
        break;
      case "record-stop":
        this.playRecordStop(time);
        break;
      case "crowd-hey":
        this.playCrowdHey(time);
        break;
      case "hype-hit":
        this.playHypeHit(time);
        break;
      case "drama-hit":
        this.playDramaHit(time);
        break;
      case "vinyl-beep":
        this.playVinylBeep(time);
        break;
      case "coin-pickup":
        this.playCoinPickup(time);
        break;
      case "power-up":
        this.playPowerUp(time);
        break;
      case "one-up":
        this.playOneUp(time);
        break;
      case "level-clear":
        this.playLevelClear(time);
        break;
      case "glitch-burst":
        this.playGlitchBurst(time);
        break;
      case "jump":
        this.playJump(time);
        break;
      case "bonus-tally":
        this.playBonusTally(time);
        break;
      case "game-over":
        this.playGameOver(time);
        break;
      case "button-blip":
        this.playButtonBlip(time);
        break;
      case "score-tick":
        this.playScoreTick(time);
        break;
      case "success-chime":
        this.playSuccessChime(time);
        break;
      case "error-buzzer":
        this.playErrorBuzzer(time);
        break;
      case "countdown-beep":
        this.playCountdownBeep(time);
        break;
      case "warning-siren":
        this.playWarningSiren(time);
        break;
      case "menu-open":
        this.playMenuOpen(time);
        break;
      case "power-down":
        this.playPowerDown(time);
        break;
      default:
        return false;
    }

    return true;
  }

  async playFile(soundId) {
    if (this.muted || !this.fileUrls?.has(soundId) || typeof Audio === "undefined") {
      return false;
    }

    const player = new Audio(this.fileUrls.get(soundId));
    player.preload = "auto";
    player.playsInline = true;
    player.volume = 1;

    const cleanup = () => {
      this.activePlayers.delete(player);
    };

    player.addEventListener("ended", cleanup, { once: true });
    player.addEventListener("error", cleanup, { once: true });
    this.activePlayers.add(player);

    try {
      const playback = player.play();
      if (playback && typeof playback.then === "function") {
        await playback;
      }
      return true;
    } catch {
      cleanup();
      return false;
    }
  }

  stopFilePlayers() {
    for (const player of this.activePlayers) {
      player.pause();
      player.currentTime = 0;
    }
    this.activePlayers.clear();
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
    this.playNoise({
      time,
      duration: 0.22,
      gain: 0.17,
      filterType: "highpass",
      frequency: 1100,
      q: 0.8
    });
    this.playTone({
      time: time + 0.04,
      frequency: 170,
      endFrequency: 118,
      duration: 0.62,
      gain: 0.2,
      type: "sawtooth",
      filterFrequency: 760,
      filterQ: 1.1
    });
  }

  playLaserShot(time) {
    this.playTone({ time, frequency: 1180, endFrequency: 170, duration: 0.18, gain: 0.22, type: "square" });
    this.playNoise({ time, duration: 0.06, gain: 0.08, filterType: "highpass", frequency: 4000, q: 0.6 });
  }

  playLaserBurst(time) {
    for (const offset of [0, 0.085, 0.17]) {
      this.playLaserShot(time + offset);
    }
  }

  playChargeShot(time) {
    this.playTone({ time, frequency: 180, endFrequency: 1220, duration: 0.34, gain: 0.11, type: "triangle" });
    this.playTone({ time: time + 0.31, frequency: 980, endFrequency: 120, duration: 0.2, gain: 0.26, type: "square" });
    this.playNoise({ time: time + 0.31, duration: 0.08, gain: 0.12, filterType: "bandpass", frequency: 2100, q: 1.2 });
  }

  playRicochet(time) {
    for (const [index, frequency] of [1600, 1180, 860].entries()) {
      this.playTone({
        time: time + index * 0.075,
        frequency,
        endFrequency: frequency * 0.62,
        duration: 0.09,
        gain: 0.13 - index * 0.025,
        type: "sine"
      });
    }
  }

  playTargetLock(time) {
    for (const [index, frequency] of [480, 620, 780].entries()) {
      this.playTone({
        time: time + index * 0.105,
        frequency,
        duration: 0.055,
        gain: 0.14,
        type: "triangle"
      });
    }
  }

  playTagConfirm(time) {
    this.playTone({ time, frequency: 523.25, duration: 0.08, gain: 0.13, type: "sine" });
    this.playTone({ time: time + 0.075, frequency: 659.25, duration: 0.08, gain: 0.13, type: "sine" });
    this.playTone({ time: time + 0.15, frequency: 783.99, duration: 0.12, gain: 0.15, type: "sine" });
    this.playNoise({ time: time + 0.15, duration: 0.05, gain: 0.05, filterType: "highpass", frequency: 5000, q: 0.5 });
  }

  playShieldPing(time) {
    this.playTone({ time, frequency: 740, duration: 0.25, gain: 0.11, type: "sine" });
    this.playTone({ time, frequency: 1480, duration: 0.18, gain: 0.06, type: "sine" });
  }

  playShieldCrack(time) {
    this.playNoise({ time, duration: 0.18, gain: 0.18, filterType: "bandpass", frequency: 1700, q: 1.8 });
    this.playTone({ time: time + 0.02, frequency: 96, endFrequency: 58, duration: 0.2, gain: 0.22, type: "sawtooth" });
  }

  playShieldRecharge(time) {
    for (const [index, frequency] of [260, 330, 440, 660, 880].entries()) {
      this.playTone({
        time: time + index * 0.055,
        frequency,
        duration: 0.1,
        gain: 0.09 + index * 0.01,
        type: "triangle"
      });
    }
  }

  playBaseAlarm(time) {
    for (const [index, frequency] of [260, 180, 260, 180].entries()) {
      this.playTone({
        time: time + index * 0.16,
        frequency,
        duration: 0.12,
        gain: 0.16,
        type: "square"
      });
    }
  }

  playRoundStart(time) {
    this.playTone({ time, frequency: 220, endFrequency: 330, duration: 0.18, gain: 0.13, type: "sawtooth" });
    this.playTone({ time: time + 0.16, frequency: 330, endFrequency: 494, duration: 0.18, gain: 0.15, type: "sawtooth" });
    this.playTone({ time: time + 0.32, frequency: 494, duration: 0.22, gain: 0.18, type: "sawtooth" });
  }

  playRoundEnd(time) {
    this.playTone({ time, frequency: 660, endFrequency: 440, duration: 0.18, gain: 0.14, type: "triangle" });
    this.playTone({ time: time + 0.16, frequency: 440, endFrequency: 294, duration: 0.2, gain: 0.13, type: "triangle" });
    this.playTone({ time: time + 0.34, frequency: 247, duration: 0.28, gain: 0.14, type: "sine" });
  }

  playScannerPing(time) {
    this.playTone({ time, frequency: 520, endFrequency: 1200, duration: 0.42, gain: 0.08, type: "sine" });
    this.playNoise({ time, duration: 0.34, gain: 0.05, filterType: "bandpass", frequency: 2400, q: 2.2 });
  }

  playStealthBlip(time) {
    this.playTone({ time, frequency: 360, duration: 0.05, gain: 0.07, type: "sine" });
    this.playTone({ time: time + 0.065, frequency: 540, duration: 0.05, gain: 0.06, type: "sine" });
  }

  playAirHorn(time) {
    for (const frequency of [233, 277]) {
      this.playTone({ time, frequency, endFrequency: frequency * 0.9, duration: 0.48, gain: 0.15, type: "sawtooth" });
    }
    this.playNoise({ time, duration: 0.45, gain: 0.04, filterType: "bandpass", frequency: 950, q: 1.1 });
  }

  playDjScratch(time) {
    for (const [index, frequency] of [700, 240, 880, 300].entries()) {
      this.playTone({
        time: time + index * 0.055,
        frequency,
        endFrequency: index % 2 === 0 ? frequency * 0.45 : frequency * 2.2,
        duration: 0.075,
        gain: 0.11,
        type: "sawtooth"
      });
    }
    this.playNoise({ time, duration: 0.28, gain: 0.08, filterType: "bandpass", frequency: 1700, q: 2.4 });
  }

  playBassDrop(time) {
    this.playNoise({ time, duration: 0.22, gain: 0.08, filterType: "highpass", frequency: 2400, q: 0.7 });
    this.playTone({ time: time + 0.08, frequency: 130, endFrequency: 36, duration: 0.68, gain: 0.26, type: "sine" });
  }

  playRecordStop(time) {
    this.playTone({ time, frequency: 720, endFrequency: 45, duration: 0.64, gain: 0.16, type: "sawtooth" });
    this.playNoise({ time, duration: 0.18, gain: 0.04, filterType: "highpass", frequency: 3200, q: 0.6 });
  }

  playCrowdHey(time) {
    for (const frequency of [180, 230, 290]) {
      this.playTone({ time, frequency, endFrequency: frequency * 0.92, duration: 0.26, gain: 0.08, type: "sawtooth", filterFrequency: 900, filterQ: 0.9 });
    }
    this.playNoise({ time, duration: 0.24, gain: 0.09, filterType: "bandpass", frequency: 1150, q: 1.3 });
  }

  playHypeHit(time) {
    this.playTone({ time, frequency: 160, endFrequency: 84, duration: 0.26, gain: 0.23, type: "sine" });
    this.playTone({ time, frequency: 440, duration: 0.12, gain: 0.11, type: "square" });
    this.playNoise({ time, duration: 0.18, gain: 0.14, filterType: "lowpass", frequency: 1300, q: 1.1 });
  }

  playDramaHit(time) {
    this.playTone({ time, frequency: 92, endFrequency: 45, duration: 0.48, gain: 0.3, type: "sine" });
    this.playNoise({ time, duration: 0.34, gain: 0.18, filterType: "lowpass", frequency: 750, q: 1.8 });
  }

  playVinylBeep(time) {
    this.playTone({ time, frequency: 880, duration: 0.07, gain: 0.1, type: "sine" });
    this.playTone({ time: time + 0.09, frequency: 1174.66, duration: 0.08, gain: 0.1, type: "sine" });
  }

  playCoinPickup(time) {
    this.playTone({ time, frequency: 988, duration: 0.08, gain: 0.1, type: "square" });
    this.playTone({ time: time + 0.075, frequency: 1318.51, duration: 0.12, gain: 0.12, type: "square" });
  }

  playPowerUp(time) {
    for (const [index, frequency] of [220, 277, 330, 440, 554, 660].entries()) {
      this.playTone({ time: time + index * 0.052, frequency, duration: 0.09, gain: 0.09, type: "triangle" });
    }
  }

  playOneUp(time) {
    for (const [index, frequency] of [523.25, 659.25, 783.99, 1046.5].entries()) {
      this.playTone({ time: time + index * 0.08, frequency, duration: 0.1, gain: 0.1, type: "square" });
    }
  }

  playLevelClear(time) {
    for (const [index, frequency] of [392, 523.25, 659.25, 783.99, 1046.5].entries()) {
      this.playTone({ time: time + index * 0.08, frequency, duration: 0.13, gain: 0.11, type: "triangle" });
    }
  }

  playGlitchBurst(time) {
    for (let index = 0; index < 8; index += 1) {
      const frequency = 180 + Math.random() * 1800;
      this.playTone({
        time: time + index * 0.025,
        frequency,
        endFrequency: frequency * (0.6 + Math.random() * 1.5),
        duration: 0.045,
        gain: 0.08,
        type: index % 2 === 0 ? "square" : "sawtooth"
      });
    }
  }

  playJump(time) {
    this.playTone({ time, frequency: 240, endFrequency: 720, duration: 0.18, gain: 0.12, type: "square" });
  }

  playBonusTally(time) {
    for (let index = 0; index < 6; index += 1) {
      this.playTone({ time: time + index * 0.055, frequency: 780 + index * 70, duration: 0.045, gain: 0.08, type: "triangle" });
    }
  }

  playGameOver(time) {
    for (const [index, frequency] of [392, 349.23, 293.66, 196].entries()) {
      this.playTone({ time: time + index * 0.13, frequency, duration: 0.16, gain: 0.12, type: "triangle" });
    }
  }

  playButtonBlip(time) {
    this.playTone({ time, frequency: 660, duration: 0.055, gain: 0.08, type: "sine" });
  }

  playScoreTick(time) {
    this.playTone({ time, frequency: 1046.5, duration: 0.04, gain: 0.07, type: "triangle" });
  }

  playSuccessChime(time) {
    this.playTone({ time, frequency: 523.25, duration: 0.12, gain: 0.09, type: "sine" });
    this.playTone({ time: time + 0.1, frequency: 659.25, duration: 0.12, gain: 0.09, type: "sine" });
    this.playTone({ time: time + 0.2, frequency: 783.99, duration: 0.16, gain: 0.1, type: "sine" });
  }

  playErrorBuzzer(time) {
    this.playTone({ time, frequency: 180, duration: 0.16, gain: 0.14, type: "square" });
    this.playTone({ time: time + 0.17, frequency: 150, duration: 0.16, gain: 0.13, type: "square" });
  }

  playCountdownBeep(time) {
    this.playTone({ time, frequency: 880, duration: 0.11, gain: 0.11, type: "sine" });
  }

  playWarningSiren(time) {
    for (const [index, frequency] of [520, 320, 520, 320, 520].entries()) {
      this.playTone({ time: time + index * 0.12, frequency, duration: 0.11, gain: 0.11, type: "sawtooth" });
    }
  }

  playMenuOpen(time) {
    this.playTone({ time, frequency: 360, endFrequency: 720, duration: 0.18, gain: 0.08, type: "triangle" });
    this.playTone({ time: time + 0.12, frequency: 960, duration: 0.07, gain: 0.06, type: "sine" });
  }

  playPowerDown(time) {
    this.playTone({ time, frequency: 420, endFrequency: 80, duration: 0.48, gain: 0.13, type: "triangle" });
  }

  playTone({ time, frequency, endFrequency, duration, gain, type, filterFrequency, filterQ }) {
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    let output = envelope;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), time + duration);
    }

    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    oscillator.connect(envelope);
    if (filterFrequency) {
      const filter = this.context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = filterFrequency;
      filter.Q.value = filterQ ?? 1;
      envelope.connect(filter);
      output = filter;
    }

    output.connect(this.masterGain);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
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
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + 0.008);
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
  fileUrls: new Map(SOUND_LIBRARY.map(sound => [sound.id, soundWavPath(sound.id)])),
  sampleUrl: new URL("../../lock-pop/assets/miss-fahhh.mp3", import.meta.url).href
});

state = {
  muted: loadBoolean(STORAGE_KEYS.muted, false),
  assignments: loadAssignments(),
  category: loadString(STORAGE_KEYS.category, "All"),
  hitCount: 0,
  audioRequestId: 0,
  visualTimer: 0
};

renderCategoryFilter();
renderPads();
renderLibrary();
renderState();
setScopeIdle();

dom.muteButton.addEventListener("click", toggleMute);
dom.resetButton.addEventListener("click", resetBoard);
dom.laserPresetButton.addEventListener("click", applyLaserPreset);
dom.categoryFilter.addEventListener("change", updateCategory);
window.addEventListener("keydown", handleKeyboard);
