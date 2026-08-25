/* =========================================================
   FREECHESS RULES ENGINE
   chess.js is the single source of truth for legal chess rules.
   The existing canvas UI remains responsible for rendering.
   ========================================================= */

let fcRules = null;

function fcCreateRules() {
    if (typeof Chess !== 'function') {
        console.error('chess.js konnte nicht geladen werden.');
        return null;
    }
    fcRules = new Chess();
    fcSyncBoardFromRules();
    return fcRules;
}

function fcEnsureRules() {
    if (!fcRules) fcCreateRules();
    return fcRules;
}

function fcSyncBoardFromRules() {
    if (!fcRules || typeof board === 'undefined' || !board) return;

    const next = new Array(64).fill(0);
    const rows = fcRules.board();
    const map = {
        wp: 'wP', wn: 'wN', wb: 'wB', wr: 'wR', wq: 'wQ', wk: 'wK',
        bp: 'bP', bn: 'bN', bb: 'bB', br: 'bR', bq: 'bQ', bk: 'bK'
    };

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const p = rows[row][col];
            if (p) next[row * 8 + col] = map[p.color + p.type];
        }
    }

    board.boardArr = next;

    whiteTurn = fcRules.turn() === 'w';
    isCheck = fcRules.isCheck();

    const fenParts = fcRules.fen().split(' ');
    const rights = fenParts[2] || '-';
    isWhiteRightCastleLegal = rights.includes('K');
    isWhiteLeftCastleLegal = rights.includes('Q');
    isBlackRightCastleLegal = rights.includes('k');
    isBlackLeftCastleLegal = rights.includes('q');
    halfMoveCount = Number(fenParts[4]) || 0;
    fullMoveCount = Number(fenParts[5]) || 1;

    whiteDangerSqrs = [];
    blackDangerSqrs = [];
}

function fcResetRules() {
    if (!fcEnsureRules()) return false;
    fcRules.reset();
    fcSyncBoardFromRules();
    playerLost = false;
    playerWon = false;
    draw = false;
    playStockFishMove = false;
    return true;
}

function fcPlayerMove(from, to, promotion = 'q') {
    const chess = fcEnsureRules();
    if (!chess || chess.turn() !== 'w') return false;

    try {
        const move = chess.move({ from, to, promotion });
        if (!move) return false;
        fcSyncBoardFromRules();
        return true;
    } catch (error) {
        console.warn('Illegaler Spielerzug:', from, to, error);
        return false;
    }
}

function fcStockfishMove(uci) {
    const chess = fcEnsureRules();
    if (!chess || chess.turn() !== 'b') return false;

    const moveText = String(uci || '').trim();
    const from = moveText.slice(0, 2);
    const to = moveText.slice(2, 4);
    const promotion = moveText.length >= 5 ? moveText[4].toLowerCase() : undefined;

    if (!/^[a-h][1-8][a-h][1-8](?:[qrbn])?$/.test(moveText)) return false;

    try {
        const move = chess.move({ from, to, ...(promotion ? { promotion } : {}) });
        if (!move) return false;
        fcSyncBoardFromRules();
        return true;
    } catch (error) {
        console.error('Illegaler Stockfish-Zug:', moveText, error);
        return false;
    }
}

function fcGameOver() {
    return !!fcRules && fcRules.isGameOver();
}

function fcCheckmate() {
    return !!fcRules && fcRules.isCheckmate();
}

function fcDraw() {
    return !!fcRules && fcRules.isDraw();
}

function fcCurrentFen() {
    return fcRules ? fcRules.fen() : '';
}

// Initialise before the UI starts accepting moves.
fcCreateRules();
