let mobileSelectedIndex = null;
let mobileSelectedPiece = null;

function mobileSquare(i) {
    return 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8));
}

function mobileBoardIndexFromEvent(e) {
    const r = cvs.getBoundingClientRect();
    return getBoardIndex((e.clientX-r.left)*cvs.width/r.width,(e.clientY-r.top)*cvs.height/r.height);
}

function mobileClearSelection() {
    mobileSelectedIndex=null;
    mobileSelectedPiece=null;
    update();
}

function mobileLegal(index) {
    if (!fcRules) return [];
    return fcRules.moves({square:mobileSquare(index),verbose:true}).map(m => (8-Number(m.to[1]))*8+m.to.charCodeAt(0)-97);
}

function mobileShowSelection() {
    update();
    if (mobileSelectedIndex===null) return;
    for (const i of mobileLegal(mobileSelectedIndex)) {
        const row=Math.floor(i/8),col=i%8;
        ctx.fillStyle='rgba(0,170,255,.32)';
        ctx.fillRect(col*sqreScale,row*sqreScale,sqreScale,sqreScale);
    }
    const row=Math.floor(mobileSelectedIndex/8),col=mobileSelectedIndex%8;
    ctx.strokeStyle='rgba(255,215,0,.95)';
    ctx.lineWidth=4;
    ctx.strokeRect(col*sqreScale+2,row*sqreScale+2,sqreScale-4,sqreScale-4);
}

function mobileMakeMove(from,to,piece) {
    if (!piece || piece[0]!=='w' || !whiteTurn || !fcRules) return false;
    if (!mobileLegal(from).includes(to)) return false;
    const capture=board.boardArr[to]!==0;
    const castle=piece==='wK' && Math.abs(to-from)===2;
    const ok=fcPlayerMove(mobileSquare(from),mobileSquare(to),'q');
    if (!ok) return false;
    if (castle) audio.playAudio(audio.sound.castle);
    else if (capture) audio.playAudio(audio.sound.capture);
    else audio.playAudio(audio.sound.move);
    update();
    drawBoard();
    if (!whiteTurn && typeof requestStockfishMove==='function') setTimeout(requestStockfishMove,0);
    return true;
}

function setupMobileControls() {
    cvs.addEventListener('pointerdown',e=>{
        if(e.pointerType!=='touch') return;
        e.preventDefault();
        e.stopPropagation();
        if(!whiteTurn || (typeof fcGameOver==='function' && fcGameOver())) { mobileClearSelection(); return; }
        const i=mobileBoardIndexFromEvent(e);
        if(i<0 || i>=64) return;
        const piece=board.boardArr[i];
        if(mobileSelectedIndex===null) {
            if(piece && piece[0]==='w') { mobileSelectedIndex=i; mobileSelectedPiece=piece; mobileShowSelection(); }
            return;
        }
        if(piece && piece[0]==='w') {
            mobileSelectedIndex=i;
            mobileSelectedPiece=piece;
            mobileShowSelection();
            return;
        }
        mobileMakeMove(mobileSelectedIndex,i,mobileSelectedPiece);
        mobileClearSelection();
        drawBoard();
    },{passive:false});

    cvs.addEventListener('pointerup',e=>{
        if(e.pointerType==='touch'){e.preventDefault();e.stopPropagation();}
    },{passive:false});
}

setupMobileControls();
