/* =========================================================
   FREECHESS – MOBILE CONTROLS
   Tap a white piece, then tap the destination square.
   chess.js is the only authority for legal moves.
   ========================================================= */

let mobileSelectedIndex = null;
let mobileSelectedPiece = null;

function mobileSquare(index) {
    return 'abcdefgh'[index % 8] + (8 - Math.floor(index / 8));
}

function mobileBoardIndexFromEvent(event) {
    const rect = cvs.getBoundingClientRect();
    if (!rect.width || !rect.height) return -1;

    const x = (event.clientX - rect.left) * (cvs.width / rect.width);
    const y = (event.clientY - rect.top) * (cvs.height / rect.height);
    const col = Math.floor(x / sqreScale);
    const row = Math.floor(y / sqreScale);

    if (row < 0 || row > 7 || col < 0 || col > 7) return -1;
    return row * 8 + col;
}

function mobileClearSelection(redraw = true) {
    mobileSelectedIndex = null;
    mobileSelectedPiece = null;
    if (redraw) {
        update();
        drawBoard();
    }
}

function mobileLegal(index) {
    if (!fcRules || index < 0 || index >= 64) return [];

    try {
        return fcRules.moves({
            square: mobileSquare(index),
            verbose: true
        }).map(move => {
            const col = move.to.charCodeAt(0) - 97;
            const row = 8 - Number(move.to[1]);
            return row * 8 + col;
        });
    } catch (error) {
        console.error('Mobile: legale Züge konnten nicht ermittelt werden:', error);
        return [];
    }
}

function mobileShowSelection() {
    update();
    drawBoard();

    if (mobileSelectedIndex === null) return;

    for (const index of mobileLegal(mobileSelectedIndex)) {
        const row = Math.floor(index / 8);
        const col = index % 8;
        ctx.fillStyle = 'rgba(0,170,255,.32)';
        ctx.fillRect(col * sqreScale, row * sqreScale, sqreScale, sqreScale);
    }

    const row = Math.floor(mobileSelectedIndex / 8);
    const col = mobileSelectedIndex % 8;
    ctx.strokeStyle = 'rgba(255,215,0,.95)';
    ctx.lineWidth = 4;
    ctx.strokeRect(col * sqreScale + 2, row * sqreScale + 2, sqreScale - 4, sqreScale - 4);
}

function mobileMakeMove(from, to) {
    if (from === null || to === null || !fcRules || !whiteTurn) return false;
    if (typeof fcGameOver === 'function' && fcGameOver()) return false;
    if (!mobileLegal(from).includes(to)) return false;

    const piece = board.boardArr[from];
    const target = board.boardArr[to];
    const wasCapture = target !== 0 && target[0] === 'b';
    const wasCastle = piece === 'wK' && Math.abs(to - from) === 2;

    let moved = false;
    try {
        moved = fcPlayerMove(mobileSquare(from), mobileSquare(to), 'q');
    } catch (error) {
        console.error('Mobile: Spielerzug fehlgeschlagen:', error);
    }

    if (!moved) return false;

    if (typeof audio !== 'undefined') {
        if (wasCastle) audio.playAudio(audio.sound.castle);
        else if (wasCapture) audio.playAudio(audio.sound.capture);
        else audio.playAudio(audio.sound.move);
    }

    update();
    drawBoard();

    if (!whiteTurn && typeof requestStockfishMove === 'function' &&
        !(typeof fcGameOver === 'function' && fcGameOver())) {
        setTimeout(requestStockfishMove, 0);
    }

    return true;
}

function mobileHandlePointer(event) {
    if (event.pointerType !== 'touch') return;

    event.preventDefault();
    event.stopPropagation();

    if (!whiteTurn || (typeof fcGameOver === 'function' && fcGameOver())) {
        mobileClearSelection();
        return;
    }

    const index = mobileBoardIndexFromEvent(event);
    if (index < 0) return;

    const piece = board.boardArr[index];

    if (mobileSelectedIndex === null) {
        if (piece && piece[0] === 'w') {
            mobileSelectedIndex = index;
            mobileSelectedPiece = piece;
            mobileShowSelection();
        }
        return;
    }

    /* Tapping another white piece changes the selection. */
    if (piece && piece[0] === 'w') {
        mobileSelectedIndex = index;
        mobileSelectedPiece = piece;
        mobileShowSelection();
        return;
    }

    const from = mobileSelectedIndex;
    const moved = mobileMakeMove(from, index);

    if (moved) {
        mobileClearSelection();
        return;
    }

    /* Illegal destination: keep the selected piece highlighted. */
    mobileSelectedIndex = from;
    mobileSelectedPiece = board.boardArr[from];
    mobileShowSelection();
}

function setupMobileControls() {
    if (!cvs) return;

    cvs.addEventListener('pointerdown', mobileHandlePointer, { passive: false });

    cvs.addEventListener('pointerup', event => {
        if (event.pointerType === 'touch') {
            event.preventDefault();
            event.stopPropagation();
        }
    }, { passive: false });

    cvs.addEventListener('pointercancel', event => {
        if (event.pointerType === 'touch') {
            event.preventDefault();
            event.stopPropagation();
            mobileClearSelection();
        }
    }, { passive: false });
}

setupMobileControls();
