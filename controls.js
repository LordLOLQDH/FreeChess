// controls
const stockfishAi = new Stockfish();

let isDrag = false;
let isDown = false;
let isUp = true;
let possibleSqres = [];
let prevSqrIndex = null;
let draggedPiece = null;
let capturedPiece = 0;
let isStoreSqr = true;

// Mobile: tap a piece first, then tap its destination.
let mobileTapSelected = false;

function resetMobileSelection(restorePiece = true) {
    if (restorePiece && mobileTapSelected && draggedPiece !== null && prevSqrIndex !== null) {
        board.boardArr[prevSqrIndex] = draggedPiece;
    }

    draggedPiece = null;
    possibleSqres = [];
    capturedPiece = 0;
    prevSqrIndex = null;
    mobileTapSelected = false;
}

sprite.onload = () => {
    board.init();
    update();
    drawBoard();

    // Prevent Safari scrolling/zooming while touching the chessboard.
    cvs.style.touchAction = 'none';

    document.addEventListener('pointerdown', (e) => {
        const rect = cvs.getBoundingClientRect();
        const scaleX = cvs.width / rect.width;
        const scaleY = cvs.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        const boardIndex = getBoardIndex(mouseX, mouseY);

        // MOBILE: piece tap -> destination tap.
        if (e.pointerType === 'touch') {
            e.preventDefault();

            const sqr = board.boardArr[boardIndex];

            // A piece is already selected: this tap is the destination.
            if (mobileTapSelected && draggedPiece !== null) {
                if (possibleSqres.includes(boardIndex)) {
                    // Put the piece back temporarily so the existing move
                    // handling can process the destination normally.
                    board.boardArr[prevSqrIndex] = 0;
                    mobileTapSelected = false;
                    isDown = false;
                    isUp = true;

                    const moveEvent = new PointerEvent('pointerup', {
                        bubbles: true,
                        pointerType: 'touch',
                        clientX: e.clientX,
                        clientY: e.clientY
                    });
                    document.dispatchEvent(moveEvent);
                    return;
                }

                // Tapping another own piece changes the selection.
                if (
                    sqr !== 0 &&
                    ((whiteTurn && sqr.startsWith('w')) || (!whiteTurn && sqr.startsWith('b')))
                ) {
                    resetMobileSelection(true);
                    draggedPiece = sqr;
                    prevSqrIndex = boardIndex;
                    capturedPiece = 0;
                    isStoreSqr = false;
                    possibleSqres = getPossibleMoves(sqr, boardIndex);
                    mobileTapSelected = true;
                    board.boardArr[boardIndex] = 0;
                    highlight(possibleSqres);
                    update();
                    drawBoard();
                    return;
                }

                // Invalid destination: cancel the selection.
                resetMobileSelection(true);
                update();
                drawBoard();
                return;
            }

            // First tap: select a piece belonging to the side to move.
            if (
                sqr !== 0 &&
                ((whiteTurn && sqr.startsWith('w')) || (!whiteTurn && sqr.startsWith('b')))
            ) {
                draggedPiece = sqr;
                prevSqrIndex = boardIndex;
                capturedPiece = 0;
                isStoreSqr = false;
                possibleSqres = getPossibleMoves(sqr, boardIndex);
                mobileTapSelected = true;

                // Temporarily remove the selected piece while choosing its target.
                board.boardArr[boardIndex] = 0;

                highlight(possibleSqres);
                update();
                drawBoard();
            }

            return;
        }

        // DESKTOP: keep drag-and-drop.
        isDown = true;
        isUp = false;

        board.boardArr.forEach((sqr, i) => {
            if (sqr !== 0 && i === boardIndex) {
                if ((whiteTurn && sqr.startsWith('w')) || (!whiteTurn && sqr.startsWith('b'))) {
                    board.boardArr[i] = 0;
                    draggedPiece = sqr;
                    prevSqrIndex = i;
                    isStoreSqr = false;
                    possibleSqres = getPossibleMoves(sqr, i);
                    highlight(possibleSqres);
                }
            }
        });

        update();
        drawBoard();
    });

    document.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') {
            e.preventDefault();
            return;
        }

        ctx.clearRect(0, 0, cvs.width, cvs.height);
        update();

        const rect = cvs.getBoundingClientRect();
        const scaleX = cvs.width / rect.width;
        const scaleY = cvs.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        if (isDown && draggedPiece !== null) {
            pieces.drawPiece(pieces.type[draggedPiece], [{
                x: mouseX - pieces.pieceScale / 2,
                y: mouseY - pieces.pieceScale / 2
            }]);
        }
    });

    document.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'touch') {
            e.preventDefault();

            // First mobile tap only selects the piece.
            if (mobileTapSelected) return;
        }

        isDown = false;
        isUp = true;

        const rect = cvs.getBoundingClientRect();
        const scaleX = cvs.width / rect.width;
        const scaleY = cvs.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        const boardIndex = getBoardIndex(mouseX, mouseY);

        function reverseMovement() {
            board.boardArr[prevSqrIndex] = draggedPiece;
            board.boardArr[boardIndex] = capturedPiece;
            whiteTurn = draggedPiece[0] == 'w';
            halfMoveCount--;
            fullMoveCount = roundToWhole(halfMoveCount / 2);
            playStockFishMove = false;
        }

        function resetMovement() {
            draggedPiece = null;
            possibleSqres = [];
            capturedPiece = 0;
            prevSqrIndex = null;
            mobileTapSelected = false;
        }

        whiteDangerSqrs = [];
        blackDangerSqrs = [];

        if (canWhiteCastleRightSide(prevSqrIndex, draggedPiece, boardIndex)) {
            isCastle = true;
            whiteRightSideCastle();
            resetMovement();
            whiteTurn = !whiteTurn;
            playStockFishMove = true;
            audio.playAudio(audio.sound.move);
        }
        if (canWhiteCastleLeftSide(prevSqrIndex, draggedPiece, boardIndex)) {
            isCastle = true;
            whiteLeftSideCastle();
            resetMovement();
            whiteTurn = !whiteTurn;
            playStockFishMove = true;
            audio.playAudio(audio.sound.move);
        }
        if (canBlackCastleRightSide(prevSqrIndex, draggedPiece, boardIndex)) {
            isCastle = true;
            blackRightSideCastle();
            resetMovement();
            whiteTurn = !whiteTurn;
            playStockFishMove = false;
            audio.playAudio(audio.sound.move);
        }
        if (canBlackCastleLeftSide(prevSqrIndex, draggedPiece, boardIndex)) {
            isCastle = true;
            blackLeftSideCastle();
            resetMovement();
            whiteTurn = !whiteTurn;
            playStockFishMove = false;
            audio.playAudio(audio.sound.move);
        }
        else if (draggedPiece !== null && possibleSqres.length > 0) {
            const isCapture = board.boardArr[boardIndex] !== 0;

            for (let i = 0; i < possibleSqres.length; i++) {
                if (boardIndex == possibleSqres[i]) {
                    capturedPiece = board.boardArr[boardIndex] !== 0 ? board.boardArr[boardIndex] : 0;
                    board.boardArr[boardIndex] = draggedPiece;
                    board.boardArr[prevSqrIndex] = 0;

                    whiteTurn = !whiteTurn;
                    halfMoveCount++;
                    fullMoveCount = roundToWhole(halfMoveCount / 2);
                    playStockFishMove = whiteTurn == false;

                    if (board.boardArr[boardIndex][1] == 'P') {
                        pawnsThatHaveMovedPastOnce.push(boardIndex);
                    }

                    checkWhiteRightCastleLegality(prevSqrIndex, draggedPiece);
                    checkWhiteLeftCastleLegality(prevSqrIndex, draggedPiece);
                    checkBlackRightCastleLegality(prevSqrIndex, draggedPiece);
                    checkBlackLeftCastleLegality(prevSqrIndex, draggedPiece);

                    findWhiteDangerSqrs();
                    findBlackDangerSqrs();

                    if (whiteTurn == false) {
                        if (getPossibleMoves(draggedPiece, boardIndex).includes(board.boardArr.indexOf('bK'))) {
                            if (isCheck == false) isCheck = true;
                        } else {
                            isCheck = false;
                        }
                        if (whiteDangerSqrs.includes(board.boardArr.indexOf('wK'))) {
                            reverseMovement();
                        }
                    } else {
                        playStockFishMove = false;
                        if (blackDangerSqrs.includes(board.boardArr.indexOf('bK'))) {
                            reverseMovement();
                        }
                    }

                    if (isCheck == false) {
                        if (isCapture) audio.playAudio(audio.sound.capture);
                        else audio.playAudio(audio.sound.move);
                    } else {
                        audio.playAudio(audio.sound.check);
                    }
                }
            }

            if (!possibleSqres.includes(boardIndex)) {
                board.boardArr[prevSqrIndex] = draggedPiece;
            }
            resetMovement();
        } else if (draggedPiece !== null) {
            board.boardArr[prevSqrIndex] = draggedPiece;
            resetMovement();
        }

        update();
        drawBoard();
    });

    document.addEventListener('pointercancel', (e) => {
        if (draggedPiece !== null && prevSqrIndex !== null) {
            board.boardArr[prevSqrIndex] = draggedPiece;
        }
        isDown = false;
        isUp = true;
        draggedPiece = null;
        possibleSqres = [];
        capturedPiece = 0;
        prevSqrIndex = null;
        mobileTapSelected = false;
        update();
        drawBoard();
    });
};
