const CAPACITY = 4;
const MIN_LEVEL = 1;
const GENERATED_LEVEL_COUNT = 100;
const STORAGE_KEY = "midnightWaterSort.progress.v1";
const PLAYER_NAME_KEY = "midnightWaterSort.displayName";
const LEADERBOARD_KEY = "midnightWaterSort.leaderboard.v1";
const MAX_UNDO_STATES = 40;
const MAX_LEADERBOARD_ENTRIES = 20;
const GLOBAL_LEADERBOARD_FETCH_LIMIT = 50;
const ANIMATION_MS = 320;
const DEFAULT_PLAYER_NAME = "Sorter";

const palette = [
  { name: "Cherry", color: "#DE3341", shine: "#ff8a94", glow: "rgba(222, 51, 65, 0.46)" },
  { name: "Gold", color: "#f2b84b", shine: "#ffe08a", glow: "rgba(242, 184, 75, 0.42)" },
  { name: "Aqua", color: "#26a69a", shine: "#93fff2", glow: "rgba(38, 166, 154, 0.42)" },
  { name: "Blue", color: "#3b82f6", shine: "#9cc3ff", glow: "rgba(59, 130, 246, 0.42)" },
  { name: "Grape", color: "#8b5cf6", shine: "#c8b5ff", glow: "rgba(139, 92, 246, 0.42)" },
  { name: "Lime", color: "#84cc16", shine: "#cbff68", glow: "rgba(132, 204, 22, 0.38)" },
  { name: "Orange", color: "#f97316", shine: "#ffba6a", glow: "rgba(249, 115, 22, 0.42)" },
  { name: "Pink", color: "#ec4899", shine: "#ff9fd0", glow: "rgba(236, 72, 153, 0.42)" },
  { name: "Mint", color: "#10b981", shine: "#8dffd8", glow: "rgba(16, 185, 129, 0.38)" },
  { name: "Violet", color: "#6366f1", shine: "#aaaaff", glow: "rgba(99, 102, 241, 0.42)" },
  { name: "Sky", color: "#0ea5e9", shine: "#8bdcff", glow: "rgba(14, 165, 233, 0.42)" },
  { name: "Rose", color: "#fb7185", shine: "#ffc0ca", glow: "rgba(251, 113, 133, 0.42)" }
];

const elements = {
  levelNumber: document.getElementById("level-number"),
  moveCount: document.getElementById("move-count"),
  statusLabel: document.getElementById("status-label"),
  message: document.getElementById("game-message"),
  tubes: document.getElementById("tubes"),
  undoButton: document.getElementById("undo-button"),
  restartButton: document.getElementById("restart-button"),
  nextButton: document.getElementById("next-button"),
  playerName: document.getElementById("water-player-name"),
  leaderboardScope: document.getElementById("water-leaderboard-scope"),
  leaderboardStatus: document.getElementById("water-leaderboard-status"),
  leaderboardList: document.getElementById("water-leaderboard"),
  leaderboardPending: document.getElementById("water-score-confirmation"),
  leaderboardPendingText: document.getElementById("water-score-confirmation-detail"),
  submitLeaderboardButton: document.getElementById("water-submit-score"),
  skipLeaderboardButton: document.getElementById("water-skip-score"),
  refreshLeaderboardButton: document.getElementById("water-refresh-leaderboard"),
  clearLeaderboardButton: document.getElementById("water-clear-leaderboard")
};

const leaderboardConfig = getWaterGlobalLeaderboardConfig();

const state = {
  level: MIN_LEVEL,
  moves: 0,
  tubes: [],
  selectedTube: null,
  undoStack: [],
  won: false,
  message: "Select a tube.",
  animation: null,
  isAnimating: false,
  leaderboardMessage: getInitialLeaderboardMessage(),
  leaderboardScope: getInitialLeaderboardScope(),
  leaderboard: loadLeaderboard(),
  pendingLeaderboardEntry: null,
  levelRunId: createLeaderboardEntryId(),
  levelLogged: false
};

function cloneTubes(tubes) {
  return tubes.map(tube => tube.slice());
}

function topColor(tube) {
  return tube.length ? tube[tube.length - 1] : null;
}

