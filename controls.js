// Desktop controls: drag white pieces. Black is AI-controlled.
const stockfishAi = new Stockfish();
let isDown = false;
let draggedPiece = null;
let prevSqrIndex = null;
let possibleSqres = [];

function desktopBoardIndex(e) {
    const rect = cvs.getBoundingClientRect();
    const scaleX = cvs.width / rect.width;
    const scaleY = cvs.height / rect.height;
    return getBoardIndex((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
}

function desktopResetDrag() {
    isDown = false;
    draggedPiece = null;
    prevSqrIndex = null;
    possibleSqres = [];
}

sprite.onload = () => {
    if (typeof fcResetRules === 'function') fcResetRules();
    update();
    drawBoard();

    document.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return;
        if (!whiteTurn || (typeof fcGameOver === 'function' && fcGameOver())) return;

        const index = desktopBoardIndex(e);
        const piece = board.boardArr[index];
        if (!piece || piece[0] !== 'w') return;

        isDown = true;
        prevSqrIndex = index;
        draggedPiece = piece;
        possibleSqres = (getPossibleMoves(piece, index) || []).slice();
        highlight(possibleSqres);
        update();
        drawBoard();
    });

    document.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch' || !isDown || !draggedPiece) return;
        const rect = cvs.getBoundingClientRect();
        const scaleX = cvs.width / rect.width;
        const scaleY = cvs.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        update();
        pieces.drawPiece(pieces.type[draggedPiece], [{
            x: x - pieces.pieceScale / 2,
            y: y - pieces.pieceScale / 2
        }]);
    });

    document.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'touch') return;
        if (!isDown || !draggedPiece) return;

        const from = prevSqrIndex;
        const to = desktopBoardIndex(e);
        const piece = draggedPiece;
        const oldPiece = board.boardArr[to];
        const wasCapture = oldPiece !== 0 && oldPiece[0] === 'b';

        const moved = possibleSqres.includes(to) && typeof fcPlayerMove === 'function'
            ? fcPlayerMove(getSquareNameFromIndex(from), getSquareNameFromIndex(to), 'q')
            : false;

        desktopResetDrag();

        if (moved) {
            if (piece[1] === 'K' && Math.abs(to - from) === 2) {
                audio.playAudio(audio.sound.castle);
            } else if (wasCapture) {
                audio.playAudio(audio.sound.capture);
            } else {
                audio.playAudio(audio.sound.move);
            }
            update();
            drawBoard();
            if (!whiteTurn && typeof requestStockfishMove === 'function') requestStockfishMove();
        } else {
            update();
            drawBoard();
        }
    });

    document.addEventListener('pointercancel', (e) => {
        if (e.pointerType === 'touch') return;
        desktopResetDrag();
        update();
        drawBoard();
    });
};

function getSquareNameFromIndex(index) {
    return 'abcdefgh'[index % 8] + (8 - Math.floor(index / 8));
}
