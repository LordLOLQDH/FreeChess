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

const update = () => {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    board.boardArr.forEach((sqr, i) => {
        if (sqr !== 0) {
            const square = getSqre(i);
            pieces.drawPiece(pieces.type[sqr], [{ x: square.x, y: square.y }]);
        }
    });
};

// There must be exactly one Stockfish request for every completed White move.
// If another part of the UI asks while the engine is busy, remember the request
// instead of silently dropping it. Rendering itself never starts the engine.
const requestStockfishMove = () => {
    if (typeof stockfishAi === 'undefined' || !stockfishAi || !board) return;
    if (whiteTurn) return;

    if (stockfishAi.busy) {
        stockfishRequestQueued = true;
        return;
    }

    if (stockfishRequestQueued) stockfishRequestQueued = false;
    playStockFishMove = true;
    stockfishAi.playStockfishMove().then(() => {
        // If a duplicate UI event happened while the engine was thinking,
        // service it only when it is still actually Black's turn.
        if (stockfishRequestQueued && !whiteTurn && !stockfishAi.busy) {
            stockfishRequestQueued = false;
            setTimeout(requestStockfishMove, 0);
        }
    }).catch((error) => {
        stockfishRequestQueued = false;
        playStockFishMove = false;
        console.error('Stockfish request failed:', error);
    });
};

const promptUser = (message) => {
    setTimeout(() => {
        if (typeof audio !== 'undefined') audio.playAudio(audio.sound.notify);
        if (window.confirm(message)) window.location.reload();
    }, 1000);
};
