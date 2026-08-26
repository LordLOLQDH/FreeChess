const boardCont = document.querySelector('.board-cont');
const gameCont = document.querySelector('.game');
if(typeof ensureCanvas==='function') ensureCanvas();
const resizeBoard = () => {
    if (!gameCont ||!boardCont) return;
    const vw = window.visualViewport?.width || window.innerWidth;
    const vh = window.visualViewport?.height || window.innerHeight;
    const size = Math.min(vw, vw > vh? vh : vw);
    gameCont.style.width = `${size}px`; gameCont.style.height = `${size}px`;
    // center the board container then scale from center
    boardCont.style.transform = `translate(-50%,-50%) scale(${size / boardScale})`;
};
const drawBoard = () => {
    if(!boardCont) return; boardCont.innerHTML = '';
    for (let row = 0; row < boardScale; row += sqreScale) {
        for (let col = 0; col < boardScale; col += sqreScale) {
            const d = document.createElement('div');
            const rIdx = row / sqreScale;
            const cIdx = col / sqreScale;
            d.style.backgroundColor = ((rIdx + cIdx) % 2 === 0) ? '#d3dee5' : '#7599b1';
            d.style.left = `${col}px`; d.style.top = `${row}px`; d.style.width = `${sqreScale}px`; d.style.height = `${sqreScale}px`; d.style.position='absolute'; d.style.pointerEvents='none';
            boardCont.appendChild(d);
        }
    } resizeBoard();
};
window.addEventListener('resize', resizeBoard);
window.addEventListener('orientationchange', ()=>setTimeout(resizeBoard,100));
if (window.visualViewport) window.visualViewport.addEventListener('resize', resizeBoard);
drawBoard();
