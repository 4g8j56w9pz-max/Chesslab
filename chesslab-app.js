const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const whiteCapturedElement = document.getElementById("whiteCaptured");
const blackCapturedElement = document.getElementById("blackCaptured");
const whiteScoreElement = document.getElementById("whiteScore");
const blackScoreElement = document.getElementById("blackScore");
const whiteNameInput = document.getElementById("whiteName");
const blackNameInput = document.getElementById("blackName");
const whiteScoreNameElement = document.getElementById("whiteScoreName");
const blackScoreNameElement = document.getElementById("blackScoreName");
const gameModeSelect = document.getElementById("gameMode");
const botDifficultySelect = document.getElementById("botDifficulty");
const botDifficultyRow = document.getElementById("botDifficultyRow");
const saveRecordBtn = document.getElementById("saveRecordBtn");
const clearRecordsBtn = document.getElementById("clearRecordsBtn");
const recordSummaryElement = document.getElementById("recordSummary");
const recordListElement = document.getElementById("recordList");
const moveLogElement = document.getElementById("moveLog");

let selectedSquare = null;
let currentTurn = "w";
let boardFlipped = false;
let capturedByWhite = [];
let capturedByBlack = [];
let enPassantTarget = null;
let castlingRights = {};
let gameMode = "local";
let botDifficulty = "easy";
let botMoveTimer = null;
let moveHistory = [];
let gameStartedAt = null;
let activeGameRecordSaved = false;
let lastKingDangerKey = "none";

const localGameRecordsKey = "chesslab.localGameRecords";
const maxLocalGameRecords = 12;

const pieceScores = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

const pieceImages = {
  wp: "pieces/white-pawn.png",
  wr: "pieces/white-rook.png",
  wn: "pieces/white-knight.png",
  wb: "pieces/white-bishop.png",
  wq: "pieces/white-queen.png",
  wk: "pieces/white-king.png",

  bp: "pieces/black-pawn.png",
  br: "pieces/black-rook.png",
  bn: "pieces/black-knight.png",
  bb: "pieces/black-bishop.png",
  bq: "pieces/black-queen.png",
  bk: "pieces/black-king.png"
};

let board = [];

function createStartingBoard() {
  clearBotMoveTimer();

  board = [
    ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
    ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
    ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"]
  ];

  selectedSquare = null;
  currentTurn = "w";
  capturedByWhite = [];
  capturedByBlack = [];
  enPassantTarget = null;
  castlingRights = {
    w: { kingSide: true, queenSide: true },
    b: { kingSide: true, queenSide: true }
  };
  moveHistory = [];
  gameStartedAt = new Date().toISOString();
  activeGameRecordSaved = false;
  lastKingDangerKey = "none";
  updateStatus();
  updateCapturedPieces();
  updateScoreboard();
  updateMoveLog();
  renderBoard();
  scheduleBotMove();
}

function renderBoard() {
  boardElement.innerHTML = "";

  const dangerState = getKingDangerState();
  const dangerKey = getKingDangerKey(dangerState);
  const dangerIsFresh = dangerKey !== lastKingDangerKey;
  lastKingDangerKey = dangerKey;

  boardElement.classList.toggle("is-check", dangerState.type === "check");
  boardElement.classList.toggle("is-checkmate", dangerState.type === "checkmate");
  boardElement.classList.toggle("danger-fresh", dangerIsFresh && dangerState.type !== "none");
  boardElement.classList.toggle("checkmate-fresh", dangerIsFresh && dangerState.type === "checkmate");

  if (dangerIsFresh && dangerState.type !== "none") {
    window.setTimeout(() => {
      boardElement.classList.remove("danger-fresh", "checkmate-fresh");
    }, 850);
  }

  for (let visualRow = 0; visualRow < 8; visualRow++) {
    for (let visualCol = 0; visualCol < 8; visualCol++) {
      const row = boardFlipped ? 7 - visualRow : visualRow;
      const col = boardFlipped ? 7 - visualCol : visualCol;

      const square = document.createElement("div");
      square.classList.add("square");

      const isLight = (row + col) % 2 === 0;
      square.classList.add(isLight ? "light" : "dark");
      if (
        selectedSquare &&
        selectedSquare.row === row &&
        selectedSquare.col === col
      ) {
        square.classList.add("selected");
      }

      square.dataset.row = row;
      square.dataset.col = col;

      if (
        dangerState.king &&
        dangerState.king.row === row &&
        dangerState.king.col === col
      ) {
        square.classList.add(
          dangerState.type === "checkmate" ? "checkmate-king" : "checked-king"
        );

        if (dangerIsFresh) {
          square.classList.add(
            dangerState.type === "checkmate"
              ? "checkmate-king-fresh"
              : "checked-king-fresh"
          );
        }
      }

      if (
        dangerState.attackers.some(attacker => attacker.row === row && attacker.col === col)
      ) {
        square.classList.add("checking-piece");

        if (dangerIsFresh) {
          square.classList.add("checking-piece-fresh");
        }
      }

      const piece = board[row][col];
      const selectedPiece = selectedSquare
        ? board[selectedSquare.row][selectedSquare.col]
        : "";

      if (
        selectedSquare &&
        selectedPiece &&
        isLegalMove(
          selectedSquare.row,
          selectedSquare.col,
          row,
          col,
          selectedPiece
        )
      ) {
        square.classList.add("legal");
        if (piece) {
          square.classList.add("capture");
        }
      }

      if (piece) {
        const img = document.createElement("img");
        img.src = pieceImages[piece];
        img.alt = piece;
        square.appendChild(img);
      }

      square.addEventListener("click", handleSquareClick);

      boardElement.appendChild(square);
    }
  }

  renderDangerOverlay(dangerState);
}

