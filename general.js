const cvs=document.querySelector('canvas');
const ctx=cvs.getContext('2d');
let pieces;let board;
const sprite=new Image();sprite.src='./assets/chess_pieces.png';
const pawnsThatHaveMovedPastOnce=[];let whiteDangerSqrs=[];let blackDangerSqrs=[];
let isWhiteRightCastleLegal=true,isWhiteLeftCastleLegal=true,isBlackRightCastleLegal=true,isBlackLeftCastleLegal=true;
let whiteTurn=true,halfMoveCount=0,fullMoveCount=1,playStockFishMove=false,isCheck=false;
let playerLost=false,playerWon=false,draw=false,stockfishRequestQueued=false,stockfishRetryTimer=null;

const update=()=>{ctx.clearRect(0,0,cvs.width,cvs.height);board.boardArr.forEach((sqr,i)=>{if(sqr!==0){const square=getSqre(i);pieces.drawPiece(pieces.type[sqr],[{x:square.x,y:square.y}]);}})};

const requestStockfishMove=()=>{
    if(typeof stockfishAi==='undefined'||!stockfishAi||!board||whiteTurn) return;
    if(typeof fcGameOver==='function'&&fcGameOver()) return;
    if(stockfishRetryTimer){clearTimeout(stockfishRetryTimer);stockfishRetryTimer=null;}
    if(stockfishAi.busy){stockfishRequestQueued=true;return;}
    stockfishRequestQueued=false;playStockFishMove=true;
    stockfishAi.playStockfishMove().then(played=>{
        if(!played&&!whiteTurn&&!(typeof fcGameOver==='function'&&fcGameOver())){
            playStockFishMove=false;
            stockfishRetryTimer=setTimeout(()=>{stockfishRetryTimer=null;requestStockfishMove();},250);
            return;
        }
        if(stockfishRequestQueued&&!whiteTurn&&!stockfishAi.busy&&!(typeof fcGameOver==='function'&&fcGameOver())){
            stockfishRequestQueued=false;setTimeout(requestStockfishMove,0);
        }
    }).catch(error=>{
        playStockFishMove=false;console.error('Stockfish request failed:',error);
        if(!whiteTurn&&!(typeof fcGameOver==='function'&&fcGameOver())) stockfishRetryTimer=setTimeout(()=>{stockfishRetryTimer=null;requestStockfishMove();},250);
    });
};

const promptUser=()=>{};
