const BOARD_SIZE = 4;
const WIN_VALUE = 2048;
const BEST_SCORE_KEY = "midnightPizzeriaMerge.bestScore";
const USERNAME_KEY = "midnightPizzeriaMerge.username";
const LEADERBOARD_KEY = "midnightPizzeriaMerge.leaderboard";
const MAX_LEADERBOARD_ENTRIES = 20;
const GLOBAL_LEADERBOARD_FETCH_LIMIT = 50;
const DEFAULT_USERNAME = "Night Guard";

const boardElement = document.getElementById("board");
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("best-score");
const statusElement = document.getElementById("game-status");
const gameOverElement = document.getElementById("game-over");
const finalScoreElement = document.getElementById("final-score");
const newGameButton = document.getElementById("new-game");
const tryAgainButton = document.getElementById("try-again");
const lineupElement = document.getElementById("lineup");
const moveHintElement = document.getElementById("move-hint");
const playerNameInput = document.getElementById("player-name");
const scoreConfirmationElement = document.getElementById("score-confirmation");
const scoreConfirmationDetailElement = document.getElementById("score-confirmation-detail");
const submitScoreButton = document.getElementById("submit-score");
const skipScoreButton = document.getElementById("skip-score");
const clearLeaderboardButton = document.getElementById("clear-leaderboard");
const leaderboardStatusElement = document.getElementById("leaderboard-status");
const leaderboardScopeElement = document.getElementById("leaderboard-scope");
const leaderboardElement = document.getElementById("leaderboard");

const tileOrder = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
const leaderboardConfig = getGlobalLeaderboardConfig();

