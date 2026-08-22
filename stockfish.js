class Stockfish {
    constructor() { this.busy = false; }

    async getBestMove(fen) {
        if (this.busy) return null;
        this.busy = true;
        try {
            const response = await fetch('https://chess-api.com/v1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fen, depth: 10, variants: 1, maxThinkingTime: 500 })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!data || !data.move) throw new Error(data?.text || 'Keine gültige Engine-Antwort');
            playerLost = data.mate === -1;
            playerWon = data.mate === 1;
            draw = data.mate === 0;
            return data.move;
        } catch (error) {
            console.error('Stockfish API Fehler:', error);
            return null;
        } finally {
            this.busy = false;
        }
    }

    extractBestMove(moveString) {
        return moveString ? String(moveString).trim().split(/\s+/)[0] : null;
    }

    async playStockfishMove() {
        if (this.busy || !board || whiteTurn) return false;
        const bestMove = this.extractBestMove(await this.getBestMove(board.convertBoardToFEN()));
        if (!bestMove || bestMove.length < 4) {
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
