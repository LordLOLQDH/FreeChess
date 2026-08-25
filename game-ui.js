(() => {
    const style = document.createElement('style');
    style.textContent = `
        #fcStartScreen,
        #fcResultScreen {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: #050505;
            color: #fff;
            font-family: Arial, sans-serif;
            overflow: auto;
        }
        .fcPanel {
            width: min(460px, 100%);
            padding: 28px;
            border: 1px solid #333;
            border-radius: 20px;
            background: #111;
            box-shadow: 0 20px 70px rgba(0,0,0,.55);
            text-align: center;
        }
        .fcPanel h1 { margin: 0 0 10px; font-size: clamp(30px, 8vw, 52px); }
        .fcPanel h2 { margin: 0 0 18px; font-size: clamp(26px, 7vw, 42px); }
        .fcPanel p { color: #bbb; margin: 8px 0 22px; }
        .fcPanel label { display:block; text-align:left; margin:14px 0 6px; color:#ddd; font-weight:700; }
        .fcPanel input {
            width: 100%;
            padding: 14px;
            border-radius: 11px;
            border: 1px solid #444;
            background: #080808;
            color: #fff;
            font-size: 16px;
            outline: none;
        }
        .fcPanel button {
            width: 100%;
            margin-top: 16px;
            padding: 14px 18px;
            border: 0;
            border-radius: 11px;
            background: #fff;
            color: #111;
            font-size: 16px;
            font-weight: 800;
            cursor: pointer;
        }
        .fcPanel button.secondary { background:#222; color:#fff; border:1px solid #444; }
        .fcResultWin { color:#fff; }
        .fcResultLose { color:#aaa; }
        .fcResultDraw { color:#ddd; }
        #fcGameUiReady { display:none; }
        @media (max-width: 600px) {
            #fcStartScreen, #fcResultScreen { padding: 14px; }
            .fcPanel { padding: 22px 18px; border-radius: 16px; }
        }
    `;
    document.head.appendChild(style);

    const start = document.createElement('div');
    start.id = 'fcStartScreen';
    start.innerHTML = `
        <div class="fcPanel">
            <h1>FreeChess</h1>
            <p>Bereit für die Partie?</p>
            <label for="fcStartName">Username</label>
            <input id="fcStartName" maxlength="24" autocomplete="nickname" placeholder="Dein Name">
            <label for="fcStartRating">Rating / Stärkezahl</label>
            <input id="fcStartRating" type="number" min="0" max="4000" step="1" placeholder="1200">
            <button id="fcStartButton">Partie starten</button>
        </div>
    `;
    document.body.appendChild(start);

    const result = document.createElement('div');
    result.id = 'fcResultScreen';
    result.style.display = 'none';
    result.innerHTML = `
        <div class="fcPanel">
            <h2 id="fcResultTitle">Partie beendet</h2>
            <p id="fcResultText"></p>
            <button id="fcResultExport">Schach-Log herunterladen</button>
            <button id="fcResultNew" class="secondary">Neue Partie</button>
        </div>
    `;
    document.body.appendChild(result);

    const nameInput = start.querySelector('#fcStartName');
    const ratingInput = start.querySelector('#fcStartRating');
    const storedName = localStorage.getItem('freechess_username') || 'Player';
    const storedRating = Number(localStorage.getItem('freechess_rating')) || 1200;
    nameInput.value = storedName;
    ratingInput.value = storedRating;

    let gameStarted = false;
    let gameFinished = false;
    let lastBoardSignature = '';

    function syncProfile() {
        const name = nameInput.value.trim().slice(0, 24) || 'Player';
        let rating = Number(ratingInput.value);
        if (!Number.isFinite(rating)) rating = 1200;
        rating = Math.max(0, Math.min(4000, Math.round(rating)));
        localStorage.setItem('freechess_username', name);
        localStorage.setItem('freechess_rating', String(rating));
        return { name, rating };
    }

    function showStart() {
        gameStarted = false;
        gameFinished = false;
        result.style.display = 'none';
        start.style.display = 'flex';
        const stats = document.getElementById('fcStats');
        if (stats) stats.style.display = 'none';
    }

    function startGame() {
        syncProfile();
        gameStarted = true;
        gameFinished = false;
        lastBoardSignature = '';
        start.style.display = 'none';
        result.style.display = 'none';
        const stats = document.getElementById('fcStats');
        if (stats) stats.style.display = '';
        if (typeof update === 'function') update();
        if (typeof drawBoard === 'function') drawBoard();
        if (typeof requestStockfishMove === 'function' && typeof whiteTurn !== 'undefined' && !whiteTurn) requestStockfishMove();
    }

    function exportLog() {
        const button = document.getElementById('fcExport');
        if (button) button.click();
    }

    function finishGame(kind) {
        if (!gameStarted || gameFinished) return;
        gameFinished = true;
        if (typeof stockfishRetryTimer !== 'undefined' && stockfishRetryTimer) clearTimeout(stockfishRetryTimer);
        if (typeof stockfishAi !== 'undefined' && stockfishAi && stockfishAi.busy && typeof stockfishAi.stop === 'function') {
            try { stockfishAi.stop(); } catch (_) {}
        }
        if (typeof playStockFishMove !== 'undefined') playStockFishMove = false;
        const title = document.getElementById('fcResultTitle');
        const text = document.getElementById('fcResultText');
        if (kind === 'win') {
            title.textContent = 'Du hast gewonnen';
            title.className = 'fcResultWin';
            text.textContent = 'Schwarz ist besiegt.';
        } else if (kind === 'lose') {
            title.textContent = 'Du hast verloren';
            title.className = 'fcResultLose';
            text.textContent = 'Stockfish hat die Partie gewonnen.';
        } else {
            title.textContent = 'Partie beendet';
            title.className = 'fcResultDraw';
            text.textContent = 'Die Partie ist beendet.';
        }
        const stats = document.getElementById('fcStats');
        if (stats) stats.style.display = 'none';
        result.style.display = 'flex';
    }

    function checkGameEnd() {
        if (!gameStarted || gameFinished || typeof board === 'undefined' || !board || !board.boardArr) return;
        const signature = board.boardArr.join('|') + '|' + whiteTurn;
        if (signature === lastBoardSignature) return;
        lastBoardSignature = signature;

        const whiteKing = board.boardArr.indexOf('wK');
        const blackKing = board.boardArr.indexOf('bK');
        if (whiteKing < 0) return finishGame('lose');
        if (blackKing < 0) return finishGame('win');
    }

    document.getElementById('fcStartButton').addEventListener('click', startGame);
    document.getElementById('fcResultExport').addEventListener('click', exportLog);
    document.getElementById('fcResultNew').addEventListener('click', () => {
        window.location.reload();
    });

    // Enter starts the game from the setup screen.
    [nameInput, ratingInput].forEach(input => input.addEventListener('keydown', e => {
        if (e.key === 'Enter') startGame();
    }));

    showStart();
    setInterval(checkGameEnd, 100);
})();