const tileThemes = {
  2: {
    label: "Endo Bolt",
    bg: "linear-gradient(145deg, #193241, #244d63)",
    fg: "#d8f6ff",
    border: "#7ce8ff",
    glow: "rgba(124, 232, 255, 0.45)",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M37 4 14 34h15l-5 26 26-37H34l3-19Z"/></svg>`
  },
  4: {
    label: "Pizza Slice",
    bg: "linear-gradient(145deg, #4a2714, #7b3d17)",
    fg: "#ffe0a3",
    border: "#ffc45e",
    glow: "rgba(255, 196, 94, 0.4)",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M12 9c17 3 31 16 41 38L18 55 12 9Z"/><path d="M17 18c10 2 22 12 28 25"/><circle cx="27" cy="33" r="4"/><circle cx="36" cy="45" r="3"/><circle cx="21" cy="47" r="3"/></svg>`
  },
  8: {
    label: "Arcade Token",
    bg: "linear-gradient(145deg, #26340f, #516915)",
    fg: "#efffb0",
    border: "#c9ff4a",
    glow: "rgba(201, 255, 74, 0.36)",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="15"/><path d="M32 19v26M21 32h22"/></svg>`
  },
  16: {
    label: "Party Hat",
    bg: "linear-gradient(145deg, #3d163b, #742a68)",
    fg: "#ffd8fb",
    border: "#ff82ea",
    glow: "rgba(255, 130, 234, 0.38)",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="10" r="5"/><path d="M17 56 32 14l15 42H17Z"/><path d="M24 36h16M21 47h22"/></svg>`
  },
  32: {
    label: "Clockwork Bird",
    bg: "linear-gradient(145deg, #123a3a, #1e6c6a)",
    fg: "#d9fffb",
    border: "#71fff2",
    glow: "rgba(113, 255, 242, 0.4)",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M17 34c0-10 7-18 18-18 8 0 14 4 17 11l8 5-8 5c-3 7-10 11-18 11-10 0-17-5-17-14Z"/><circle cx="36" cy="29" r="4"/><path d="M17 34H6m18 14-5 8m20-8 5 8M22 20l-5-7"/></svg>`
  },
  64: {
    label: "Neon Bunny",
    bg: "linear-gradient(145deg, #24214f, #4b43a3)",
    fg: "#e9e8ff",
    border: "#a39cff",
    glow: "rgba(163, 156, 255, 0.48)",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M22 25 16 6c8 0 12 7 13 18m13 1L48 6c-8 0-12 7-13 18"/><path d="M16 39c0-10 7-17 16-17s16 7 16 17-6 17-16 17-16-7-16-17Z"/><circle cx="26" cy="39" r="3"/><circle cx="38" cy="39" r="3"/><path d="M27 48h10"/></svg>`
  },
  128: {
    label: "Pirate Fox Automaton",
    bg: "linear-gradient(145deg, #421a1d, #8d272d)",
    fg: "#ffe3e6",
    border: "#ff6671",
    glow: "rgba(222, 51, 65, 0.54)",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M17 35c0-12 8-21 20-21 8 0 14 5 17 13l6 1-5 6c0 12-8 20-19 20S17 47 17 35Z"/><path d="m24 16-8-7 2 13m26-3 9-5-4 13"/><path d="M27 32h15M25 28l18 8"/><circle cx="27" cy="32" r="4"/><path d="M33 45c5 2 10 1 14-3"/></svg>`
  },
  256: {
    label: "Bear Mascot Head",
    bg: "linear-gradient(145deg, #503016, #946027)",
    fg: "#fff0c7",
    border: "#ffc76d",
    glow: "rgba(255, 199, 109, 0.58)",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="20" cy="18" r="9"/><circle cx="44" cy="18" r="9"/><path d="M14 34c0-12 8-20 18-20s18 8 18 20-7 21-18 21-18-9-18-21Z"/><circle cx="26" cy="34" r="3"/><circle cx="38" cy="34" r="3"/><path d="M27 45h10M30 40h4"/></svg>`
  },
  512: {
    label: "Golden Bear Mask",
    bg: "linear-gradient(145deg, #6d4c09, #c28b15)",
    fg: "#fff7cd",
    border: "#ffe86d",
    glow: "rgba(255, 232, 109, 0.7)",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M17 24c-4-9 5-14 12-8m18 8c4-9-5-14-12-8"/><path d="M16 35c0-11 7-19 16-19s16 8 16 19c0 12-6 20-16 20s-16-8-16-20Z"/><path d="M23 35h8m10 0h-8M25 46c4 2 10 2 14 0"/><path d="M21 25c5-4 17-4 22 0"/></svg>`
  },
  1024: {
    label: "Shadow Stage",
    bg: "linear-gradient(145deg, #11121c, #352157)",
    fg: "#efe6ff",
    border: "#c48cff",
    glow: "rgba(196, 140, 255, 0.78)",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M9 13h46v34H9V13Z"/><path d="M14 13c6 9 6 23 0 34m36-34c-6 9-6 23 0 34M25 47l7-22 7 22"/><path d="M24 51h16"/></svg>`
  },
  2048: {
    label: "Midnight Show",
    bg: "linear-gradient(145deg, #14151d 0%, #5f1721 55%, #b51f2e 100%)",
    fg: "#fff8f0",
    border: "#ffffff",
    glow: "rgba(222, 51, 65, 0.95)",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M10 15h44v34H10V15Z"/><path d="M16 22h32M16 42h32"/><circle cx="32" cy="32" r="8"/><path d="M32 6v10M32 48v10M6 32h10M48 32h10"/></svg>`
  }
};

const state = {
  grid: createEmptyGrid(),
  score: 0,
  bestScore: loadBestScore(),
  gameOver: false,
  hasReachedMidnight: false,
  newTiles: [],
  lastMoveMessage: "Swipe the board. All tiles slide to the wall, matching pairs merge, then a new tile appears.",
  leaderboardMessage: getInitialLeaderboardMessage(),
  leaderboardScope: getInitialLeaderboardScope(),
  leaderboard: loadLeaderboard(),
  moves: 0,
  runId: createRunId(),
  scoreLogged: false,
  pendingLeaderboardEntry: null
};

function createEmptyGrid() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

