import {validateBoard,matches,countFruit,swapRaw,neighbors} from './engine.mjs';
export {countFruit};
export function gravity(input){const board=[...input];for(let col=0;col<6;col++){let write=5;for(let row=5;row>=0;row--){const i=row*6+col,v=board[i];if(v===9){write=row-1;continue;}if(v>0){const to=write*6+col;if(to!==i){board[to]=v;board[i]=0;}write--;}}}return board;}
export function validate(initial){validateBoard(initial);if(matches(initial).length)throw new Error('Initial match');if(gravity(initial).some((v,i)=>v!==initial[i]))throw new Error('Unstable board');return countFruit(initial);}
export function move(initial,a,b){
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=36||b>=36||!initial[a]||!initial[b]||initial[a]===9||initial[b]===9||initial[a]===initial[b]||!neighbors(a).includes(b))throw new Error('Illegal swap');
 let board=swapRaw(initial,a,b),removed=matches(board);if(!removed.length)throw new Error('No immediate match');const frames=[];
 while(removed.length){removed.forEach(i=>board[i]=0);const cleared=[...board];board=gravity(board);frames.push({removed,cleared,settled:[...board]});removed=matches(board);}
 return {board,frames,rounds:frames.length,removed:countFruit(initial)-countFruit(board)};
}
export function actions(board){const out=[];for(let i=0;i<36;i++)for(const j of [i+1,i+6]){try{const result=move(board,i,j);out.push({swap:[i,j],...result});}catch{}}return out;}
export function replay(initial,path,{requireClear=false}={}){validate(initial);let board=[...initial],rounds=0;const frames=[];for(const [a,b] of path){if(!countFruit(board))throw new Error('Already cleared');const result=move(board,a,b);board=result.board;rounds+=result.rounds;frames.push(...result.frames);}if(requireClear&&countFruit(board))throw new Error('Incomplete');return {board,rounds,frames,moves:path.length,remaining:countFruit(board)};}
// Depth-first search with transpositions. Every edge removes >=3 fruit, so depth <=12.
export function solve(initial,{maxNodes=20000}={}){
 validate(initial);const seen=new Set();let nodes=0,exhausted=false;
 function visit(board){if(!countFruit(board))return [];if(nodes>=maxNodes){exhausted=true;return null;}const key=board.join(',');if(seen.has(key))return null;seen.add(key);nodes++;
  for(let kind=1;kind<=8;kind++){const count=board.filter(v=>v===kind).length;if(count>0&&count<3)return null;}
  const next=actions(board).sort((a,b)=>countFruit(a.board)-countFruit(b.board));
  for(const item of next){const suffix=visit(item.board);if(suffix)return [item.swap,...suffix];if(exhausted)return null;}return null;
 }
 const solution=visit(initial);return solution?{status:'solved',solution,nodes,shortestProven:false}:{status:exhausted?'budget-exhausted':'unsolvable',nodes};
}
export const template=[1,2,1,3,4,3,2,1,2,4,3,4,5,6,5,7,8,7,6,5,6,8,7,8,1,2,1,9,9,9,2,1,2,9,9,9];
export function generate({seed=2909,perturbations=8,maxAttempts=5000}={}){
 if(!Number.isInteger(seed)||seed<=0||seed>0xffffffff||!Number.isInteger(perturbations)||perturbations<0||!Number.isInteger(maxAttempts)||maxAttempts<1)throw new Error('Generator options');
 let state=seed>>>0;const rand=n=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)%n;};
 for(let attempt=0;attempt<maxAttempts;attempt++){
  let board=[...template];for(let i=0;i<perturbations;i++){const a=rand(36),b=rand(36);board=swapRaw(board,a,b);}
  // Full board has no initial floating cells even when stars are rearranged.
  if(matches(board).length)continue;
  const result=solve(board,{maxNodes:3000});if(result.status!=='solved')continue;const verified=replay(board,result.solution,{requireClear:true});
  return {rules:'gravity-v1',seed,attempt:attempt+1,perturbations,board,solution:result.solution,solverNodes:result.nodes,moves:verified.moves,cascadeRounds:verified.rounds,shortestProven:false,notice:'Public research fixture, not a live prize puzzle.'};
 }
 throw new Error('No verified puzzle within generation budget');
}