function handleSquareClick(event) {
  if (isBotTurn()) return;

  const square = event.currentTarget;
  const row = Number(square.dataset.row);
  const col = Number(square.dataset.col);
  const piece = board[row][col];

  if (!selectedSquare) {
    if (!piece) return;
    if (piece[0] !== currentTurn) return;

    selectedSquare = { row, col };
    renderBoard();
    return;
  }

  const fromRow = selectedSquare.row;
  const fromCol = selectedSquare.col;
  const movingPiece = board[fromRow][fromCol];

  if (fromRow === row && fromCol === col) {
    selectedSquare = null;
    renderBoard();
    return;
  }

  if (piece && piece[0] === currentTurn) {
    selectedSquare = { row, col };
    renderBoard();
    return;
  }

  if (!isLegalMove(fromRow, fromCol, row, col, movingPiece)) {
    selectedSquare = null;
    renderBoard();
    return;
  }

  applyMove(fromRow, fromCol, row, col);
}

function applyMove(fromRow, fromCol, toRow, toCol, options = {}) {
  const shouldRender = options.render !== false;
  const movingPiece = board[fromRow][fromCol];
  const movingColor = movingPiece[0];
  const enPassantCapture = isEnPassantCapture(
    movingPiece,
    fromRow,
    fromCol,
    toRow,
    toCol
  );
  const capturedPiece = enPassantCapture
    ? board[fromRow][toCol]
    : board[toRow][toCol];
  const promotedPiece = getPromotedPiece(movingPiece, toRow);
  const moveRecord = shouldRender
    ? createMoveRecord(
        movingPiece,
        promotedPiece,
        capturedPiece,
        fromRow,
        fromCol,
        toRow,
        toCol,
        enPassantCapture
      )
    : null;

  if (capturedPiece) {
    if (movingColor === "w") {
      capturedByWhite.push(capturedPiece);
    } else {
      capturedByBlack.push(capturedPiece);
    }
  }

  board[toRow][toCol] = promotedPiece;
  board[fromRow][fromCol] = "";

  if (enPassantCapture) {
    board[fromRow][toCol] = "";
  }

  if (isCastlingMove(movingPiece, fromRow, fromCol, toRow, toCol)) {
    moveCastlingRook(toRow, toCol);
  }

  updateCastlingRights(movingPiece, fromRow, fromCol, toRow, toCol, capturedPiece);
  updateEnPassantTarget(movingPiece, fromRow, fromCol, toRow, toCol);

  selectedSquare = null;
  currentTurn = currentTurn === "w" ? "b" : "w";

  if (shouldRender) {
    recordMove(moveRecord);
    updateStatus();
    updateCapturedPieces();
    updateScoreboard();
    updateMoveLog();
    renderBoard();
    scheduleBotMove();
  }

  return capturedPiece;
}

