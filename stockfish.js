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
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({fen,depth:12,variants:1,maxThinkingTime:1200}),
                signal:controller.signal
            });
            if(!response.ok) throw new Error(`HTTP ${response.status}`);
            const data=await response.json();
            if(!data || typeof data.move!=='string') throw new Error(data?.text || 'Keine gültige Engine-Antwort');
            if(requestId!==this.requestId) return null;
            return data.move.trim();
        } catch(error) {
            console.error('Stockfish API Fehler:',error);
            return null;
        } finally {
            clearTimeout(timeout);
            this.busy=false;
        }
    }

    extractBestMove(moveString) {
        const move=moveString?String(moveString).trim().split(/\s+/)[0]:null;
        return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move||'')?move:null;
    }

    async playStockfishMove() {
        if(this.busy || !board || whiteTurn) return false;
        const fen=typeof fcCurrentFen==='function'?fcCurrentFen():board.convertBoardToFEN();
        const bestMove=this.extractBestMove(await this.getBestMove(fen));
        if(whiteTurn || !bestMove) { playStockFishMove=false; return false; }
        console.log('Stockfish zieht:',bestMove);
        const applied=board.applyMove(bestMove);
        playStockFishMove=false;
        if(!applied) {
            console.error('Stockfish-Zug konnte nicht angewendet werden:',bestMove);
            update();
            drawBoard();
            return false;
        }
        update();
        drawBoard();
        return true;
    }
}
