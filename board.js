class Board {
    constructor() {
        this.boardArr = new Array(64).fill(0);
        this.pieceMap = {
            wP: 'P', wR: 'R', wN: 'N', wB: 'B', wQ: 'Q', wK: 'K',
            bP: 'p', bR: 'r', bN: 'n', bB: 'b', bQ: 'q', bK: 'k'
        };
        this.init();
    }

    init() {
        this.boardArr.fill(0);
        const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
        for (let i = 0; i < 8; i++) {
            this.boardArr[i] = 'b' + back[i];
            this.boardArr[8 + i] = 'bP';
            this.boardArr[48 + i] = 'wP';
            this.boardArr[56 + i] = 'w' + back[i];
        }
    }

    convertBoardToFEN() {
        let fen = '';

        for (let i = 0; i < 64; i += 8) {
            let empty = 0;
            for (let j = 0; j < 8; j++) {
                const p = this.boardArr[i + j];
                if (p === 0) {
                    empty++;
                } else {
                    if (empty) {
                        fen += empty;
                        empty = 0;
                    }
                    fen += this.pieceMap[p];
                }
            }
            if (empty) fen += empty;
            if (i < 56) fen += '/';
        }

        const active = whiteTurn ? 'w' : 'b';
        const rights = `${isWhiteRightCastleLegal ? 'K' : ''}${isWhiteLeftCastleLegal ? 'Q' : ''}${isBlackRightCastleLegal ? 'k' : ''}${isBlackLeftCastleLegal ? 'q' : ''}` || '-';
        const safeHalfMove = Math.max(0, Number.isFinite(halfMoveCount) ? halfMoveCount : 0);
        const safeFullMove = Math.max(1, Number.isFinite(fullMoveCount) ? fullMoveCount : 1);

        return `${fen} ${active} ${rights} - ${safeHalfMove} ${safeFullMove}`;
    }

    applyMove(move) {
        const uci = String(move || '').trim().split(/\s+/)[0];
        if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return false;

        const from = uci.substring(0, 2);
        const to = uci.substring(2, 4);
        const promotion = uci.length >= 5 ? uci[4].toLowerCase() : null;
        const fromIndex = this.algebraicToIndex(from);
        const toIndex = this.algebraicToIndex(to);

        if (fromIndex < 0 || fromIndex >= 64 || toIndex < 0 || toIndex >= 64) return false;

        const piece = this.boardArr[fromIndex];
        if (!piece || piece[0] !== 'b' || whiteTurn) {
            console.error(`Invalid Stockfish source square: ${from}`);
            return false;
        }

        const captured = this.boardArr[toIndex] !== 0;

        // UCI castling uses e8g8/e8c8.
        if (piece === 'bK' && fromIndex === 4 && toIndex === 6) {
            if (!canBlackCastleRightSide(4, 'bK', 7)) return false;
            blackRightSideCastle();
        } else if (piece === 'bK' && fromIndex === 4 && toIndex === 2) {
            if (!canBlackCastleLeftSide(4, 'bK', 0)) return false;
            blackLeftSideCastle();
        } else {
            const legalMoves = getPossibleMoves(piece, fromIndex) || [];
            if (!legalMoves.includes(toIndex)) {
                console.error(`Illegal Stockfish move: ${uci}`);
                return false;
            }

            this.boardArr[fromIndex] = 0;
            this.boardArr[toIndex] = piece;

            if (promotion && piece[1] === 'P' && ['q', 'r', 'b', 'n'].includes(promotion)) {
                this.boardArr[toIndex] = piece[0] + promotion.toUpperCase();
            }

            if (piece === 'bK') {
                isBlackRightCastleLegal = false;
                isBlackLeftCastleLegal = false;
            }
            if (fromIndex === 7 || toIndex === 7) isBlackRightCastleLegal = false;
            if (fromIndex === 0 || toIndex === 0) isBlackLeftCastleLegal = false;
        }

        if (piece[1] === 'P' || captured) halfMoveCount = 0;
        else halfMoveCount++;

        fullMoveCount = Math.max(1, fullMoveCount);
        fullMoveCount++;
        whiteTurn = true;
        playStockFishMove = false;

        whiteDangerSqrs = [];
        blackDangerSqrs = [];
        findWhiteDangerSqrs();
        findBlackDangerSqrs();

        const whiteKingIndex = this.boardArr.indexOf('wK');
        isCheck = whiteKingIndex >= 0 && getPossibleMoves(piece, toIndex).includes(whiteKingIndex);

        if (isCheck) audio.playAudio(audio.sound.check);
        else if (captured) audio.playAudio(audio.sound.capture);
        else audio.playAudio(audio.sound.move);

        return true;
    }

    algebraicToIndex(algebraic) {
        const file = algebraic.charCodeAt(0) - 97;
        const rank = 8 - parseInt(algebraic[1], 10);
        return rank * 8 + file;
    }
}

board = new Board();
