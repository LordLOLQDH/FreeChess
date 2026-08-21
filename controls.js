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

sprite.onload = () => {
    board.init();
    update();
    drawBoard();

    // Pointer Events work with mouse, touch and Apple Pencil.
    cvs.style.touchAction = 'none';

    document.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') e.preventDefault();
        isDown = true;
        isUp = false;

        const rect = cvs.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const boardIndex = getBoardIndex(mouseX, mouseY);

        board.boardArr.forEach((sqr, i) => {
            if (sqr !== 0 && i == boardIndex) {
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
    }, { passive: false });

    document.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') e.preventDefault();

        ctx.clearRect(0, 0, cvs.width, cvs.height);
        update();

        const rect = cvs.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (isDown && draggedPiece !== null) {
            pieces.drawPiece(pieces.type[draggedPiece], [{
                x: mouseX - pieces.pieceScale / 2,
                y: mouseY - pieces.pieceScale / 2
            }]);
        }
    }, { passive: false });

    document.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'touch') e.preventDefault();

        isDown = false;
        isUp = true;

        const rect = cvs.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
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
    }, { passive: false });

    document.addEventListener('pointercancel', () => {
        if (draggedPiece !== null && prevSqrIndex !== null) {
            board.boardArr[prevSqrIndex] = draggedPiece;
        }
        isDown = false;
        isUp = true;
        draggedPiece = null;
        possibleSqres = [];
        capturedPiece = 0;
        prevSqrIndex = null;
        update();
        drawBoard();
    });
};
