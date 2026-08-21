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

function mobileShowSelection() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    update();

    if (mobileSelectedIndex === null || mobileSelectedPiece === null) return;

    const moves = getPossibleMoves(mobileSelectedPiece, mobileSelectedIndex) || [];

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

    if (canWhiteCastleRightSide(from, piece, to)) {
        whiteRightSideCastle();
        whiteTurn = false;
        playStockFishMove = true;
        audio.playAudio(audio.sound.move);
        return true;
    }

    if (canWhiteCastleLeftSide(from, piece, to)) {
        whiteLeftSideCastle();
        whiteTurn = false;
        playStockFishMove = true;
        audio.playAudio(audio.sound.move);
        return true;
    }

    if (canBlackCastleRightSide(from, piece, to)) {
        blackRightSideCastle();
        whiteTurn = true;
        playStockFishMove = false;
        audio.playAudio(audio.sound.move);
        return true;
    }

    if (canBlackCastleLeftSide(from, piece, to)) {
        blackLeftSideCastle();
        whiteTurn = true;
        playStockFishMove = false;
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
        // This is intentionally handled before destination logic.
        if (mobileIsOwnPiece(piece)) {
            mobileSelectedIndex = index;
            mobileSelectedPiece = piece;
            mobileShowSelection();
            return;
        }

        // Second tap: attempt the selected move.
        const from = mobileSelectedIndex;
        const movingPiece = mobileSelectedPiece;
        const legalMoves = getPossibleMoves(movingPiece, from) || [];

        if (legalMoves.includes(index) ||
            canWhiteCastleRightSide(from, movingPiece, index) ||
            canWhiteCastleLeftSide(from, movingPiece, index) ||
            canBlackCastleRightSide(from, movingPiece, index) ||
            canBlackCastleLeftSide(from, movingPiece, index)) {
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
