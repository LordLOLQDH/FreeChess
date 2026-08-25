/* =========================================================
   FREECHESS – MOBILE TAP CONTROLS
   Tap a white piece, then tap its destination square.
   Touch input is handled through click so iPhone/iPad Safari
   cannot lose the event because of pointer-event handling.
   chess.js remains the only authority for legal moves.
   ========================================================= */

let mobileSelectedIndex = null;

function mobileIndexToSquare(index) {
    return 'abcdefgh'[index % 8] + (8 - Math.floor(index / 8));
}

function mobileIndexFromClientPoint(clientX, clientY) {
    if (!cvs) return -1;

    const rect = cvs.getBoundingClientRect();
    if (!rect.width || !rect.height) return -1;

    const x = (clientX - rect.left) * (cvs.width / rect.width);
    const y = (clientY - rect.top) * (cvs.height / rect.height);

    const col = Math.floor(x / sqreScale);
    const row = Math.floor(y / sqreScale);

    if (row < 0 || row > 7 || col < 0 || col > 7) return -1;
    return row * 8 + col;
}

function mobileLegalDestinations(index) {
    if (!fcRules || index < 0 || index >= 64) return [];

    try {
        return fcRules.moves({
            square: mobileIndexToSquare(index),
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

function mobileRedrawSelection() {
    update();
    drawBoard();

    if (mobileSelectedIndex === null) return;

    const legal = mobileLegalDestinations(mobileSelectedIndex);

    for (const index of legal) {
        const row = Math.floor(index / 8);
        const col = index % 8;
        ctx.fillStyle = 'rgba(0,170,255,.32)';
        ctx.fillRect(col * sqreScale, row * sqreScale, sqreScale, sqreScale);
    }

    const row = Math.floor(mobileSelectedIndex / 8);
    const col = mobileSelectedIndex % 8;
    ctx.strokeStyle = 'rgba(255,215,0,.95)';
    ctx.lineWidth = 4;
    ctx.strokeRect(
        col * sqreScale + 2,
        row * sqreScale + 2,
        sqreScale - 4,
        sqreScale - 4
    );
}

function mobileClearSelection() {
    mobileSelectedIndex = null;
    update();
    drawBoard();
}

function mobileTryMove(from, to) {
    if (from === null || to === null) return false;
    if (!fcRules || !whiteTurn) return false;
    if (typeof fcGameOver === 'function' && fcGameOver()) return false;

    const legal = mobileLegalDestinations(from);
    if (!legal.includes(to)) return false;

    const piece = board.boardArr[from];
    const target = board.boardArr[to];
    const wasCapture = target !== 0 && target[0] === 'b';
    const wasCastle = piece === 'wK' && Math.abs(to - from) === 2;

    let moved = false;

    try {
        moved = fcPlayerMove(
            mobileIndexToSquare(from),
            mobileIndexToSquare(to),
            'q'
        );
    } catch (error) {
        console.error('Mobile: Spielerzug fehlgeschlagen:', error);
        return false;
    }

    if (!moved) return false;

    mobileSelectedIndex = null;

    if (typeof audio !== 'undefined' && audio && typeof audio.playAudio === 'function') {
        if (wasCastle) audio.playAudio(audio.sound.castle);
        else if (wasCapture) audio.playAudio(audio.sound.capture);
        else audio.playAudio(audio.sound.move);
    }

    update();
    drawBoard();

    if (!whiteTurn &&
        typeof requestStockfishMove === 'function' &&
        !(typeof fcGameOver === 'function' && fcGameOver())) {
        setTimeout(requestStockfishMove, 0);
    }

    return true;
}

function mobileHandleClick(event) {
    /* Desktop drag controls handle mouse input. This handler is for taps. */
    if (event.detail === 0) return;

    event.preventDefault();
    event.stopPropagation();

    if (!whiteTurn || (typeof fcGameOver === 'function' && fcGameOver())) {
        mobileClearSelection();
        return;
    }

    const index = mobileIndexFromClientPoint(event.clientX, event.clientY);
    if (index < 0) return;

    const piece = board.boardArr[index];

    /* First tap: select a white piece. */
    if (mobileSelectedIndex === null) {
        if (piece && piece[0] === 'w') {
            mobileSelectedIndex = index;
            mobileRedrawSelection();
        }
        return;
    }

    /* Tap another white piece: switch selection. */
    if (piece && piece[0] === 'w') {
        mobileSelectedIndex = index;
        mobileRedrawSelection();
        return;
    }

    const from = mobileSelectedIndex;

    if (mobileTryMove(from, index)) {
        return;
    }

    /* Illegal destination: keep the original selection. */
    mobileSelectedIndex = from;
    mobileRedrawSelection();
}

function setupMobileControls() {
    if (!cvs) return;

    /*
       Safari dispatches a normal click after a finger tap.
       The desktop pointer handlers explicitly ignore touch,
       so there is no conflict between the two control systems.
    */
    cvs.addEventListener('click', mobileHandleClick, { passive: false });
}

setupMobileControls();
