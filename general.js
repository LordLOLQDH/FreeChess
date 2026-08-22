const cvs = document.querySelector('canvas');
const ctx = cvs.getContext('2d');
let pieces;
let board;
const sprite = new Image();
sprite.src = './assets/chess_pieces.png';
const pawnsThatHaveMovedPastOnce = [];
let whiteDangerSqrs = [];
let blackDangerSqrs = [];
let isWhiteRightCastleLegal = true;
let isWhiteLeftCastleLegal = true;
let isBlackRightCastleLegal = true;
let isBlackLeftCastleLegal = true;
let whiteTurn = true;
let halfMoveCount = 0;
let fullMoveCount = 1;
let playStockFishMove = false;
let isCheck = false;
let playerLost = false;
let playerWon = false;
let draw = false;
let stockfishRequestQueued = false;
let stockfishRetryTimer = null;

const update = () => {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    board.boardArr.forEach((sqr, i) => {
        if (sqr !== 0) {
            const square = getSqre(i);
            pieces.drawPiece(pieces.type[sqr], [{ x: square.x, y: square.y }]);
        }
    });
};

// Ask Stockfish for Black's move. A failed/empty first response is retried
// automatically while it is still Black's turn, so the first AI reply cannot
// silently disappear.
const requestStockfishMove = () => {
    if (typeof stockfishAi === 'undefined' || !stockfishAi || !board) return;
    if (whiteTurn) return;

    if (stockfishRetryTimer) {
        clearTimeout(stockfishRetryTimer);
        stockfishRetryTimer = null;
    }

    if (stockfishAi.busy) {
        stockfishRequestQueued = true;
        return;
    }

    stockfishRequestQueued = false;
    playStockFishMove = true;

    stockfishAi.playStockfishMove().then((played) => {
        // If the engine/API did not produce a move, do not leave the game
        // permanently waiting. Retry while the position is still Black's turn.
        if (!played && !whiteTurn) {
            playStockFishMove = false;
            stockfishRetryTimer = setTimeout(() => {
                stockfishRetryTimer = null;
                requestStockfishMove();
            }, 250);
            return;
        }

        if (stockfishRequestQueued && !whiteTurn && !stockfishAi.busy) {
            stockfishRequestQueued = false;
            setTimeout(requestStockfishMove, 0);
        }
    }).catch((error) => {
        playStockFishMove = false;
        console.error('Stockfish request failed:', error);
        if (!whiteTurn) {
            stockfishRetryTimer = setTimeout(() => {
                stockfishRetryTimer = null;
                requestStockfishMove();
            }, 250);
        }
    });
};

const promptUser = (message) => {
    setTimeout(() => {
        if (typeof audio !== 'undefined') audio.playAudio(audio.sound.notify);
        if (window.confirm(message)) window.location.reload();
    }, 1000);
};