function capacityLeft(tube) {
  return CAPACITY - tube.length;
}

function getTopGroupSize(tube) {
  if (tube.length === 0) {
    return 0;
  }

  const color = topColor(tube);
  let count = 0;

  for (let index = tube.length - 1; index >= 0 && tube[index] === color; index -= 1) {
    count += 1;
  }

  return count;
}

function canPour(fromIndex, toIndex, tubes = state.tubes) {
  if (fromIndex === toIndex) {
    return false;
  }

  const source = tubes[fromIndex];
  const destination = tubes[toIndex];

  if (!source || !destination || source.length === 0 || destination.length >= CAPACITY) {
    return false;
  }

  return destination.length === 0 || topColor(destination) === topColor(source);
}

function getPourAmount(fromIndex, toIndex) {
  const source = state.tubes[fromIndex];
  const destination = state.tubes[toIndex];
  return Math.min(getTopGroupSize(source), capacityLeft(destination));
}

function checkWin(tubes = state.tubes) {
  return tubes.every(tube => {
    if (tube.length === 0) {
      return true;
    }

    return tube.length === CAPACITY && tube.every(color => color === tube[0]);
  });
}

function pushUndoState() {
  state.undoStack.push({
    tubes: cloneTubes(state.tubes),
    moves: state.moves,
    won: state.won
  });

  if (state.undoStack.length > MAX_UNDO_STATES) {
    state.undoStack.shift();
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      level: state.level,
      moves: state.moves,
      tubes: state.tubes,
      won: state.won
    }));
  } catch (error) {
    // Storage can be unavailable in private browsing; the game should still play.
  }
}

function loadProgress() {
  try {
    const rawSave = localStorage.getItem(STORAGE_KEY);
    if (!rawSave) {
      return false;
    }

    const saved = JSON.parse(rawSave);
    if (!isValidSave(saved)) {
      return false;
    }

    state.level = Math.max(MIN_LEVEL, Math.floor(saved.level));
    state.moves = Math.max(0, Math.floor(saved.moves));
    state.tubes = cloneTubes(saved.tubes);
    state.selectedTube = null;
    state.undoStack = [];
    state.won = Boolean(saved.won) || checkWin(state.tubes);
    state.message = state.won ? "Level clear." : "Progress restored.";
    state.pendingLeaderboardEntry = null;
    state.levelRunId = createLeaderboardEntryId();
    state.levelLogged = state.won;
    return true;
  } catch (error) {
    return false;
  }
}

function getWaterGlobalLeaderboardConfig() {
  const rawConfig = window.MPM_LEADERBOARD_CONFIG || {};
  const supabaseUrl = String(rawConfig.supabaseUrl || "").replace(/\/+$/, "");
  const supabaseAnonKey = String(rawConfig.supabaseAnonKey || "");
  const requestedTable = String(
    rawConfig.waterSortTableName ||
    rawConfig.waterLeaderboardTableName ||
    "water_sort_leaderboard"
  );
  const tableName = /^[a-zA-Z0-9_]+$/.test(requestedTable)
    ? requestedTable
    : "water_sort_leaderboard";

  return {
    enabled: Boolean(supabaseUrl && supabaseAnonKey),
    supabaseUrl,
    supabaseAnonKey,
    tableName
  };
}

function getInitialLeaderboardMessage() {
  return leaderboardConfig.enabled
    ? "Global Water Sort clears load here. Finished levels wait for confirmation."
    : "Finished levels wait for confirmation on this device.";
}

function getInitialLeaderboardScope() {
  return leaderboardConfig.enabled
    ? "Global leaderboard"
    : "Local device only";
}

function loadPlayerName() {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) || DEFAULT_PLAYER_NAME;
  } catch (error) {
    return DEFAULT_PLAYER_NAME;
  }
}

function savePlayerName(name) {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch (error) {
    // Display names are optional and should not block play.
  }
}

function getPlayerName() {
  const value = elements.playerName.value.trim().slice(0, 18);
  return value || DEFAULT_PLAYER_NAME;
}