function loadBestScore() {
  try {
    return Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
  } catch (error) {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch (error) {
    // Private browsing or locked storage should not block play.
  }
}

function getGlobalLeaderboardConfig() {
  const rawConfig = window.MPM_LEADERBOARD_CONFIG || {};
  const supabaseUrl = String(rawConfig.supabaseUrl || "").replace(/\/+$/, "");
  const supabaseAnonKey = String(rawConfig.supabaseAnonKey || "");
  const requestedTable = String(rawConfig.tableName || "pizzeria_leaderboard");
  const tableName = /^[a-zA-Z0-9_]+$/.test(requestedTable)
    ? requestedTable
    : "pizzeria_leaderboard";

  return {
    enabled: Boolean(supabaseUrl && supabaseAnonKey),
    supabaseUrl,
    supabaseAnonKey,
    tableName
  };
}

function getInitialLeaderboardMessage() {
  return leaderboardConfig.enabled
    ? "Global scores load here. Finished games wait for your confirmation."
    : "Finished games wait for your confirmation on this device.";
}

function getInitialLeaderboardScope() {
  return leaderboardConfig.enabled
    ? "Global leaderboard"
    : "Local device only";
}

function loadUsername() {
  try {
    return localStorage.getItem(USERNAME_KEY) || DEFAULT_USERNAME;
  } catch (error) {
    return DEFAULT_USERNAME;
  }
}

function saveUsername(username) {
  try {
    localStorage.setItem(USERNAME_KEY, username);
  } catch (error) {
    // Local leaderboard identity is optional if storage is unavailable.
  }
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

  const name = String(entry.name || DEFAULT_USERNAME).trim().slice(0, 18);
  const score = Number(entry.score) || 0;
  const highestTile = Number(entry.highestTile || entry.highest_tile) || 0;
  const moves = Number(entry.moves) || 0;

  if (!name || moves <= 0) {
    return null;
  }

  return {
    id: String(entry.id || createRunId()),
    name,
    score,
    highestTile,
    moves,
    finished: Boolean(entry.finished),
    achievedMidnight: Boolean(entry.achievedMidnight || entry.achieved_midnight),
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

function startNewGame() {
  state.grid = createEmptyGrid();
  state.score = 0;
  state.gameOver = false;
  state.hasReachedMidnight = false;
  state.newTiles = [];
  state.moves = 0;
  state.runId = createRunId();
  state.scoreLogged = false;
  state.pendingLeaderboardEntry = null;
  state.lastMoveMessage = "New shift started. Swipe any direction to slide every tile on the board.";
  state.leaderboardMessage = getInitialLeaderboardMessage();
  spawnTile(true);
  spawnTile(true);
  render();
}

function getEmptyCells(grid = state.grid) {
  const cells = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (grid[row][col] === 0) {
        cells.push({ row, col });
      }
    }
  }

  return cells;
}

function spawnTile(trackNewTile = false) {
  const emptyCells = getEmptyCells();

  if (emptyCells.length === 0) {
    return null;
  }

  const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  state.grid[cell.row][cell.col] = value;

  if (trackNewTile) {
    state.newTiles.push({ row: cell.row, col: cell.col, value });
  }

  return { row: cell.row, col: cell.col, value };
}

function handleMove(direction) {
  if (state.gameOver) {
    return;
  }

  const move = buildMove(direction, state.grid);

  if (!move.changed) {
    state.lastMoveMessage = "Nothing moved. Pick a direction with open space or a matching neighbor.";
    renderMoveHint();
    return;
  }

  state.grid = move.grid;
  state.score += move.gained;
  state.newTiles = [];
  state.moves += 1;

  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    saveBestScore(state.bestScore);
  }

  if (!state.hasReachedMidnight && gridContainsValue(state.grid, WIN_VALUE)) {
    state.hasReachedMidnight = true;
  }

  const spawnedTile = spawnTile(true);
  state.gameOver = !hasAvailableMoves(state.grid);
  state.lastMoveMessage = createMoveMessage(direction, move.gained, spawnedTile);

  if (state.gameOver) {
    stageCompletedGame(false);
  }

  render();
}

function buildMove(direction, grid) {
  const nextGrid = createEmptyGrid();
  const horizontal = direction === "left" || direction === "right";
  const reverse = direction === "right" || direction === "down";
  let gained = 0;

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const sourceLine = horizontal
      ? grid[index].slice()
      : grid.map(row => row[index]);

    const workingLine = reverse ? sourceLine.slice().reverse() : sourceLine;
    const merged = slideAndMergeLine(workingLine);
    const resultLine = reverse ? merged.line.reverse() : merged.line;
    gained += merged.gained;

    if (horizontal) {
      nextGrid[index] = resultLine;
    } else {
      for (let row = 0; row < BOARD_SIZE; row += 1) {
        nextGrid[row][index] = resultLine[row];
      }
    }
  }

  return {
    grid: nextGrid,
    gained,
    changed: !gridsMatch(grid, nextGrid)
  };
}