function isLegalMove(fromRow, fromCol, toRow, toCol, piece) {
  if (!isPseudoLegalMove(fromRow, fromCol, toRow, toCol, piece)) {
    return false;
  }

  return !wouldLeaveKingInCheck(fromRow, fromCol, toRow, toCol, piece);
}

function isPseudoLegalMove(fromRow, fromCol, toRow, toCol, piece) {
  if (!piece) return false;
  if (fromRow === toRow && fromCol === toCol) return false;
  if (!isInsideBoard(toRow, toCol)) return false;

  const targetPiece = board[toRow][toCol];

  if (targetPiece && targetPiece[0] === piece[0]) return false;
  if (targetPiece && targetPiece[1] === "k") return false;

  const pieceType = piece[1];
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;
  const absRow = Math.abs(rowDiff);
  const absCol = Math.abs(colDiff);

  if (pieceType === "p") {
    return isLegalPawnMove(fromRow, fromCol, toRow, toCol, piece);
  }

  if (pieceType === "n") {
    return (
      (absRow === 2 && absCol === 1) ||
      (absRow === 1 && absCol === 2)
    );
  }

  if (pieceType === "b") {
    return absRow === absCol && isPathClear(fromRow, fromCol, toRow, toCol);
  }

  if (pieceType === "r") {
    return (
      (fromRow === toRow || fromCol === toCol) &&
      isPathClear(fromRow, fromCol, toRow, toCol)
    );
  }

  if (pieceType === "q") {
    const movesStraight = fromRow === toRow || fromCol === toCol;
    const movesDiagonal = absRow === absCol;

    return (
      (movesStraight || movesDiagonal) &&
      isPathClear(fromRow, fromCol, toRow, toCol)
    );
  }

  if (pieceType === "k") {
    if (absRow === 0 && absCol === 2) {
      return isLegalCastle(piece, fromRow, fromCol, toRow, toCol);
    }

    return absRow <= 1 && absCol <= 1;
  }

  return false;
}

function wouldLeaveKingInCheck(fromRow, fromCol, toRow, toCol, piece) {
  const capturedPiece = board[toRow][toCol];
  const enPassantCapture = isEnPassantCapture(
    piece,
    fromRow,
    fromCol,
    toRow,
    toCol
  );
  const enPassantPiece = enPassantCapture ? board[fromRow][toCol] : "";

  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = "";

  if (enPassantCapture) {
    board[fromRow][toCol] = "";
  }

  const kingIsInCheck = isKingInCheck(piece[0]);

  board[fromRow][fromCol] = piece;
  board[toRow][toCol] = capturedPiece;

  if (enPassantCapture) {
    board[fromRow][toCol] = enPassantPiece;
  }

  return kingIsInCheck;
}

function isKingInCheck(color) {
  const kingSquare = findKing(color);

  if (!kingSquare) return false;

  const opponentColor = color === "w" ? "b" : "w";
  return isSquareUnderAttack(kingSquare.row, kingSquare.col, opponentColor);
}

function findKing(color) {
  const king = color + "k";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === king) {
        return { row, col };
      }
    }
  }

  return null;
}

function isSquareUnderAttack(row, col, attackerColor) {
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];

      if (piece && piece[0] === attackerColor) {
        if (canPieceAttackSquare(fromRow, fromCol, row, col, piece)) {
          return true;
        }
      }
    }
  }

  return false;
}

function canPieceAttackSquare(fromRow, fromCol, toRow, toCol, piece) {
  const pieceType = piece[1];
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;
  const absRow = Math.abs(rowDiff);
  const absCol = Math.abs(colDiff);

  if (pieceType === "p") {
    const direction = piece[0] === "w" ? -1 : 1;

    return rowDiff === direction && absCol === 1;
  }

  if (pieceType === "n") {
    return (
      (absRow === 2 && absCol === 1) ||
      (absRow === 1 && absCol === 2)
    );
  }

  if (pieceType === "b") {
    return absRow === absCol && isPathClear(fromRow, fromCol, toRow, toCol);
  }

  if (pieceType === "r") {
    return (
      (fromRow === toRow || fromCol === toCol) &&
      isPathClear(fromRow, fromCol, toRow, toCol)
    );
  }

  if (pieceType === "q") {
    return (
      (fromRow === toRow || fromCol === toCol || absRow === absCol) &&
      isPathClear(fromRow, fromCol, toRow, toCol)
    );
  }

  if (pieceType === "k") {
    return absRow <= 1 && absCol <= 1;
  }

  return false;
}

