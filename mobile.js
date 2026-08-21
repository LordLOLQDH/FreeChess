// Mobile touch controls: tap a piece, then tap its destination.
// Desktop drag-and-drop remains handled by controls.js.

let mobileSelectedIndex = null;
let mobileSelectedPiece = null;

function mobileIsOwnPiece(piece) {
    return piece !== 0 &&
        ((whiteTurn && piece[0] === 'w') || (!whiteTurn && piece[0] === 'b'));
}

function mobileBoardIndexFromEvent(e) {
    const rect = cvs.getBoundingClientRect();
    const scaleX = cvs.width / rect.width;
    const scaleY = cvs.height / rect.height;
    return getBoardIndex(
        (e.clientX - rect.left) * scaleX,
        (e.clientY - rect.top) * scaleY
    );
}

function mobileClearSelection() {
    mobileSelectedIndex = null;
    mobileSelectedPiece = null;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    update();
}

/*
 * IMPORTANT:
 * The original castle helpers use the ROOK square as their destination:
 * white: king e1 -> rook h1/a1 (63/56)
 * black: king e8 -> rook h8/a8 (7/0)
 *
 * The mobile UI is normal chess notation, so the player taps g1/c1/g8/c8.
 * We translate those destinations here instead of changing the original
 * chess rules.
 */
function mobileCastleMoves(piece, from) {
    if (piece === 'wK' && from === 60 && whiteTurn) {
        const moves = [];

        if (canWhiteCastleRightSide(from, piece, 63)) moves.push(62); // e1 -> g1
        if (canWhiteCastleLeftSide(from, piece, 56)) moves.push(58);  // e1 -> c1

        return moves;
    }

    if (piece === 'bK' && from === 4 && !whiteTurn) {
        const moves = [];

        if (canBlackCastleRightSide(from, piece, 7)) moves.push(6); // e8 -> g8
        if (canBlackCastleLeftSide(from, piece, 0)) moves.push(2);  // e8 -> c8

        return moves;
    }

    return [];
}

function mobileShowSelection() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    update();

    if (mobileSelectedIndex === null || mobileSelectedPiece === null) return;

    const moves = [
        ...(getPossibleMoves(mobileSelectedPiece, mobileSelectedIndex) || []),
        ...mobileCastleMoves(mobileSelectedPiece, mobileSelectedIndex)
    ];

    for (const index of moves) {
        const row = Math.floor(index / 8);
        const col = index % 8;
        ctx.fillStyle = 'rgba(0, 170, 255, 0.32)';
        ctx.fillRect(col * sqreScale, row * sqreScale, sqreScale, sqreScale);
    }

    const row = Math.floor(mobileSelectedIndex / 8);
    const col = mobileSelectedIndex % 8;
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.95)';
    ctx.lineWidth = 4;
    ctx.strokeRect(
        col * sqreScale + 2,
        row * sqreScale + 2,
        sqreScale - 4,
        sqreScale - 4
    );
}

function mobileMakeMove(from, to, piece) {
    if (!piece || from === null || to === null) return false;

    // Mobile uses the actual king destination (g1/c1/g8/c8), while the
    // existing castle helpers expect the rook destination (h1/a1/h8/a8).
    if (piece === 'wK' && to === 62 && canWhiteCastleRightSide(from, piece, 63)) {
        isCastle = true;
        whiteRightSideCastle();
        whiteTurn = !whiteTurn;
        playStockFishMove = true;
        audio.playAudio(audio.sound.move);
        return true;
    }

    if (piece === 'wK' && to === 58 && canWhiteCastleLeftSide(from, piece, 56)) {
        isCastle = true;
        whiteLeftSideCastle();
        whiteTurn = !whiteTurn;
        playStockFishMove = true;
        audio.playAudio(audio.sound.move);
        return true;
    }

    if (piece === 'bK' && to === 6 && canBlackCastleRightSide(from, piece, 7)) {
        isCastle = true;
        blackRightSideCastle();
        whiteTurn = !whiteTurn;
        playStockFishMove = false;
        audio.playAudio(audio.sound.move);
        return true;
    }

    if (piece === 'bK' && to === 2 && canBlackCastleLeftSide(from, piece, 0)) {
        isCastle = true;
        blackLeftSideCastle();
        whiteTurn = !whiteTurn;
        playStockFishMove = false;
        audio.playAudio(audio.sound.move);
        return true;
    }

    const legalMoves = getPossibleMoves(piece, from) || [];
    if (!legalMoves.includes(to)) return false;

    const capturedPiece = board.boardArr[to] !== 0 ? board.boardArr[to] : 0;

    board.boardArr[to] = piece;
    board.boardArr[from] = 0;

    whiteTurn = !whiteTurn;
    halfMoveCount++;
    fullMoveCount = roundToWhole(halfMoveCount / 2);
    playStockFishMove = whiteTurn === false;

    if (board.boardArr[to][1] === 'P') {
        pawnsThatHaveMovedPastOnce.push(to);
    }

    checkWhiteRightCastleLegality(from, piece);
    checkWhiteLeftCastleLegality(from, piece);
    checkBlackRightCastleLegality(from, piece);
    checkBlackLeftCastleLegality(from, piece);

    findWhiteDangerSqrs();
    findBlackDangerSqrs();

    if (whiteTurn === false) {
        if (getPossibleMoves(piece, to).includes(board.boardArr.indexOf('bK'))) {
            isCheck = true;
        } else {
            isCheck = false;
        }

        if (whiteDangerSqrs.includes(board.boardArr.indexOf('wK'))) {
            board.boardArr[from] = piece;
            board.boardArr[to] = capturedPiece;
            whiteTurn = piece[0] === 'w';
            halfMoveCount--;
            fullMoveCount = roundToWhole(halfMoveCount / 2);
            playStockFishMove = false;
            return false;
        }
    } else {
        playStockFishMove = false;

        if (blackDangerSqrs.includes(board.boardArr.indexOf('bK'))) {
            board.boardArr[from] = piece;
            board.boardArr[to] = capturedPiece;
            whiteTurn = piece[0] === 'w';
            halfMoveCount--;
            fullMoveCount = roundToWhole(halfMoveCount / 2);
            playStockFishMove = false;
            return false;
        }
    }

    if (isCheck === false) {
        audio.playAudio(capturedPiece ? audio.sound.capture : audio.sound.move);
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

        if (mobileSelectedIndex === null) {
            if (mobileIsOwnPiece(piece)) {
                mobileSelectedIndex = index;
                mobileSelectedPiece = piece;
                mobileShowSelection();
            }
            return;
        }

        // Tapping another own piece switches selection.
        if (mobileIsOwnPiece(piece)) {
            mobileSelectedIndex = index;
            mobileSelectedPiece = piece;
            mobileShowSelection();
            return;
        }

        const from = mobileSelectedIndex;
        const movingPiece = mobileSelectedPiece;
        const legalMoves = [
            ...(getPossibleMoves(movingPiece, from) || []),
            ...mobileCastleMoves(movingPiece, from)
        ];

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