function slideAndMergeLine(line) {
  // 2048-style rule: compact toward the move direction, merge each matching
  // pair once, then pad the rest of the line with empty cells.
  const values = line.filter(value => value !== 0);
  const output = [];
  let gained = 0;

  for (let index = 0; index < values.length; index += 1) {
    const current = values[index];
    const next = values[index + 1];

    if (current === next) {
      const mergedValue = current * 2;
      output.push(mergedValue);
      gained += mergedValue;
      index += 1;
    } else {
      output.push(current);
    }
  }

  while (output.length < BOARD_SIZE) {
    output.push(0);
  }

  return { line: output, gained };
}

function gridsMatch(first, second) {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (first[row][col] !== second[row][col]) {
        return false;
      }
    }
  }

  return true;
}

function gridContainsValue(grid, value) {
  return grid.some(row => row.includes(value));
}

function hasAvailableMoves(grid) {
  if (getEmptyCells(grid).length > 0) {
    return true;
  }

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const value = grid[row][col];
      const right = grid[row][col + 1];
      const down = grid[row + 1] ? grid[row + 1][col] : null;

      if (value === right || value === down) {
        return true;
      }
    }
  }

  return false;
}

function render() {
  renderBoard();
  renderScores();
  renderMoveHint();
  renderLineup();
  renderLeaderboard();
  renderGameOver();
}

function renderBoard() {
  boardElement.innerHTML = "";

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = document.createElement("div");
      const value = state.grid[row][col];
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", value ? `${getTileTheme(value).label}, ${value}` : "Empty");

      if (value) {
        cell.appendChild(createTile(value, false, isNewTile(row, col)));
      }

      boardElement.appendChild(cell);
    }
  }
}

function renderMoveHint() {
  moveHintElement.textContent = state.lastMoveMessage;
}

function renderScores() {
  scoreElement.textContent = formatScore(state.score);
  bestScoreElement.textContent = formatScore(state.bestScore);

  if (state.gameOver) {
    statusElement.textContent = "Closed";
  } else if (state.hasReachedMidnight) {
    statusElement.textContent = "Midnight";
  } else {
    statusElement.textContent = "Live";
  }
}

function renderLineup() {
  lineupElement.innerHTML = "";
  const highestTile = getHighestTile(state.grid);

  tileOrder.forEach(value => {
    const item = document.createElement("li");
    item.className = "lineup-item";

    if (highestTile >= value) {
      item.classList.add("is-unlocked");
    }

    const miniTile = createTile(value, true);
    const text = document.createElement("span");
    text.className = "lineup-label";
    text.textContent = getTileTheme(value).label;

    item.appendChild(miniTile);
    item.appendChild(text);
    lineupElement.appendChild(item);
  });
}

function getHighestTile(grid) {
  let highest = 0;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      highest = Math.max(highest, grid[row][col]);
    }
  }

  return highest;
}

function renderGameOver() {
  gameOverElement.hidden = !state.gameOver;
  finalScoreElement.textContent = `Score ${formatScore(state.score)}`;
}

function renderLeaderboard() {
  leaderboardElement.innerHTML = "";
  leaderboardStatusElement.textContent = state.leaderboardMessage;
  leaderboardScopeElement.textContent = state.leaderboardScope;
  renderScoreConfirmation();

  if (state.leaderboard.length === 0) {
    const empty = document.createElement("li");
    empty.className = "leaderboard-empty";
    empty.textContent = leaderboardConfig.enabled
      ? "No global scores loaded yet."
      : "No local completed games yet.";
    leaderboardElement.appendChild(empty);
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
    details.textContent = `${getTileName(entry.highestTile)} | ${entry.moves} moves | ${formatDate(entry.loggedAt)}`;

    main.appendChild(name);
    main.appendChild(details);

    const score = document.createElement("span");
    score.className = "leaderboard-score";
    score.textContent = formatScore(entry.score);

    item.appendChild(rank);
    item.appendChild(main);
    item.appendChild(score);
    leaderboardElement.appendChild(item);
  });
}

function renderScoreConfirmation() {
  if (!scoreConfirmationElement || !scoreConfirmationDetailElement) {
    return;
  }

  const entry = state.pendingLeaderboardEntry;
  scoreConfirmationElement.hidden = !entry;

  if (!entry) {
    scoreConfirmationDetailElement.textContent = "";
    return;
  }

  scoreConfirmationDetailElement.textContent =
    `Score ${formatScore(entry.score)} | ${getTileName(entry.highestTile)} | ${entry.moves} moves`;
}