function isLegalPawnMove(fromRow, fromCol, toRow, toCol, piece) {
  const direction = piece[0] === "w" ? -1 : 1;
  const startingRow = piece[0] === "w" ? 6 : 1;
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;
  const targetPiece = board[toRow][toCol];

  if (colDiff === 0 && !targetPiece) {
    if (rowDiff === direction) return true;

    const middleRow = fromRow + direction;
    return (
      fromRow === startingRow &&
      rowDiff === direction * 2 &&
      !board[middleRow][fromCol]
    );
  }

  if (Math.abs(colDiff) === 1 && rowDiff === direction) {
    return (
      (Boolean(targetPiece) && targetPiece[0] !== piece[0]) ||
      isEnPassantCapture(piece, fromRow, fromCol, toRow, toCol)
    );
  }

  return false;
}

function isEnPassantCapture(piece, fromRow, fromCol, toRow, toCol) {
  if (!enPassantTarget || piece[1] !== "p") return false;
  if (board[toRow][toCol]) return false;

  const direction = piece[0] === "w" ? -1 : 1;
  const capturedPawn = board[fromRow][toCol];

  return (
    toRow === enPassantTarget.row &&
    toCol === enPassantTarget.col &&
    toRow - fromRow === direction &&
    Math.abs(toCol - fromCol) === 1 &&
    capturedPawn === (piece[0] === "w" ? "bp" : "wp")
  );
}

function getPromotedPiece(piece, toRow) {
  if (piece[1] === "p" && (toRow === 0 || toRow === 7)) {
    return piece[0] + "q";
  }

  return piece;
}

function isCastlingMove(piece, fromRow, fromCol, toRow, toCol) {
  return (
    piece[1] === "k" &&
    fromRow === toRow &&
    fromCol === 4 &&
    Math.abs(toCol - fromCol) === 2
  );
}

function isLegalCastle(piece, fromRow, fromCol, toRow, toCol) {
  const color = piece[0];
  const row = color === "w" ? 7 : 0;
  const side = toCol > fromCol ? "kingSide" : "queenSide";
  const rookCol = side === "kingSide" ? 7 : 0;
  const step = side === "kingSide" ? 1 : -1;

  if (fromRow !== row || toRow !== row || fromCol !== 4) return false;
  if (!castlingRights[color][side]) return false;
  if (board[row][rookCol] !== color + "r") return false;
  if (isKingInCheck(color)) return false;

  for (let col = fromCol + step; col !== rookCol; col += step) {
    if (board[row][col]) return false;
  }

  for (let col = fromCol + step; col !== toCol + step; col += step) {
    if (isSquareUnderAttack(row, col, color === "w" ? "b" : "w")) {
      return false;
    }
  }

  return true;
}

function moveCastlingRook(row, kingCol) {
  if (kingCol === 6) {
    board[row][5] = board[row][7];
    board[row][7] = "";
    return;
  }

  board[row][3] = board[row][0];
  board[row][0] = "";
}

function updateCastlingRights(piece, fromRow, fromCol, toRow, toCol, capturedPiece) {
  if (piece[1] === "k") {
    castlingRights[piece[0]].kingSide = false;
    castlingRights[piece[0]].queenSide = false;
  }

  if (piece[1] === "r") {
    clearRookCastlingRight(piece[0], fromRow, fromCol);
  }

  if (capturedPiece && capturedPiece[1] === "r") {
    clearRookCastlingRight(capturedPiece[0], toRow, toCol);
  }
}

function getKingDangerState() {
  const outcome = getGameOutcome();

  if (!outcome.inCheck) {
    return { type: "none", king: null, attackers: [], winner: null };
  }

  const king = findKing(currentTurn);

  if (!king) {
    return { type: "none", king: null, attackers: [], winner: null };
  }

  const winnerColor = outcome.type === "checkmate"
    ? (currentTurn === "w" ? "b" : "w")
    : null;

  return {
    type: outcome.type === "checkmate" ? "checkmate" : "check",
    king,
    attackers: getCheckingPieces(king.row, king.col, currentTurn),
    winner: winnerColor ? getPlayerLabel(winnerColor) : null
  };
}