function loadLeaderboard() {
  try {
    const rawEntries = localStorage.getItem(LEADERBOARD_KEY);
    const entries = rawEntries ? JSON.parse(rawEntries) : [];

    if (!Array.isArray(entries)) {
      return [];
    }

    return entries
      .map(normalizeLeaderboardEntry)
      .filter(Boolean)
      .sort(compareLeaderboardEntries)
      .slice(0, MAX_LEADERBOARD_ENTRIES);
  } catch (error) {
    return [];
  }
}

function normalizeLeaderboardEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const name = String(entry.name || DEFAULT_PLAYER_NAME).trim().slice(0, 18);
  const level = Math.floor(Number(entry.level) || 0);
  const moves = Math.floor(Number(entry.moves) || 0);

  if (!name || level < MIN_LEVEL || moves <= 0) {
    return null;
  }

  return {
    id: String(entry.id || createLeaderboardEntryId()),
    name,
    level,
    moves,
    loggedAt: entry.loggedAt || entry.created_at || new Date().toISOString()
  };
}

function saveLeaderboard(entries) {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
    return true;
  } catch (error) {
    state.leaderboardMessage = "Leaderboard could not be saved in this browser.";
    return false;
  }
}

function stageCompletedLevel(shouldRender = true) {
  if (state.levelLogged || state.pendingLeaderboardEntry || !state.won || state.moves <= 0) {
    return;
  }

  state.pendingLeaderboardEntry = createLeaderboardEntry();
  state.leaderboardMessage = "Level clear. Edit the display name, then submit or skip.";

  if (shouldRender) {
    renderLeaderboard();
  }
}

function submitPendingScore(shouldRender = true) {
  if (!state.pendingLeaderboardEntry || state.levelLogged) {
    return;
  }

  const entry = {
    ...state.pendingLeaderboardEntry,
    name: getPlayerName()
  };
  const localLeaderboard = upsertLeaderboardEntry(loadLeaderboard(), entry);

  if (saveLeaderboard(localLeaderboard)) {
    state.levelLogged = true;
    state.pendingLeaderboardEntry = null;
    savePlayerName(entry.name);

    if (leaderboardConfig.enabled) {
      state.leaderboard = localLeaderboard;
      state.leaderboardScope = "Local pending sync";
      state.leaderboardMessage = `Clear saved locally. Sending ${entry.name}'s score online...`;
    } else {
      state.leaderboard = localLeaderboard;
      state.leaderboardMessage = `Clear submitted for ${entry.name}.`;
    }
  } else {
    state.levelLogged = true;
    state.pendingLeaderboardEntry = null;
  }

  if (shouldRender) {
    renderLeaderboard();
  }

  if (leaderboardConfig.enabled) {
    submitGlobalLeaderboardEntry(entry);
  }
}

function skipPendingScore() {
  if (!state.pendingLeaderboardEntry) {
    return;
  }

  state.pendingLeaderboardEntry = null;
  state.levelLogged = true;
  state.leaderboardMessage = "Clear skipped.";
  renderLeaderboard();
}

function createLeaderboardEntry() {
  return {
    id: state.levelRunId,
    name: getPlayerName(),
    level: state.level,
    moves: state.moves,
    loggedAt: new Date().toISOString()
  };
}

function upsertLeaderboardEntry(entries, entry) {
  const nextEntries = entries.slice();
  const existingIndex = nextEntries.findIndex(item => item.id === entry.id);

  if (existingIndex >= 0) {
    nextEntries[existingIndex] = entry;
  } else {
    nextEntries.push(entry);
  }

  return nextEntries
    .sort(compareLeaderboardEntries)
    .slice(0, MAX_LEADERBOARD_ENTRIES);
}

function getGlobalLeaderboardUrl(queryString = "") {
  return `${leaderboardConfig.supabaseUrl}/rest/v1/${leaderboardConfig.tableName}${queryString}`;
}

function getGlobalLeaderboardHeaders() {
  return {
    apikey: leaderboardConfig.supabaseAnonKey,
    Authorization: `Bearer ${leaderboardConfig.supabaseAnonKey}`
  };
}