function createTile(value, mini = false, isNew = false) {
  const theme = getTileTheme(value);
  const tile = document.createElement("div");
  tile.className = `tile tier-${getTier(value)}${mini ? " tile-mini" : ""}`;
  if (isNew) {
    tile.classList.add("is-new");
  }
  tile.style.setProperty("--tile-bg", theme.bg);
  tile.style.setProperty("--tile-fg", theme.fg);
  tile.style.setProperty("--tile-border", theme.border);
  tile.style.setProperty("--tile-glow", theme.glow);
  tile.setAttribute("data-value", String(value));

  const icon = document.createElement("span");
  icon.className = "tile-icon";
  icon.innerHTML = theme.icon;

  const valueElement = document.createElement("span");
  valueElement.className = "tile-number";
  valueElement.textContent = String(value);

  const label = document.createElement("span");
  label.className = "tile-label";
  label.textContent = theme.label;

  tile.appendChild(icon);
  tile.appendChild(valueElement);
  tile.appendChild(label);
  return tile;
}

function isNewTile(row, col) {
  return state.newTiles.some(tile => tile.row === row && tile.col === col);
}

function createMoveMessage(direction, gained, spawnedTile) {
  const directionLabel = direction.charAt(0).toUpperCase() + direction.slice(1);
  const spawnLabel = spawnedTile ? getTileTheme(spawnedTile.value).label : "no new tile";

  if (gained > 0) {
    return `${directionLabel}: tiles slid to the wall, merged for ${gained} points, then a new ${spawnLabel} appeared.`;
  }

  return `${directionLabel}: tiles slid to open spaces, then a new ${spawnLabel} appeared.`;
}

function stageCompletedGame(shouldRender = true) {
  if (state.scoreLogged || state.pendingLeaderboardEntry || !state.gameOver || state.moves === 0) {
    return;
  }

  state.pendingLeaderboardEntry = createLeaderboardEntry();
  state.leaderboardMessage = "Score ready. Edit the display name, then submit or skip.";

  if (shouldRender) {
    renderLeaderboard();
  }
}

function submitPendingScore(shouldRender = true) {
  if (!state.pendingLeaderboardEntry || state.scoreLogged) {
    return;
  }

  const entry = {
    ...state.pendingLeaderboardEntry,
    name: getPlayerName()
  };
  const localLeaderboard = upsertLeaderboardEntry(loadLeaderboard(), entry);

  if (saveLeaderboard(localLeaderboard)) {
    state.scoreLogged = true;
    state.pendingLeaderboardEntry = null;
    saveUsername(entry.name);
    if (leaderboardConfig.enabled) {
      state.leaderboard = localLeaderboard;
      state.leaderboardScope = "Local pending sync";
      state.leaderboardMessage = `Score saved locally. Sending ${entry.name}'s score online...`;
    } else {
      state.leaderboard = localLeaderboard;
      state.leaderboardMessage = `Score submitted for ${entry.name}.`;
    }
  } else {
    state.scoreLogged = true;
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
  state.scoreLogged = true;
  state.leaderboardMessage = "Score skipped.";
  renderLeaderboard();
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

function createLeaderboardEntry() {
  return {
    id: state.runId,
    name: getPlayerName(),
    score: state.score,
    highestTile: getHighestTile(state.grid),
    moves: state.moves,
    finished: state.gameOver,
    achievedMidnight: state.hasReachedMidnight,
    loggedAt: new Date().toISOString()
  };
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

async function refreshGlobalLeaderboard(successMessage = "Global leaderboard loaded.") {
  if (!leaderboardConfig.enabled) {
    return;
  }

  state.leaderboardScope = "Global leaderboard";
  state.leaderboardMessage = "Loading global leaderboard...";
  renderLeaderboard();

  const query = `?select=name,score,highest_tile,moves,achieved_midnight,created_at&order=score.desc&limit=${GLOBAL_LEADERBOARD_FETCH_LIMIT}`;

  try {
    const response = await fetch(getGlobalLeaderboardUrl(query), {
      headers: getGlobalLeaderboardHeaders()
    });

    if (!response.ok) {
      throw new Error(`Leaderboard fetch failed: ${response.status}`);
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
    state.leaderboardMessage = "Global leaderboard unavailable; showing local scores.";
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
        score: entry.score,
        highest_tile: entry.highestTile,
        moves: entry.moves,
        achieved_midnight: entry.achievedMidnight
      })
    });

    if (!response.ok) {
      throw new Error(`Leaderboard submit failed: ${response.status}`);
    }

    await refreshGlobalLeaderboard(`Finished game logged globally for ${entry.name}.`);
  } catch (error) {
    state.leaderboard = loadLeaderboard();
    state.leaderboardScope = "Local fallback";
    state.leaderboardMessage = "Global log failed; saved locally on this device.";
    renderLeaderboard();
  }
}