function renderDangerOverlay(dangerState) {
  if (dangerState.type === "none") return;

  const overlay = document.createElement("div");
  overlay.classList.add("danger-overlay");

  if (dangerState.type === "checkmate") {
    overlay.classList.add("checkmate-overlay");
    overlay.innerHTML = `
      <strong>CHECKMATE</strong>
      <span>${dangerState.winner} wins</span>
    `;
  } else {
    overlay.classList.add("check-overlay");
    overlay.textContent = "CHECK!";
  }

  boardElement.appendChild(overlay);
}

function getCheckingPieces(kingRow, kingCol, checkedColor) {
  const attackerColor = checkedColor === "w" ? "b" : "w";
  const attackers = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];

      if (
        piece &&
        piece[0] === attackerColor &&
        canPieceAttackSquare(row, col, kingRow, kingCol, piece)
      ) {
        attackers.push({ row, col });
      }
    }
  }

  return attackers;
}

function getKingDangerKey(dangerState) {
  if (dangerState.type === "none" || !dangerState.king) {
    return "none";
  }

  const attackerKey = dangerState.attackers
    .map(attacker => attacker.row + "," + attacker.col)
    .sort()
    .join("|");

  return [
    dangerState.type,
    dangerState.king.row,
    dangerState.king.col,
    attackerKey
  ].join(":");
}

function clearRookCastlingRight(color, row, col) {
  const homeRow = color === "w" ? 7 : 0;

  if (row !== homeRow) return;

  if (col === 0) {
    castlingRights[color].queenSide = false;
  }

  if (col === 7) {
    castlingRights[color].kingSide = false;
  }
}

function updateEnPassantTarget(piece, fromRow, fromCol, toRow) {
  if (piece[1] === "p" && Math.abs(toRow - fromRow) === 2) {
    enPassantTarget = {
      row: (fromRow + toRow) / 2,
      col: fromCol
    };
    return;
  }

  enPassantTarget = null;
}

function isPathClear(fromRow, fromCol, toRow, toCol) {
  const rowStep = Math.sign(toRow - fromRow);
  const colStep = Math.sign(toCol - fromCol);
  let row = fromRow + rowStep;
  let col = fromCol + colStep;

  while (row !== toRow || col !== toCol) {
    if (board[row][col]) return false;

    row += rowStep;
    col += colStep;
  }

  return true;
}

function isInsideBoard(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function updateStatus() {
  const outcome = getGameOutcome();
  statusElement.classList.remove("status-check", "status-checkmate", "status-stalemate");

  if (outcome.type === "checkmate") {
    statusElement.textContent = outcome.loser + " is checkmated";
    statusElement.classList.add("status-checkmate");
    saveCompletedGameRecord(outcome);
    return;
  }

  if (outcome.type === "stalemate") {
    statusElement.textContent = "Stalemate";
    statusElement.classList.add("status-stalemate");
    saveCompletedGameRecord(outcome);
    return;
  }

  statusElement.textContent = outcome.inCheck
    ? "CHECK! " + outcome.playerName + " is in check"
    : outcome.playerName + " to move";

  if (outcome.inCheck) {
    statusElement.classList.add("status-check");
  }
}

function getGameOutcome() {
  const playerName = getPlayerLabel(currentTurn);
  const inCheck = isKingInCheck(currentTurn);
  const hasLegalMove = hasAnyLegalMove(currentTurn);

  if (inCheck && !hasLegalMove) {
    const winnerColor = currentTurn === "w" ? "b" : "w";
    const winner = getPlayerLabel(winnerColor);

    return {
      type: "checkmate",
      winner,
      loser: playerName,
      result: winner + " won by checkmate",
      playerName,
      inCheck
    };
  }

  if (!inCheck && !hasLegalMove) {
    return {
      type: "stalemate",
      winner: null,
      loser: null,
      result: "Draw by stalemate",
      playerName,
      inCheck
    };
  }

  return {
    type: "active",
    winner: null,
    loser: null,
    result: "In progress",
    playerName,
    inCheck
  };
}

function hasAnyLegalMove(color) {
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];

      if (piece && piece[0] === color) {
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            if (isLegalMove(fromRow, fromCol, toRow, toCol, piece)) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}

function getLegalMoves(color) {
  const moves = [];

  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];

      if (!piece || piece[0] !== color) continue;

      for (let toRow = 0; toRow < 8; toRow++) {
        for (let toCol = 0; toCol < 8; toCol++) {
          if (isLegalMove(fromRow, fromCol, toRow, toCol, piece)) {
            moves.push({
              fromRow,
              fromCol,
              toRow,
              toCol,
              piece,
              capturedPiece: getCapturedPieceForMove(piece, fromRow, fromCol, toRow, toCol)
            });
          }
        }
      }
    }
  }

  return moves;
}

