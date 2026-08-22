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

const update = () => {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    board.boardArr.forEach((sqr, i) => {
        if (sqr !== 0) {
            const square = getSqre(i);
            pieces.drawPiece(pieces.type[sqr], [{ x: square.x, y: square.y }]);
        }
    });
};

// Stockfish is called explicitly after a completed human move. Rendering
// must never start the engine, otherwise redraws can trigger duplicate moves.
const requestStockfishMove = () => {
    if (typeof stockfishAi === 'undefined' || !stockfishAi) return;
    if (!board || whiteTurn || stockfishAi.busy) return;
    playStockFishMove = true;
    stockfishAi.playStockfishMove();
};

const promptUser = (message) => {
    setTimeout(() => {
        if (typeof audio !== 'undefined') audio.playAudio(audio.sound.notify);
        if (window.confirm(message)) window.location.reload();
    }, 1000);
};