async function refreshGlobalLeaderboard(successMessage = "Global Water Sort leaderboard loaded.") {
  if (!leaderboardConfig.enabled) {
    state.leaderboard = loadLeaderboard();
    state.leaderboardScope = "Local device only";
    state.leaderboardMessage = "Local Water Sort leaderboard loaded.";
    renderLeaderboard();
    return;
  }

  state.leaderboardScope = "Global leaderboard";
  state.leaderboardMessage = "Loading global Water Sort leaderboard...";
  renderLeaderboard();

  const query = `?select=name,level,moves,created_at&order=level.desc,moves.asc,created_at.desc&limit=${GLOBAL_LEADERBOARD_FETCH_LIMIT}`;

  try {
    const response = await fetch(getGlobalLeaderboardUrl(query), {
      headers: getGlobalLeaderboardHeaders()
    });

    if (!response.ok) {
      throw new Error("Water Sort leaderboard fetch failed: " + response.status);
    }

    const rows = await response.json();
    state.leaderboard = rows
      .map(normalizeLeaderboardEntry)
      .filter(Boolean)
      .sort(compareLeaderboardEntries)
      .slice(0, MAX_LEADERBOARD_ENTRIES);
    state.leaderboardScope = "Global leaderboard";
    state.leaderboardMessage = successMessage;
    renderLeaderboard();
  } catch (error) {
    state.leaderboard = loadLeaderboard();
    state.leaderboardScope = "Local fallback";
    state.leaderboardMessage = "Global Water Sort leaderboard unavailable; showing local clears.";
    renderLeaderboard();
  }
}

async function submitGlobalLeaderboardEntry(entry) {
  try {
    const response = await fetch(getGlobalLeaderboardUrl(), {
      method: "POST",
      headers: {
        ...getGlobalLeaderboardHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        name: entry.name,
        level: entry.level,
        moves: entry.moves
      })
    });

    if (!response.ok) {
      throw new Error("Water Sort leaderboard submit failed: " + response.status);
    }

    await refreshGlobalLeaderboard(`Clear logged globally for ${entry.name}.`);
  } catch (error) {
    state.leaderboard = loadLeaderboard();
    state.leaderboardScope = "Local fallback";
    state.leaderboardMessage = "Global Water Sort log failed; saved locally on this device.";
    renderLeaderboard();
  }
}

function compareLeaderboardEntries(first, second) {
  if (second.level !== first.level) {
    return second.level - first.level;
  }

  if (first.moves !== second.moves) {
    return first.moves - second.moves;
  }

  return new Date(second.loggedAt).getTime() - new Date(first.loggedAt).getTime();
}

function isValidSave(save) {
  if (!save || typeof save !== "object" || !Number.isFinite(save.level) || !Array.isArray(save.tubes)) {
    return false;
  }

  if (save.tubes.length < 3 || save.tubes.length > palette.length + 2) {
    return false;
  }

  const counts = new Map();

  for (const tube of save.tubes) {
    if (!Array.isArray(tube) || tube.length > CAPACITY) {
      return false;
    }

    for (const color of tube) {
      if (!Number.isInteger(color) || color < 0 || color >= palette.length) {
        return false;
      }

      counts.set(color, (counts.get(color) || 0) + 1);
    }
  }

  for (const count of counts.values()) {
    if (count !== CAPACITY) {
      return false;
    }
  }

  return counts.size >= 2;
}

function startLevel(level) {
  state.level = Math.max(MIN_LEVEL, Math.floor(level));
  state.moves = 0;
  state.tubes = generateLevel(state.level);
  state.selectedTube = null;
  state.undoStack = [];
  state.won = checkWin(state.tubes);
  state.message = `Level ${state.level} ready.`;
  state.animation = null;
  state.isAnimating = false;
  state.pendingLeaderboardEntry = null;
  state.levelRunId = createLeaderboardEntryId();
  state.levelLogged = false;
  state.leaderboardMessage = getInitialLeaderboardMessage();
  saveProgress();
  render();
}

function restartLevel() {
  startLevel(state.level);
}

function nextLevel() {
  startLevel(state.level + 1);
}