function getCapturedPieceForMove(piece, fromRow, fromCol, toRow, toCol) {
  if (isEnPassantCapture(piece, fromRow, fromCol, toRow, toCol)) {
    return board[fromRow][toCol];
  }

  return board[toRow][toCol];
}

function isBotTurn() {
  return gameMode === "bot" && currentTurn === "b";
}

function scheduleBotMove() {
  clearBotMoveTimer();

  if (!isBotTurn() || !hasAnyLegalMove("b")) return;

  statusElement.textContent = "Bot is thinking";
  botMoveTimer = window.setTimeout(playBotMove, 350);
}

function clearBotMoveTimer() {
  if (botMoveTimer) {
    window.clearTimeout(botMoveTimer);
    botMoveTimer = null;
  }
}

function playBotMove() {
  botMoveTimer = null;

  if (!isBotTurn()) return;

  const moves = getLegalMoves("b");
  const move = chooseBotMove(moves);

  if (!move) return;

  applyMove(move.fromRow, move.fromCol, move.toRow, move.toCol);
}

function chooseBotMove(moves) {
  if (!moves.length) return null;

  if (botDifficulty === "easy") {
    return Math.random() < 0.8
      ? pickRandomMove(moves)
      : pickBestTacticalMove(moves);
  }

  if (botDifficulty === "medium") {
    return pickBestTacticalMove(moves);
  }

  return pickBestMaterialMove(moves);
}

function pickRandomMove(moves) {
  return moves[Math.floor(Math.random() * moves.length)];
}

function pickBestTacticalMove(moves) {
  const scoredMoves = moves.map(move => ({
    move,
    score:
      getCaptureValue(move) * 10 +
      (moveGivesCheck(move) ? 5 : 0) +
      Math.random()
  }));

  scoredMoves.sort((a, b) => b.score - a.score);
  const bestScore = Math.floor(scoredMoves[0].score);
  const bestMoves = scoredMoves
    .filter(entry => Math.floor(entry.score) === bestScore)
    .map(entry => entry.move);

  return pickRandomMove(bestMoves);
}

function pickBestMaterialMove(moves) {
  const scoredMoves = moves.map(move => ({
    move,
    score: scoreMoveWithLookahead(move) + Math.random() * 0.01
  }));

  scoredMoves.sort((a, b) => b.score - a.score);
  return scoredMoves[0].move;
}

function getCaptureValue(move) {
  return move.capturedPiece ? pieceScores[move.capturedPiece[1]] : 0;
}

function moveGivesCheck(move) {
  const snapshot = createGameSnapshot();
  applyMove(move.fromRow, move.fromCol, move.toRow, move.toCol, { render: false });
  const givesCheck = isKingInCheck("w");
  restoreGameSnapshot(snapshot);
  return givesCheck;
}

function scoreMoveWithLookahead(move) {
  const snapshot = createGameSnapshot();
  applyMove(move.fromRow, move.fromCol, move.toRow, move.toCol, { render: false });

  let score = getMaterialScoreForBlack();
  const whiteReplies = getLegalMoves("w");

  if (whiteReplies.length) {
    const bestWhiteReply = Math.max(...whiteReplies.map(getCaptureValue));
    score -= bestWhiteReply;
  }

  if (isKingInCheck("w")) {
    score += 0.35;
  }

  restoreGameSnapshot(snapshot);
  return score;
}

function getMaterialScoreForBlack() {
  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];

      if (!piece) continue;

      const value = pieceScores[piece[1]];
      score += piece[0] === "b" ? value : -value;
    }
  }

  return score;
}

function createGameSnapshot() {
  return {
    board: board.map(row => row.slice()),
    selectedSquare: selectedSquare ? { ...selectedSquare } : null,
    currentTurn,
    capturedByWhite: capturedByWhite.slice(),
    capturedByBlack: capturedByBlack.slice(),
    enPassantTarget: enPassantTarget ? { ...enPassantTarget } : null,
    castlingRights: {
      w: { ...castlingRights.w },
      b: { ...castlingRights.b }
    }
  };
}

