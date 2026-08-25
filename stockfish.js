class Stockfish {
    constructor() {
        this.busy = false;
        this.requestId = 0;
        this.worker = null;
        this.pending = {};
        this.useAPI = false;
        this.initialized = false;

        // try to initialize a local Stockfish worker
        this._initLocalWorker();
    }

    _initLocalWorker() {
        // Try common local paths. If worker cannot be created, fallback to API mode.
        const candidates = [
            './assets/stockfish/stockfish.js',
            './assets/stockfish.wasm.js',
            './stockfish.js'
        ];

        const tryNext = (index) => {
            if (index >= candidates.length) {
                console.warn('Stockfish: no local engine found, falling back to remote API.');
                this.useAPI = true;
                return;
            }
            try {
                const path = candidates[index];
                // Create worker and set up message handler
                const w = new Worker(path);
                w.onmessage = (ev) => this._onWorkerMessage(ev);
                w.onerror = (err) => {
                    console.warn('Stockfish worker error for', path, err);
                };
                this.worker = w;
                this.enginePath = path;
                this._sendToWorker('uci');
                // we'll wait for 'uciok' in onmessage before marking initialized
                // but still mark worker present
                console.log('Stockfish: worker created from', path);
            } catch (e) {
                // Creating Worker may throw synchronously in some environments
                console.warn('Stockfish: Worker instantiation failed for', candidates[index], e);
                tryNext(index + 1);
            }
        };

        tryNext(0);
    }

    _sendToWorker(msg) {
        try {
            if (this.worker) this.worker.postMessage(String(msg));
        } catch (e) {
            console.warn('Stockfish: failed to postMessage to worker', e);
        }
    }

    _onWorkerMessage(ev) {
        const data = ev && ev.data ? ev.data.toString() : '';
        // console.log('stockfish<', data);
        if (!this.initialized) {
            if (data.indexOf('uciok') !== -1) {
                this._sendToWorker('isready');
            } else if (data.indexOf('readyok') !== -1) {
                this.initialized = true;
                console.log('Stockfish: worker initialized');
            }
        }

        // Look for bestmove lines
        const bm = this._parseBestMoveFromText(data);
        if (bm) {
            const reqId = Object.keys(this.pending)[0];
            if (reqId) {
                const p = this.pending[reqId];
                clearTimeout(p.timeout);
                delete this.pending[reqId];
                this.busy = false;
                p.resolve(bm);
            }
        }

        // Some builds post objects {type:..., data:...}
        if (!data && typeof ev.data === 'object') {
            const txt = JSON.stringify(ev.data);
            const bm2 = this._parseBestMoveFromText(txt);
            if (bm2) {
                const reqId = Object.keys(this.pending)[0];
                if (reqId) {
                    const p = this.pending[reqId];
                    clearTimeout(p.timeout);
                    delete this.pending[reqId];
                    this.busy = false;
                    p.resolve(bm2);
                }
            }
        }
    }

    _parseBestMoveFromText(text) {
        if (!text) return null;
        const m = text.match(/bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/i);
        if (m && m[1]) return m[1].trim();
        return null;
    }

    async getBestMove(fen) {
        // Prefer local worker if available and initialized
        if (this.busy) return null;
        this.busy = true;
        const requestId = ++this.requestId;

        if (this.worker && this.initialized) {
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    if (this.pending[requestId]) {
                        delete this.pending[requestId];
                        this.busy = false;
                        resolve(null);
                    }
                }, 8000);
                this.pending[requestId] = { resolve, timeout };
                // set position and ask for best move
                try {
                    this._sendToWorker('position fen ' + fen);
                    this._sendToWorker('go depth 12');
                } catch (e) {
                    clearTimeout(timeout);
                    delete this.pending[requestId];
                    this.busy = false;
                    resolve(null);
                }
            });
        }

        // If worker not initialized yet but exists, wait briefly for initialization then try
        if (this.worker && !this.initialized) {
            // wait up to 3s for ready
            const start = Date.now();
            while (!this.initialized && Date.now() - start < 3000) {
                await new Promise(r => setTimeout(r, 100));
            }
            if (this.initialized) return this.getBestMove(fen);
        }

        // Fallback: remote API (older behavior)
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const response = await fetch('https://chess-api.com/v1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fen, depth: 12, variants: 1, maxThinkingTime: 1200 }),
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const data = await response.json();
            if (!data || typeof data.move !== 'string') throw new Error('Keine gültige Engine-Antwort');
            this.busy = false;
            return data.move.trim();
        } catch (error) {
            console.error('Stockfish API Fehler:', error);
            this.busy = false;
            return null;
        }
    }

    extractBestMove(moveString) {
        const move = moveString ? String(moveString).trim().split(/\s+/)[0] : null;
        return /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(move || '') ? move : null;
    }

    async playStockfishMove() {
        if (this.busy || !board || whiteTurn) return false;
        const fen = typeof fcCurrentFen === 'function' ? fcCurrentFen() : board.convertBoardToFEN();
        const raw = await this.getBestMove(fen);
        const bestMove = this.extractBestMove(raw);
        if (whiteTurn || !bestMove) { playStockFishMove = false; return false; }
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
        return true;
    }
}