function undoMove() {
  if (state.undoStack.length === 0 || state.isAnimating) {
    return;
  }

  const previous = state.undoStack.pop();
  state.tubes = cloneTubes(previous.tubes);
  state.moves = previous.moves;
  state.won = previous.won;
  state.selectedTube = null;
  state.animation = null;
  state.message = "Move undone.";
  if (!state.won && state.pendingLeaderboardEntry) {
    state.pendingLeaderboardEntry = null;
    state.leaderboardMessage = "Clear undone. Finish the level again to submit it.";
  }
  saveProgress();
  render();
}

function handleTubeTap(index) {
  if (state.won || state.isAnimating) {
    return;
  }

  const tube = state.tubes[index];

  if (state.selectedTube === null) {
    if (!tube || tube.length === 0) {
      state.message = "Select a tube with color.";
      render();
      return;
    }

    state.selectedTube = index;
    state.message = `Tube ${index + 1} selected.`;
    render();
    return;
  }

  if (state.selectedTube === index) {
    state.selectedTube = null;
    state.message = "Selection cleared.";
    render();
    return;
  }

  if (!canPour(state.selectedTube, index)) {
    if (tube && tube.length > 0) {
      state.selectedTube = index;
      state.message = "That pour is blocked. Switched selection.";
    } else {
      state.message = "That pour is blocked.";
    }

    render();
    return;
  }

  pour(state.selectedTube, index);
}

function pour(fromIndex, toIndex) {
  const amount = getPourAmount(fromIndex, toIndex);

  if (amount <= 0) {
    state.message = "That pour is blocked.";
    render();
    return;
  }

  pushUndoState();

  const source = state.tubes[fromIndex];
  const destination = state.tubes[toIndex];
  const color = topColor(source);

  for (let unit = 0; unit < amount; unit += 1) {
    destination.push(source.pop());
  }

  state.moves += 1;
  state.selectedTube = null;
  state.won = checkWin();
  state.message = state.won ? "Level clear." : `${palette[color].name} poured.`;
  if (state.won) {
    stageCompletedLevel(false);
  }
  state.animation = {
    fromIndex,
    toIndex,
    color,
    amount,
    token: Date.now()
  };
  state.isAnimating = true;
  saveProgress();
  render();

  window.setTimeout(() => {
    state.animation = null;
    state.isAnimating = false;
    render();
  }, ANIMATION_MS);
}

function generateLevel(level) {
  const rng = createRng(level);
  const difficultyLevel = Math.min(level, GENERATED_LEVEL_COUNT);
  const maxColors = 10;
  const colorCount = Math.min(maxColors, 3 + Math.floor((difficultyLevel - 1) / 9));
  const colorIds = shuffle(Array.from({ length: palette.length }, (_, index) => index), rng).slice(0, colorCount);
  const tubes = colorIds.map(color => Array(CAPACITY).fill(color));
  tubes.push([], []);

  const homeIndexes = Array.from({ length: colorCount }, (_, index) => index);
  const order = shuffle(homeIndexes, rng);
  const processedHomes = new Set();

  order.forEach((homeIndex, orderIndex) => {
    const color = colorIds[homeIndex];
    const difficulty = Math.min(CAPACITY, 1 + Math.floor((difficultyLevel + orderIndex) / 10));
    let unitsToScatter = 1 + Math.floor(rng() * difficulty);

    if (difficultyLevel > 18 && rng() < 0.55) {
      unitsToScatter = Math.min(CAPACITY, unitsToScatter + 1);
    }

    if (difficultyLevel > 45 && rng() < 0.34) {
      unitsToScatter = CAPACITY;
    }

    while (unitsToScatter > 0 && topColor(tubes[homeIndex]) === color) {
      let chunk = Math.min(unitsToScatter, 1 + Math.floor(rng() * Math.min(2, unitsToScatter)));
      let candidates = getScatterTargets(tubes, color, homeIndex, colorCount, processedHomes, chunk);

      if (candidates.length === 0 && chunk > 1) {
        chunk = 1;
        candidates = getScatterTargets(tubes, color, homeIndex, colorCount, processedHomes, chunk);
      }

      if (candidates.length === 0) {
        break;
      }

      const targetIndex = pickScatterTarget(candidates, tubes, rng);

      for (let unit = 0; unit < chunk; unit += 1) {
        tubes[targetIndex].push(tubes[homeIndex].pop());
      }

      unitsToScatter -= chunk;
    }

    processedHomes.add(homeIndex);
  });

  const mixedTubes = shuffle(tubes, rng);
  return checkWin(mixedTubes) ? forceOpeningMove(mixedTubes, rng) : mixedTubes;
}

