// Stockfish 18 via chess-api.com.
// The previous stockfish.online endpoint could fail and trigger the
// repeated "Something went wrong" popup.

class Stockfish {
    constructor() {
        this.busy = false;
    }

    async getBestMove(fen) {
        if (this.busy) return null;
        this.busy = true;

        try {
            const response = await fetch('https://chess-api.com/v1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fen,
                    depth: 10,
                    variants: 1,
                    maxThinkingTime: 500
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (!data || !data.move) {
                throw new Error(data?.text || 'Keine gültige Engine-Antwort');
            }

            if (data.mate === -1) {
                playerLost = true;
                playerWon = false;
            } else if (data.mate === 1) {
                playerWon = true;
                playerLost = false;
            } else if (data.mate === 0) {
                playerLost = false;
                playerWon = false;
                draw = true;
            }

            return data.move;
        } catch (error) {
            console.error('Stockfish API Fehler:', error);
            return null;
        } finally {
            this.busy = false;
        }
    }

    extractBestMove(moveString) {
        if (!moveString) return null;
        return String(moveString).trim().split(/\s+/)[0] || null;
    }

    async playStockfishMove() {
        const fen = board.convertBoardToFEN();
        const bestMove = await this.getBestMove(fen);

        if (!bestMove) {
            console.warn('Stockfish konnte für diese Stellung keinen Zug liefern.');
            playStockFishMove = false;
            return;
        }

        const move = this.extractBestMove(bestMove);
        if (!move || move.length < 4) {
            console.warn('Ungültiger Stockfish-Zug:', bestMove);
            playStockFishMove = false;
            return;
        }

        board.applyMove(move);

        setTimeout(() => {
            update();

            if (playerLost) {
                promptUser('Stockfish: You suck at chess lol... wanna play again?');
            } else if (playerWon) {
                promptUser("Stockfish: There's no way in hell you just beat me!!");
            } else if (draw) {
                promptUser('Drawing with Stockfish is just wild!!');
            }
        }, 300);
    }
}
