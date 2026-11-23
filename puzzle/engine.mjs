export const SIZE=6;
export const countFruit=b=>b.filter(v=>v>0&&v<9).length;
export function validateBoard(board){if(!Array.isArray(board)||board.length!==36||board.some(v=>!Number.isInteger(v)||v<0||v>9))throw new Error('Invalid board');}
export function matches(board){const out=new Set();for(let i=0;i<36;i++){if(board[i]===0||board[i]===9)continue;for(const step of [1,6]){const run=[i];for(let j=i+step;j<36&&(step===6||Math.floor(j/6)===Math.floor(i/6))&&board[j]===board[i];j+=step)run.push(j);if(run.length>=3)run.forEach(k=>out.add(k));}}return [...out].sort((a,b)=>a-b);}
export function legal(board,a,b){return Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>=0&&a<36&&b<36&&board[a]!==9&&board[b]!==9&&board[a]!==board[b]&&Math.abs(Math.floor(a/6)-Math.floor(b/6))+Math.abs(a%6-b%6)===1;}
export function swapRaw(board,a,b){const out=[...board];[out[a],out[b]]=[out[b],out[a]];return out;}
export function move(board,a,b){if(!legal(board,a,b))throw new Error('Illegal move');const next=swapRaw(board,a,b),removed=matches(next);removed.forEach(i=>next[i]=0);return {board:next,removed};}
export function replay(initial,actions,{requireClear=false}={}){validateBoard(initial);if(matches(initial).length)throw new Error('Initial matches');let board=[...initial];for(const [a,b] of actions){if(!countFruit(board))throw new Error('Move after completion');board=move(board,a,b).board;}if(requireClear&&countFruit(board))throw new Error('Incomplete');return board;}
export function neighbors(i){return [i%6?i-1:-1,i%6<5?i+1:-1,i-6,i+6].filter(j=>j>=0&&j<36);}
export function legalMoves(board){const out=[];for(let i=0;i<36;i++)for(const j of [i+1,i+6])if(legal(board,i,j))out.push([i,j]);return out;}
// Removes repeated-state detours from a known valid solution; does not prove shortestness.
export function simplify(initial,actions){let board=[...initial],path=[],states=[board.join(',')],seen=new Map([[states[0],0]]);for(const action of actions){board=move(board,...action).board;const key=board.join(',');if(seen.has(key)){const k=seen.get(key);path=path.slice(0,k);states=states.slice(0,k+1);seen=new Map(states.map((s,i)=>[s,i]));}else{path.push(action);states.push(key);seen.set(key,path.length);}}return path;}