function getScatterTargets(tubes, color, homeIndex, colorCount, processedHomes, chunk) {
  const candidates = [];

  tubes.forEach((tube, index) => {
    if (index === homeIndex || capacityLeft(tube) < chunk || topColor(tube) === color) {
      return;
    }

    const isExtraTube = index >= colorCount;
    if (!isExtraTube && !processedHomes.has(index)) {
      return;
    }

    candidates.push(index);
  });

  return candidates;
}

function pickScatterTarget(candidates, tubes, rng) {
  const weighted = [];

  candidates.forEach(index => {
    const tube = tubes[index];
    const weight = tube.length === 0 ? 1 : 3;

    for (let count = 0; count < weight; count += 1) {
      weighted.push(index);
    }
  });

  return weighted[Math.floor(rng() * weighted.length)];
}

function forceOpeningMove(tubes, rng) {
  const working = cloneTubes(tubes);
  const fullTubeIndex = working.findIndex(tube => tube.length === CAPACITY);
  const emptyTubeIndex = working.findIndex(tube => tube.length === 0);

  if (fullTubeIndex >= 0 && emptyTubeIndex >= 0) {
    working[emptyTubeIndex].push(working[fullTubeIndex].pop());
  }

  return shuffle(working, rng);
}

function createRng(level) {
  let seed = (level * 2654435761 + 0x9e3779b9) >>> 0;

  return function rng() {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, rng) {
  const output = items.slice();

  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const value = output[index];
    output[index] = output[swapIndex];
    output[swapIndex] = value;
  }

  return output;
}

function render() {
  elements.levelNumber.textContent = `${state.level}`;
  elements.moveCount.textContent = `${state.moves}`;
  elements.statusLabel.textContent = state.won ? "Clear" : "Sort";
  elements.message.textContent = state.message;
  elements.message.classList.toggle("is-win", state.won);
  elements.undoButton.disabled = state.undoStack.length === 0 || state.isAnimating;
  elements.restartButton.disabled = state.isAnimating;
  elements.nextButton.hidden = !state.won;
  renderTubes();
  renderLeaderboard();
}

function renderTubes() {
  elements.tubes.innerHTML = "";

  state.tubes.forEach((tube, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tube-button";
    button.dataset.index = String(index);
    button.setAttribute("aria-label", getTubeLabel(tube, index));
    button.setAttribute("aria-pressed", state.selectedTube === index ? "true" : "false");

    if (state.selectedTube === index) {
      button.classList.add("is-selected");
    }

    if (state.animation && state.animation.fromIndex === index) {
      button.classList.add("is-source");
    }

    if (state.animation && state.animation.toIndex === index) {
      button.classList.add("is-target");
    }

    const glass = document.createElement("div");
    glass.className = "tube-glass";

    const slots = document.createElement("div");
    slots.className = "tube-slots";

    for (let slot = CAPACITY - 1; slot >= 0; slot -= 1) {
      const slotElement = document.createElement("div");
      slotElement.className = "tube-slot";
      const color = tube[slot];

      if (Number.isInteger(color)) {
        const liquid = document.createElement("div");
        liquid.className = "liquid-unit";

        if (isNewAnimatedUnit(index, slot)) {
          liquid.classList.add("is-new");
        }

        const swatch = palette[color];
        liquid.style.setProperty("--liquid", swatch.color);
        liquid.style.setProperty("--shine", swatch.shine);
        liquid.style.setProperty("--glow", swatch.glow);
        slotElement.appendChild(liquid);
      }

      slots.appendChild(slotElement);
    }

    glass.appendChild(slots);
    button.appendChild(glass);
    elements.tubes.appendChild(button);
  });
}

