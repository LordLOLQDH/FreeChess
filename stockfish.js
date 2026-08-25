class Stockfish {
    constructor() {
        this.busy = false;
        this.requestId = 0;
    }

    async getBestMove(fen) {
        if (this.busy) return null;

        this.busy = true;
        const requestId = ++this.requestId;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        try {
            const response = await fetch('https://chess-api.com/v1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fen,
                    depth: 12,
                    variants: 1,
                    maxThinkingTime: 1200
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!data || typeof data.move !== 'string') {
                throw new Error(data?.text || 'Keine gültige Engine-Antwort');
            }

            if (requestId !== this.requestId) return null;

            playerLost = data.mate === -1;
            playerWon = data.mate === 1;
            draw = data.mate === 0;

            return data.move.trim();
        } catch (error) {
            if (error?.name === 'AbortError') {
                console.error('Stockfish API Timeout');
            } else {
                console.error('Stockfish API Fehler:', error);
            }
            return null;
        } finally {
            clearTimeout(timeout);
            this.busy = false;
        }
    }

    extractBestMove(moveString) {
        const move = moveString ? String(moveString).trim().split(/\s+/)[0] : null;
        return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move || '') ? move : null;
    }

    async playStockfishMove() {
        if (this.busy || !board || whiteTurn) return false;

        const fen = board.convertBoardToFEN();
        const bestMove = this.extractBestMove(await this.getBestMove(fen));

        // The position may have changed while the API was thinking.
        if (whiteTurn) return false;

        if (!bestMove) {
            playStockFishMove = false;
            console.warn('Stockfish hat keinen gültigen Zug geliefert.');
            return false;
        }

        console.log('Stockfish zieht:', bestMove);

        const applied = board.applyMove(bestMove);
        playStockFishMove = false;

        if (!applied) {
            console.error('Stockfish-Zug konnte nicht angewendet werden:', bestMove);
            update();
            drawBoard();
            return false;
        }

        update();
        drawBoard();

        if (playerLost) promptUser('Stockfish: You suck at chess lol... wanna play again?');
        else if (playerWon) promptUser("Stockfish: There's no way in hell you just beat me!!");
        else if (draw) promptUser('Drawing with Stockfish is just wild!!');

        return true;
    }
}
