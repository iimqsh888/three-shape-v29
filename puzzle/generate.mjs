import {matches,move,swapRaw,neighbors,legalMoves,replay,simplify,countFruit} from './engine.mjs';
function random(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
const lines=[];for(let i=0;i<36;i++){if(i%6<=3)lines.push([i,i+1,i+2]);if(i<24)lines.push([i,i+6,i+12]);}
export function generate({seed=2901,shuffle=16,maxAttempts=200}={}){
 if(!Number.isInteger(seed)||seed<=0||seed>0xffffffff||!Number.isInteger(shuffle)||shuffle<0||shuffle>100)throw new Error('Invalid generator options');
 const rng=random(seed),choose=a=>a[Math.floor(rng()*a.length)];
 // Six fixed stars; the 30 remaining cells use all eight fruits (two kinds have six).
 const stars=[8,9,16,19,26,27],types=[1,2,3,4,5,6,7,8,1,2];
 let searched=0;
 for(let attempt=0;attempt<maxAttempts;attempt++){
  let board=Array(36).fill(0);stars.forEach(i=>board[i]=9);const reverse=[];let failed=false;
  for(const fruit of types){
   let added=false;
   for(let tries=0;tries<15000&&!added;tries++){
    searched++;
    const candidates=lines.filter(line=>line.every(i=>board[i]===0));
    if(candidates.length){const line=choose(candidates),inserted=[...board];line.forEach(i=>inserted[i]=fruit);const found=matches(inserted);
     if(found.length===3&&line.every(i=>found.includes(i))){const pairs=line.flatMap(i=>neighbors(i).filter(j=>!line.includes(j)&&inserted[j]!==9&&inserted[j]!==fruit).map(j=>[i,j]));
      for(let k=pairs.length-1;k>0;k--){const j=Math.floor(rng()*(k+1));[pairs[k],pairs[j]]=[pairs[j],pairs[k]];}
      for(const pair of pairs){const precursor=swapRaw(inserted,...pair);if(!matches(precursor).length){const check=move(precursor,...pair).board;if(check.every((v,i)=>v===board[i])){board=precursor;reverse.push(pair);added=true;break;}}}
     }
    }
    if(!added){const possible=legalMoves(board);if(!possible.length)break;const pair=choose(possible),next=swapRaw(board,...pair);if(!matches(next).length){board=next;reverse.push(pair);}}
   }
   if(!added){failed=true;break;}
   for(let j=0;j<shuffle;j++){const pair=choose(legalMoves(board));if(!pair)break;const next=swapRaw(board,...pair);if(!matches(next).length){board=next;reverse.push(pair);}}
  }
  if(failed)continue;
  const solution=simplify(board,reverse.reverse());replay(board,solution,{requireClear:true});
  return {version:1,seed,board,solution,fruitCount:countFruit(board),stars,construction:{attempt:attempt+1,candidatesExamined:searched,shuffle},difficulty:{knownSolutionMoves:solution.length,shortestProven:false,uniqueSolutionProven:false},notice:'Research fixture. Public solution. Do not use as a live prize puzzle.'};
 }
 throw new Error('No verified board found within generator budget');
}