function restoreGameSnapshot(snapshot) {
  board = snapshot.board.map(row => row.slice());
  selectedSquare = snapshot.selectedSquare ? { ...snapshot.selectedSquare } : null;
  currentTurn = snapshot.currentTurn;
  capturedByWhite = snapshot.capturedByWhite.slice();
  capturedByBlack = snapshot.capturedByBlack.slice();
  enPassantTarget = snapshot.enPassantTarget ? { ...snapshot.enPassantTarget } : null;
  castlingRights = {
    w: { ...snapshot.castlingRights.w },
    b: { ...snapshot.castlingRights.b }
  };
}

function getPlayerLabel(color) {
  if (color === "b" && gameMode === "bot") {
    return "Bot";
  }

  return color === "w" ? "White Player" : "Black Player";
}

function updateBotControls() {
  gameMode = gameModeSelect.value;
  botDifficulty = botDifficultySelect.value;
  botDifficultyRow.hidden = gameMode !== "bot";
  blackNameInput.disabled = gameMode === "bot";

  if (gameMode === "bot") {
    blackNameInput.value = "Bot";
  }

  selectedSquare = null;
  updateStatus();
  updateScoreboard();
  renderBoard();
  scheduleBotMove();
}

function updateCapturedPieces() {
  renderCapturedList(whiteCapturedElement, capturedByWhite);
  renderCapturedList(blackCapturedElement, capturedByBlack);
}

function renderCapturedList(element, pieces) {
  element.innerHTML = "";

  pieces.forEach(piece => {
    const img = document.createElement("img");
    img.src = pieceImages[piece];
    img.alt = piece;
    element.appendChild(img);
  });
}

function updateScoreboard() {
  whiteScoreElement.textContent = getCaptureScore(capturedByWhite);
  blackScoreElement.textContent = getCaptureScore(capturedByBlack);
  whiteScoreNameElement.textContent = whiteNameInput.value || "White";
  blackScoreNameElement.textContent = blackNameInput.value || "Black";
}

function getCaptureScore(pieces) {
  return pieces.reduce((total, piece) => total + pieceScores[piece[1]], 0);
}

function createMoveRecord(
  movingPiece,
  promotedPiece,
  capturedPiece,
  fromRow,
  fromCol,
  toRow,
  toCol,
  enPassantCapture
) {
  const moveNumber = Math.floor(moveHistory.length / 2) + 1;
  const color = movingPiece[0];
  const pieceType = movingPiece[1];
  const from = getSquareName(fromRow, fromCol);
  const to = getSquareName(toRow, toCol);
  const promoted = promotedPiece !== movingPiece ? promotedPiece[1].toUpperCase() : "";
  const castle = pieceType === "k" && Math.abs(toCol - fromCol) === 2;
  const notation = castle
    ? toCol > fromCol
      ? "O-O"
      : "O-O-O"
    : getPieceLetter(pieceType) +
      from +
      (capturedPiece ? "x" : "-") +
      to +
      (promoted ? "=" + promoted : "") +
      (enPassantCapture ? " e.p." : "");

  return {
    moveNumber,
    color,
    piece: movingPiece,
    from,
    to,
    capturedPiece: capturedPiece || "",
    notation
  };
}

function recordMove(moveRecord) {
  if (!moveRecord) return;

  moveHistory.push(moveRecord);
}

function getSquareName(row, col) {
  return "abcdefgh"[col] + String(8 - row);
}

function getPieceLetter(pieceType) {
  if (pieceType === "p") return "";

  return pieceType.toUpperCase();
}

function updateMoveLog() {
  if (!moveHistory.length) {
    moveLogElement.textContent = "No moves yet";
    return;
  }

  moveLogElement.textContent = formatMoveHistory(moveHistory);
}

function formatMoveHistory(moves) {
  const pairs = [];

  for (let index = 0; index < moves.length; index += 2) {
    const whiteMove = moves[index];
    const blackMove = moves[index + 1];
    const blackText = blackMove ? " " + blackMove.notation : "";
    pairs.push(whiteMove.moveNumber + ". " + whiteMove.notation + blackText);
  }

  return pairs.join("  ");
}

