// UI-only deterministic puzzle. Real settlement must replay these actions on-chain.
export const demoBoard=[1,2,1,0,0,0,2,1,2,0,0,0,3,4,3,0,9,0,4,3,4,0,9,0,5,6,5,0,0,0,6,5,6,0,0,0];
export const fruitCount=(board:number[])=>board.filter(n=>n>0&&n<9).length;
export function exchange(board:number[],a:number,b:number){
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=36||b>=36||board[a]===9||board[b]===9||board[a]===board[b]||Math.abs(Math.floor(a/6)-Math.floor(b/6))+Math.abs(a%6-b%6)!==1)return null;
 const next=[...board];[next[a],next[b]]=[next[b],next[a]];const removed=new Set<number>();
 for(let i=0;i<36;i++){if(!next[i]||next[i]===9)continue;for(const step of [1,6]){const run=[i];for(let j=i+step;j<36&&(step===6||Math.floor(j/6)===Math.floor(i/6))&&next[j]===next[i];j+=step)run.push(j);if(run.length>=3)run.forEach(k=>removed.add(k));}}
 removed.forEach(i=>next[i]=0);return {board:next,removed:[...removed]};
}
export function replay(actions:[number,number][]){let board=[...demoBoard];for(const [a,b] of actions){if(!fruitCount(board))return null;const result=exchange(board,a,b);if(!result)return null;board=result.board;}return board;}
export const puzzleRules={version:'nine-fruits-preview-2',size:6,empty:0,obstacle:9,adjacentSwaps:true,emptySwaps:true,matchMinimum:3,gravity:false,refill:false,moveLimit:null,goal:'clear-all-fruit',stepFee3Shape:1,entryFee3Shape:10000,settlement:'replay-and-pay-before-ranking',status:'UI preview; not a live protocol'};
