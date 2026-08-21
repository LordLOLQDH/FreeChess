// Touch controls for phones/tablets.
// Desktop drag-and-drop remains handled by controls.js.

let mobileSelectedIndex = null;
let mobileSelectedPiece = null;

function mobileIsOwnPiece(piece) {
    return piece !== 0 && ((whiteTurn && piece[0] === 'w') || (!whiteTurn && piece[0] === 'b'));
}

function mobileClearSelection() {
    mobileSelectedIndex = null;
    mobileSelectedPiece = null;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    update();
}

function mobileBoardIndexFromEvent(e) {
    const rect = cvs.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (cvs.width / rect.width);
    const y = (e.clientY - rect.top) * (cvs.height / rect.height);
    return getBoardIndex(x, y);
}

// Castling is a special king move and is not included by getPossibleMoves().
// Handle it explicitly for the tap-to-move controls.
function mobileCastleSquares(piece, from) {
    if (piece === 'wK' && from === 60 && whiteTurn) {
        const squares = [];
        if (
            isWhiteRightCastleLegal &&
            board.boardArr[63] === 'wR' &&
            board.boardArr[61] === 0 &&
            board.boardArr[62] === 0 &&
            !whiteDangerSqrs.includes(60) &&
            !whiteDangerSqrs.includes(61) &&
            !whiteDangerSqrs.includes(62)
        ) squares.push(62);

        if (
            isWhiteLeftCastleLegal &&
            board.boardArr[56] === 'wR' &&
            board.boardArr[59] === 0 &&
            board.boardArr[58] === 0 &&
            board.boardArr[57] === 0 &&
            !whiteDangerSqrs.includes(60) &&
            !whiteDangerSqrs.includes(59) &&
            !whiteDangerSqrs.includes(58)
        ) squares.push(58);

        return squares;
    }

    if (piece === 'bK' && from === 4 && !whiteTurn) {
        const squares = [];
        if (
            isBlackRightCastleLegal &&
            board.boardArr[7] === 'bR' &&
            board.boardArr[5] === 0 &&
            board.boardArr[6] === 0 &&
            !blackDangerSqrs.includes(4) &&
            !blackDangerSqrs.includes(5) &&
            !blackDangerSqrs.includes(6)
        ) squares.push(6);

        if (
            isBlackLeftCastleLegal &&
            board.boardArr[0] === 'bR' &&
            board.boardArr[3] === 0 &&
            board.boardArr[2] === 0 &&
            board.boardArr[1] === 0 &&
            !blackDangerSqrs.includes(4) &&
            !blackDangerSqrs.includes(3) &&
            !blackDangerSqrs.includes(2)
        ) squares.push(2);

        return squares;
    }

    return [];
}

function mobileAllMoves(piece, from) {
    return [
        ...(getPossibleMoves(piece, from) || []),
        ...mobileCastleSquares(piece, from)
    ];
}

function mobileShowSelection() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    update();

    if (mobileSelectedIndex === null || mobileSelectedPiece === null) return;

    const moves = mobileAllMoves(mobileSelectedPiece, mobileSelectedIndex);

    for (const index of moves) {
        const row = Math.floor(index / 8);
        const col = index % 8;
        ctx.fillStyle = 'rgba(0, 170, 255, 0.32)';
        ctx.fillRect(col * 60, row * 60, 60, 60);
    }

    const row = Math.floor(mobileSelectedIndex / 8);
    const col = mobileSelectedIndex % 8;
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.95)';
    ctx.lineWidth = 4;
    ctx.strokeRect(col * 60 + 2, row * 60 + 2, 56, 56);
}

function mobileMakeMove(from, to, piece) {
    if (!piece || from === null || to === null) return false;

    // Castling: king and rook are moved together.
    const castleSquares = mobileCastleSquares(piece, from);
    if (castleSquares.includes(to)) {
        if (piece === 'wK' && to === 62) {
            whiteRightSideCastle();
        } else if (piece === 'wK' && to === 58) {
            whiteLeftSideCastle();
        } else if (piece === 'bK' && to === 6) {
            blackRightSideCastle();
        } else if (piece === 'bK' && to === 2) {
            blackLeftSideCastle();
        } else {
            return false;
        }

        halfMoveCount++;
        fullMoveCount = roundToWhole(halfMoveCount / 2);
        whiteTurn = !whiteTurn;
        playStockFishMove = whiteTurn === false;
        whiteDangerSqrs = [];
        blackDangerSqrs = [];
        audio.playAudio(audio.sound.move);
        return true;
    }

    const legalMoves = getPossibleMoves(piece, from) || [];
    if (!legalMoves.includes(to)) return false;

    const captured = board.boardArr[to] !== 0;

    board.boardArr[to] = piece;
    board.boardArr[from] = 0;

    whiteTurn = !whiteTurn;
    halfMoveCount++;
    fullMoveCount = roundToWhole(halfMoveCount / 2);
    playStockFishMove = whiteTurn === false;

    if (piece[1] === 'P') {
        pawnsThatHaveMovedPastOnce.push(to);

        // Automatic queen promotion for the mobile version.
        const row = Math.floor(to / 8);
        if ((piece[0] === 'w' && row === 0) || (piece[0] === 'b' && row === 7)) {
            board.boardArr[to] = piece[0] + 'Q';
        }
    }

    checkWhiteRightCastleLegality(from, piece);
    checkWhiteLeftCastleLegality(from, piece);
    checkBlackRightCastleLegality(from, piece);
    checkBlackLeftCastleLegality(from, piece);

    whiteDangerSqrs = [];
    blackDangerSqrs = [];
    findWhiteDangerSqrs();
    findBlackDangerSqrs();

    if (isCheck === false) {
        audio.playAudio(captured ? audio.sound.capture : audio.sound.move);
    } else {
        audio.playAudio(audio.sound.check);
    }

    return true;
}

function setupMobileControls() {
    cvs.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') return;

        e.preventDefault();
        e.stopPropagation();

        const index = mobileBoardIndexFromEvent(e);
        if (index < 0 || index >= 64) return;

        const piece = board.boardArr[index];

        // First tap: select a piece. The board itself is never modified.
        if (mobileSelectedIndex === null) {
            if (mobileIsOwnPiece(piece)) {
                mobileSelectedIndex = index;
                mobileSelectedPiece = piece;
                mobileShowSelection();
            }
            return;
        }

        // Tap another own piece: simply switch the selection.
        if (mobileIsOwnPiece(piece)) {
            mobileSelectedIndex = index;
            mobileSelectedPiece = piece;
            mobileShowSelection();
            return;
        }

        // Second tap: attempt the selected move.
        const from = mobileSelectedIndex;
        const movingPiece = mobileSelectedPiece;
        const legalMoves = mobileAllMoves(movingPiece, from);

        if (legalMoves.includes(index)) {
            mobileMakeMove(from, index, movingPiece);
        }

        mobileClearSelection();
        drawBoard();
    }, { passive: false });

    cvs.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'touch') {
            e.preventDefault();
            e.stopPropagation();
        }
    }, { passive: false });

    cvs.addEventListener('pointercancel', (e) => {
        if (e.pointerType === 'touch') {
            e.preventDefault();
            e.stopPropagation();
            mobileClearSelection();
            drawBoard();
        }
    }, { passive: false });
}

setupMobileControls();