function saveCompletedGameRecord(outcome) {
  if (activeGameRecordSaved || !moveHistory.length) return;

  saveLocalGameRecord(outcome);
  activeGameRecordSaved = true;
}

function saveCurrentGameRecord() {
  if (!moveHistory.length) {
    recordSummaryElement.textContent = "Make at least one move before saving a record.";
    return;
  }

  saveLocalGameRecord(getGameOutcome());
}

function saveLocalGameRecord(outcome) {
  const records = loadLocalGameRecords();
  const now = new Date();
  const record = {
    id: String(now.getTime()),
    savedAt: now.toISOString(),
    startedAt: gameStartedAt,
    mode: gameMode === "bot" ? "Vs Bot (" + botDifficulty + ")" : "Local Two Player",
    whiteName: whiteNameInput.value || "White",
    blackName: gameMode === "bot" ? "Bot" : blackNameInput.value || "Black",
    result: outcome.result,
    moves: moveHistory.map(move => ({ ...move })),
    whiteCaptured: capturedByWhite.slice(),
    blackCaptured: capturedByBlack.slice()
  };

  records.unshift(record);
  if (saveLocalGameRecords(records.slice(0, maxLocalGameRecords))) {
    renderLocalGameRecords();
  }
}

function loadLocalGameRecords() {
  try {
    const rawRecords = window.localStorage.getItem(localGameRecordsKey);
    const records = rawRecords ? JSON.parse(rawRecords) : [];

    return Array.isArray(records) ? records : [];
  } catch (error) {
    return [];
  }
}

function saveLocalGameRecords(records) {
  try {
    window.localStorage.setItem(localGameRecordsKey, JSON.stringify(records));
    return true;
  } catch (error) {
    recordSummaryElement.textContent = "Could not save records in this browser.";
    return false;
  }
}

function clearLocalGameRecords() {
  if (!window.confirm("Clear all saved local game records?")) return;

  try {
    window.localStorage.removeItem(localGameRecordsKey);
  } catch (error) {
    recordSummaryElement.textContent = "Could not clear records in this browser.";
    return;
  }

  renderLocalGameRecords();
}

function renderLocalGameRecords() {
  const records = loadLocalGameRecords();

  recordListElement.innerHTML = "";
  recordSummaryElement.textContent = records.length
    ? records.length + " saved game" + (records.length === 1 ? "" : "s")
    : "No saved games yet";

  records.forEach(record => {
    const card = document.createElement("div");
    card.className = "record-card";

    const title = document.createElement("strong");
    title.textContent = record.result;

    const details = document.createElement("span");
    details.textContent =
      formatRecordDate(record.savedAt) +
      " | " +
      record.whiteName +
      " vs " +
      record.blackName +
      " | " +
      record.mode +
      " | " +
      record.moves.length +
      " moves";

    const moves = document.createElement("span");
    moves.className = "record-moves";
    moves.textContent = formatMoveHistory(record.moves);

    card.appendChild(title);
    card.appendChild(details);
    card.appendChild(moves);
    recordListElement.appendChild(card);
  });
}

function formatRecordDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

document.getElementById("resetBtn").addEventListener("click", createStartingBoard);
saveRecordBtn.addEventListener("click", saveCurrentGameRecord);
clearRecordsBtn.addEventListener("click", clearLocalGameRecords);

document.getElementById("flipBtn").addEventListener("click", () => {
  boardFlipped = !boardFlipped;
  renderBoard();
});

document.getElementById("boardSize").addEventListener("input", event => {
  document.documentElement.style.setProperty(
    "--board-size",
    event.target.value + "px"
  );
});

document.getElementById("glow").addEventListener("input", event => {
  document.documentElement.style.setProperty(
    "--glow",
    event.target.value + "px"
  );
});

document.getElementById("pieceSize").addEventListener("input", event => {
  document.documentElement.style.setProperty(
    "--piece-size",
    event.target.value + "px"
  );
});

gameModeSelect.addEventListener("change", updateBotControls);
botDifficultySelect.addEventListener("change", updateBotControls);
whiteNameInput.addEventListener("input", updateScoreboard);
blackNameInput.addEventListener("input", () => {
  if (gameMode !== "bot") {
    updateScoreboard();
  }
});

renderLocalGameRecords();
createStartingBoard();
updateBotControls();
