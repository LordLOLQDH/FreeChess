// Desktop drag controls. Touch input is handled by mobile.js.
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

    document.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return;
        const rect = cvs.getBoundingClientRect();
        const scaleX = cvs.width / rect.width;
        const scaleY = cvs.height / rect.height;
        const boardIndex = getBoardIndex((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
        isDown = true;
        isUp = false;

        const sqr = board.boardArr[boardIndex];
        if (sqr !== 0 && ((whiteTurn && sqr.startsWith('w')) || (!whiteTurn && sqr.startsWith('b')))) {
            board.boardArr[boardIndex] = 0;
            draggedPiece = sqr;
            prevSqrIndex = boardIndex;
            isStoreSqr = false;
            possibleSqres = getPossibleMoves(sqr, boardIndex);
            highlight(possibleSqres);
        }
        update();
        drawBoard();
    });

    document.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
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
        if (e.pointerType === 'touch') return;
        isDown = false;
        isUp = true;
        const rect = cvs.getBoundingClientRect();
        const scaleX = cvs.width / rect.width;
        const scaleY = cvs.height / rect.height;
        const boardIndex = getBoardIndex((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);

        const reverseMovement = () => {
            board.boardArr[prevSqrIndex] = draggedPiece;
            board.boardArr[boardIndex] = capturedPiece;
            whiteTurn = draggedPiece[0] === 'w';
            halfMoveCount--;
            fullMoveCount = roundToWhole(halfMoveCount / 2);
            playStockFishMove = false;
        };
        const resetMovement = () => {
            draggedPiece = null;
            possibleSqres = [];
            capturedPiece = 0;
            prevSqrIndex = null;
        };

        whiteDangerSqrs = [];
        blackDangerSqrs = [];

        if (canWhiteCastleRightSide(prevSqrIndex, draggedPiece, boardIndex)) {
            isCastle = true;
            whiteRightSideCastle();
            resetMovement();
            whiteTurn = false;
            audio.playAudio(audio.sound.move);
            requestStockfishMove();
        } else if (canWhiteCastleLeftSide(prevSqrIndex, draggedPiece, boardIndex)) {
            isCastle = true;
            whiteLeftSideCastle();
            resetMovement();
            whiteTurn = false;
            audio.playAudio(audio.sound.move);
            requestStockfishMove();
        } else if (canBlackCastleRightSide(prevSqrIndex, draggedPiece, boardIndex)) {
            isCastle = true;
            blackRightSideCastle();
            resetMovement();
            whiteTurn = true;
            audio.playAudio(audio.sound.move);
        } else if (canBlackCastleLeftSide(prevSqrIndex, draggedPiece, boardIndex)) {
            isCastle = true;
            blackLeftSideCastle();
            resetMovement();
            whiteTurn = true;
            audio.playAudio(audio.sound.move);
        } else if (draggedPiece !== null && possibleSqres.length > 0) {
            const isCapture = board.boardArr[boardIndex] !== 0;
            if (possibleSqres.includes(boardIndex)) {
                capturedPiece = board.boardArr[boardIndex] !== 0 ? board.boardArr[boardIndex] : 0;
                board.boardArr[boardIndex] = draggedPiece;
                board.boardArr[prevSqrIndex] = 0;
                whiteTurn = !whiteTurn;
                halfMoveCount++;
                fullMoveCount = roundToWhole(halfMoveCount / 2);

                if (board.boardArr[boardIndex][1] === 'P') pawnsThatHaveMovedPastOnce.push(boardIndex);
                checkWhiteRightCastleLegality(prevSqrIndex, draggedPiece);
                checkWhiteLeftCastleLegality(prevSqrIndex, draggedPiece);
                checkBlackRightCastleLegality(prevSqrIndex, draggedPiece);
                checkBlackLeftCastleLegality(prevSqrIndex, draggedPiece);
                findWhiteDangerSqrs();
                findBlackDangerSqrs();

                if (!whiteTurn) {
                    isCheck = getPossibleMoves(draggedPiece, boardIndex).includes(board.boardArr.indexOf('bK'));
                    if (whiteDangerSqrs.includes(board.boardArr.indexOf('wK'))) reverseMovement();
                } else if (blackDangerSqrs.includes(board.boardArr.indexOf('bK'))) {
                    reverseMovement();
                }

                if (isCheck) audio.playAudio(audio.sound.check);
                else audio.playAudio(isCapture ? audio.sound.capture : audio.sound.move);

                if (!whiteTurn && draggedPiece[0] === 'w') requestStockfishMove();
            } else {
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
        if (e.pointerType === 'touch') return;
        if (draggedPiece !== null && prevSqrIndex !== null) board.boardArr[prevSqrIndex] = draggedPiece;
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
