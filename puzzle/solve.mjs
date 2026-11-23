import {matches,validateBoard,legalMoves,move,countFruit} from './engine.mjs';
function score(board){let distance=0;for(let fruit=1;fruit<=8;fruit++){const cells=[];board.forEach((v,i)=>{if(v===fruit)cells.push(i);});if(cells.length>0&&cells.length<3)return Infinity;for(const a of cells){let nearest=Infinity;for(const b of cells)if(a!==b)nearest=Math.min(nearest,Math.abs(a%6-b%6)+Math.abs(Math.floor(a/6)-Math.floor(b/6)));if(Number.isFinite(nearest))distance+=nearest;}}return countFruit(board)*12+distance;}
/// Bounded beam search: returns a verified solution or 'budget-exhausted', never a false unsolvable claim.
export function solve(initial,{width=80,maxDepth=200,maxNodes=300000}={}){
 validateBoard(initial);if(matches(initial).length)throw new Error('Initial matches');
 let beam=[{board:initial,path:[],score:score(initial)}],nodes=0;const seen=new Set([initial.join(',')]);
 if(!countFruit(initial))return {status:'solved',solution:[],nodes,shortestProven:true};
 for(let depth=1;depth<=maxDepth;depth++){
  const candidates=[];
  for(const state of beam)for(const action of legalMoves(state.board)){
   if(++nodes>maxNodes)return {status:'budget-exhausted',nodes,depth};
   const next=move(state.board,...action).board,key=next.join(',');if(seen.has(key))continue;seen.add(key);
   const path=[...state.path,action],value=score(next);if(!countFruit(next))return {status:'solved',solution:path,nodes,depth,shortestProven:false};
   if(Number.isFinite(value))candidates.push({board:next,path,score:value});
  }
  candidates.sort((a,b)=>a.score-b.score);beam=candidates.slice(0,width);if(!beam.length)break;
 }
 return {status:'budget-exhausted',nodes};
}
