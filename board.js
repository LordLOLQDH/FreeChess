class Board {
    constructor() {
        this.boardArr = new Array(64).fill(0);
        this.pieceMap = { wP:'P',wR:'R',wN:'N',wB:'B',wQ:'Q',wK:'K',bP:'p',bR:'r',bN:'n',bB:'b',bQ:'q',bK:'k' };
        this.init();
    }

    init() {
        this.boardArr.fill(0);
        const back = ['R','N','B','Q','K','B','N','R'];
        for (let i=0;i<8;i++) {
            this.boardArr[i]='b'+back[i];
            this.boardArr[8+i]='bP';
            this.boardArr[48+i]='wP';
            this.boardArr[56+i]='w'+back[i];
        }
    }

    convertBoardToFEN() {
        let fen='';
        for (let i=0;i<64;i+=8) {
            let empty=0;
            for (let j=0;j<8;j++) {
                const p=this.boardArr[i+j];
                if (p===0) empty++;
                else { if(empty){fen+=empty;empty=0;} fen+=this.pieceMap[p]; }
            }
            if(empty) fen+=empty;
            if(i<56) fen+='/';
        }
        const active=whiteTurn?'w':'b';
        const rights=`${isWhiteRightCastleLegal?'K':''}${isWhiteLeftCastleLegal?'Q':''}${isBlackRightCastleLegal?'k':''}${isBlackLeftCastleLegal?'q':''}`||'-';
        return `${fen} ${active} ${rights} - ${halfMoveCount} ${fullMoveCount}`;
    }

    applyMove(move) {
        move=String(move||'').trim().split(/\s+/)[0];
        if(move.length<4) return false;
        const from=move.substring(0,2), to=move.substring(2,4);
        const promotion=move.length>=5?move[4].toLowerCase():null;
        const fromIndex=this.algebraicToIndex(from), toIndex=this.algebraicToIndex(to);
        const piece=this.boardArr[fromIndex];
        if(!piece){ console.error(`No piece found at ${from}`); return false; }
        const captured=this.boardArr[toIndex]!==0;

        // UCI castling uses e1g1/e1c1/e8g8/e8c8.
        if(piece==='wK'&&fromIndex===60&&toIndex===62) whiteRightSideCastle();
        else if(piece==='wK'&&fromIndex===60&&toIndex===58) whiteLeftSideCastle();
        else if(piece==='bK'&&fromIndex===4&&toIndex===6) blackRightSideCastle();
        else if(piece==='bK'&&fromIndex===4&&toIndex===2) blackLeftSideCastle();
        else {
            this.boardArr[fromIndex]=0;
            this.boardArr[toIndex]=piece;
            if(promotion&&piece[1]==='P'&&['q','r','b','n'].includes(promotion)) this.boardArr[toIndex]=piece[0]+promotion.toUpperCase();
            if(piece==='wK'){isWhiteRightCastleLegal=false;isWhiteLeftCastleLegal=false;}
            if(piece==='bK'){isBlackRightCastleLegal=false;isBlackLeftCastleLegal=false;}
            if(fromIndex===63||toIndex===63)isWhiteRightCastleLegal=false;
            if(fromIndex===56||toIndex===56)isWhiteLeftCastleLegal=false;
            if(fromIndex===7||toIndex===7)isBlackRightCastleLegal=false;
            if(fromIndex===0||toIndex===0)isBlackLeftCastleLegal=false;
        }

        if(piece[1]==='P'||captured) halfMoveCount=0; else halfMoveCount++;
        if(!whiteTurn) fullMoveCount++;
        whiteTurn=!whiteTurn;
        playStockFishMove=false;
        whiteDangerSqrs=[]; blackDangerSqrs=[];
        findWhiteDangerSqrs(); findBlackDangerSqrs();

        const enemyKing=whiteTurn?'wK':'bK';
        const kingIndex=this.boardArr.indexOf(enemyKing);
        isCheck=kingIndex>=0&&getPossibleMoves(piece,toIndex).includes(kingIndex);
        if(isCheck) audio.playAudio(audio.sound.check);
        else if(captured) audio.playAudio(audio.sound.capture);
        else audio.playAudio(audio.sound.move);
        return true;
    }

    algebraicToIndex(algebraic) {
        const file=algebraic.charCodeAt(0)-97;
        const rank=8-parseInt(algebraic[1],10);
        return rank*8+file;
    }
}

board=new Board();