function compareLeaderboardEntries(first, second) {
  if (second.score !== first.score) {
    return second.score - first.score;
  }

  if (second.highestTile !== first.highestTile) {
    return second.highestTile - first.highestTile;
  }

  if (first.moves !== second.moves) {
    return first.moves - second.moves;
  }

  return new Date(second.loggedAt).getTime() - new Date(first.loggedAt).getTime();
}

function getPlayerName() {
  const value = playerNameInput.value.trim();
  return value || DEFAULT_USERNAME;
}

function getTileName(value) {
  if (!value) {
    return "No tile";
  }

  return `${value} ${getTileTheme(value).label}`;
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

function createRunId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getTileTheme(value) {
  if (tileThemes[value]) {
    return tileThemes[value];
  }

  return {
    label: "Encore Machine",
    bg: "linear-gradient(145deg, #101014, #DE3341)",
    fg: "#ffffff",
    border: "#ffffff",
    glow: "rgba(222, 51, 65, 0.95)",
    icon: `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M12 18h40v30H12V18Z"/><path d="M18 26h28M18 40h28M24 10v8m16-8v8"/></svg>`
  };
}

function getTier(value) {
  return Math.min(Math.max(Math.log2(value), 1), 12);
}

function formatScore(score) {
  return score.toLocaleString("en-US");
}

const keyDirections = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  a: "left",
  d: "right",
  w: "up",
  s: "down",
  A: "left",
  D: "right",
  W: "up",
  S: "down"
};

document.addEventListener("keydown", event => {
  const direction = keyDirections[event.key];

  if (!direction) {
    return;
  }

  event.preventDefault();
  handleMove(direction);
});

let touchStartX = 0;
let touchStartY = 0;
let trackingTouch = false;

boardElement.addEventListener("touchstart", event => {
  if (event.touches.length !== 1) {
    trackingTouch = false;
    return;
  }

  const touch = event.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  trackingTouch = true;
}, { passive: true });

boardElement.addEventListener("touchmove", event => {
  if (trackingTouch) {
    event.preventDefault();
  }
}, { passive: false });

boardElement.addEventListener("touchend", event => {
  if (!trackingTouch || event.changedTouches.length === 0) {
    return;
  }

  const touch = event.changedTouches[0];
  const direction = getSwipeDirection(touch.clientX - touchStartX, touch.clientY - touchStartY);
  trackingTouch = false;

  if (direction) {
    event.preventDefault();
    handleMove(direction);
  }
}, { passive: false });

boardElement.addEventListener("touchcancel", () => {
  trackingTouch = false;
});

function getSwipeDirection(deltaX, deltaY) {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const threshold = 24;

  if (Math.max(absX, absY) < threshold) {
    return null;
  }

  if (absX > absY) {
    return deltaX > 0 ? "right" : "left";
  }

  return deltaY > 0 ? "down" : "up";
}

newGameButton.addEventListener("click", startNewGame);
tryAgainButton.addEventListener("click", startNewGame);
submitScoreButton.addEventListener("click", () => {
  submitPendingScore();
});
skipScoreButton.addEventListener("click", skipPendingScore);
clearLeaderboardButton.addEventListener("click", () => {
  const message = leaderboardConfig.enabled
    ? "Clear local fallback scores on this device? Global scores stay online."
    : "Clear the local leaderboard on this device?";

  if (!window.confirm(message)) {
    return;
  }

  saveLeaderboard([]);
  state.leaderboardMessage = "Local leaderboard cleared.";

  if (leaderboardConfig.enabled) {
    refreshGlobalLeaderboard("Global leaderboard loaded.");
  } else {
    state.leaderboard = [];
    renderLeaderboard();
  }
});
playerNameInput.value = loadUsername();
playerNameInput.addEventListener("input", () => {
  saveUsername(getPlayerName());
});

if ("serviceWorker" in navigator && (location.protocol === "http:" || location.protocol === "https:")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(error => {
      console.warn("Service worker registration failed", error);
    });
  });
}

startNewGame();
refreshGlobalLeaderboard();