function renderLeaderboard() {
  elements.leaderboardScope.textContent = state.leaderboardScope;
  elements.leaderboardStatus.textContent = state.leaderboardMessage;
  elements.leaderboardList.innerHTML = "";
  renderScoreConfirmation();

  if (!state.leaderboard.length) {
    const empty = document.createElement("li");
    empty.className = "leaderboard-empty";
    empty.textContent = leaderboardConfig.enabled
      ? "No global Water Sort clears loaded yet."
      : "No local Water Sort clears yet.";
    elements.leaderboardList.appendChild(empty);
    return;
  }

  state.leaderboard.slice(0, 10).forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "leaderboard-entry";

    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = `#${index + 1}`;

    const main = document.createElement("span");
    main.className = "leaderboard-main";

    const name = document.createElement("strong");
    name.textContent = entry.name;

    const details = document.createElement("small");
    details.textContent = `${entry.moves} moves | ${formatDate(entry.loggedAt)}`;

    main.appendChild(name);
    main.appendChild(details);

    const score = document.createElement("span");
    score.className = "leaderboard-score";
    score.textContent = `Lv ${entry.level}`;

    item.appendChild(rank);
    item.appendChild(main);
    item.appendChild(score);
    elements.leaderboardList.appendChild(item);
  });
}

function renderScoreConfirmation() {
  const entry = state.pendingLeaderboardEntry;
  elements.leaderboardPending.hidden = !entry;

  if (!entry) {
    elements.leaderboardPendingText.textContent = "";
    return;
  }

  elements.leaderboardPendingText.textContent =
    `Level ${entry.level} | ${entry.moves} moves`;
}

function clearLeaderboard() {
  const message = leaderboardConfig.enabled
    ? "Clear local fallback Water Sort scores on this device? Global scores stay online."
    : "Clear the local Water Sort leaderboard on this device?";

  if (!window.confirm(message)) {
    return;
  }

  try {
    localStorage.removeItem(LEADERBOARD_KEY);
  } catch (error) {
    state.leaderboardMessage = "Could not clear Water Sort leaderboard in this browser.";
    renderLeaderboard();
    return;
  }

  state.leaderboard = [];
  state.leaderboardMessage = "Local Water Sort leaderboard cleared.";

  if (leaderboardConfig.enabled) {
    refreshGlobalLeaderboard("Global Water Sort leaderboard loaded.");
  } else {
    state.leaderboardScope = "Local device only";
    renderLeaderboard();
  }
}

function createLeaderboardEntryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function isNewAnimatedUnit(tubeIndex, slot) {
  if (!state.animation || tubeIndex !== state.animation.toIndex) {
    return false;
  }

  const tube = state.tubes[tubeIndex];
  const firstNewSlot = tube.length - state.animation.amount;
  return slot >= firstNewSlot && slot < tube.length && tube[slot] === state.animation.color;
}

function getTubeLabel(tube, index) {
  if (tube.length === 0) {
    return `Tube ${index + 1}, empty`;
  }

  const colors = tube
    .slice()
    .reverse()
    .map(color => palette[color].name)
    .join(", ");
  return `Tube ${index + 1}, top to bottom: ${colors}`;
}

elements.tubes.addEventListener("click", event => {
  const button = event.target.closest(".tube-button");

  if (!button) {
    return;
  }

  handleTubeTap(Number(button.dataset.index));
});

elements.undoButton.addEventListener("click", undoMove);
elements.restartButton.addEventListener("click", restartLevel);
elements.nextButton.addEventListener("click", nextLevel);
elements.submitLeaderboardButton.addEventListener("click", () => {
  submitPendingScore();
});
elements.skipLeaderboardButton.addEventListener("click", skipPendingScore);
elements.refreshLeaderboardButton.addEventListener("click", () => {
  refreshGlobalLeaderboard();
});
elements.clearLeaderboardButton.addEventListener("click", clearLeaderboard);
elements.playerName.value = loadPlayerName();
elements.playerName.addEventListener("input", () => {
  savePlayerName(getPlayerName());
});

if (!loadProgress()) {
  startLevel(MIN_LEVEL);
} else {
  render();
}

refreshGlobalLeaderboard();
