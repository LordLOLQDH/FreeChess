// Mobile controls: tap a piece, then tap its destination.
// Black is AI-controlled and cannot be moved by the player.
let mobileSelectedIndex = null;
let mobileSelectedPiece = null;

function mobileIsOwnPiece(piece) {
    return piece !== 0 && whiteTurn && piece[0] === 'w';
}

function mobileBoardIndexFromEvent(e) {
    const rect = cvs.getBoundingClientRect();
    const scaleX = cvs.width / rect.width;
    const scaleY = cvs.height / rect.height;
    return getBoardIndex((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
}

function mobileClearSelection() {
    mobileSelectedIndex = null;
    mobileSelectedPiece = null;
    update();
}

function mobileCastleMoves(piece, from) {
    if (piece === 'wK' && from === 60 && whiteTurn) {
        const moves = [];
        if (canWhiteCastleRightSide(from, piece, 63)) moves.push(62);
        if (canWhiteCastleLeftSide(from, piece, 56)) moves.push(58);
        return moves;
    }
    return [];
}

function mobileShowSelection() {
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
    ctx.strokeRect(col * sqreScale + 2, row * sqreScale + 2, sqreScale - 4, sqreScale - 4);
}

function mobileTriggerAIIfNeeded() {
    if (!whiteTurn && typeof requestStockfishMove === 'function') {
        setTimeout(requestStockfishMove, 0);
    }
}

function mobileMakeMove(from, to, piece) {
    if (!piece || piece[0] !== 'w' || !whiteTurn || from === null || to === null) return false;

    if (piece === 'wK' && to === 62 && canWhiteCastleRightSide(from, piece, 63)) {
        isCastle = true;
        whiteRightSideCastle();
        whiteTurn = false;
        playStockFishMove = false;
        audio.playAudio(audio.sound.castle);
        mobileTriggerAIIfNeeded();
        return true;
    }
    if (piece === 'wK' && to === 58 && canWhiteCastleLeftSide(from, piece, 56)) {
        isCastle = true;
        whiteLeftSideCastle();
        whiteTurn = false;
        playStockFishMove = false;
        audio.playAudio(audio.sound.castle);
        mobileTriggerAIIfNeeded();
        return true;
    }

    const legalMoves = getPossibleMoves(piece, from) || [];
    if (!legalMoves.includes(to)) return false;

    const capturedPiece = board.boardArr[to] !== 0 ? board.boardArr[to] : 0;
    board.boardArr[to] = piece;
    board.boardArr[from] = 0;
    whiteTurn = false;

    const movedPiece = piece[1] === 'P' && (to < 8 || to >= 56) ? 'wQ' : piece;
    board.boardArr[to] = movedPiece;

    if (piece[1] === 'P' || capturedPiece) halfMoveCount = 0;
    else halfMoveCount++;

    if (piece[1] === 'P') pawnsThatHaveMovedPastOnce.push(to);

    checkWhiteRightCastleLegality(from, piece);
    checkWhiteLeftCastleLegality(from, piece);
    findWhiteDangerSqrs();
    findBlackDangerSqrs();

    isCheck = getPossibleMoves(movedPiece, to).includes(board.boardArr.indexOf('bK'));
    if (whiteDangerSqrs.includes(board.boardArr.indexOf('wK'))) {
        board.boardArr[from] = piece;
        board.boardArr[to] = capturedPiece;
        whiteTurn = true;
        halfMoveCount = Math.max(0, halfMoveCount - 1);
        return false;
    }

    if (isCheck) audio.playAudio(audio.sound.check);
    else audio.playAudio(capturedPiece ? audio.sound.capture : audio.sound.move);

    mobileTriggerAIIfNeeded();
    return true;
}

function setupMobileControls() {
    cvs.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'touch') return;
        e.preventDefault();
        e.stopPropagation();

        if (!whiteTurn) {
            mobileClearSelection();
            return;
        }

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

        if (legalMoves.includes(index)) mobileMakeMove(from, index, movingPiece);

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
