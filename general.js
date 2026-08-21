const cvs = document.querySelector('canvas');
const ctx = cvs.getContext('2d');

let pieces;
let board;

const sprite = new Image();
sprite.src = './assets/chess_pieces.png';

const pawnsThatHaveMovedPastOnce = []; // [boardIndex...];
let whiteDangerSqrs = [];
let blackDangerSqrs = [];

let isWhiteRightCastleLegal = true;
let isWhiteLeftCastleLegal = true;
let isBlackRightCastleLegal = true;
let isBlackLeftCastleLegal = true;

let whiteTurn = true; // change this to decide who starts first (false = black, true = white)

let halfMoveCount = 0;
let fullMoveCount = 1;

let playStockFishMove = false;

let isCheck = false;

let playerLost = false;
let playerWon = false;
let draw = false;

// Redraw the board from the current board state.
// The canvas must be cleared first; otherwise old pieces remain visible
// and make Stockfish moves appear duplicated or one move behind.
const update = () => {
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    board.boardArr.forEach((sqr, i) => {
        if (sqr !== 0) {
            const square = getSqre(i);
            pieces.drawPiece(pieces.type[sqr], [{ x: square.x, y: square.y }]);
        }
    });

    if (playStockFishMove) {
        playStockFishMove = false;
        stockfishAi.playStockfishMove();
    }
};

const promptUser = (message) => {
    setTimeout(() => {
        audio.playAudio(audio.sound.notify);
        if (window.confirm(message)) {
            window.location.reload(); // Refresh the page
        }
    }, 1000);
};
