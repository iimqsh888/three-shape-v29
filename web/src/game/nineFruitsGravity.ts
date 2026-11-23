import {template,move,countFruit,replay as verify,actions as legalActions} from '../../../puzzle/gravity.mjs';
export const demoBoard=[...template];
export const fruitCount=countFruit;
export function exchange(board:number[],a:number,b:number){try{const result=move(board,a,b);return {...result,removed:result.frames.flatMap(f=>f.removed)};}catch{return null;}}
export function replay(actions:[number,number][]){try{return verify(demoBoard,actions).board;}catch{return null;}}
export const hasLegalMove=(board:number[])=>legalActions(board).length>0;
export const puzzleRules={version:'gravity-v1',size:6,empty:0,obstacle:9,emptySwaps:false,immediateMatchRequired:true,matchMinimum:3,gravity:true,starsBlockGravity:true,refill:false,moveLimit:null,challengeExpiry:null,seasonEnd:null,goal:'clear-all-fruit',stepFee3Shape:1,entryFee3Shape:10000,settlement:'replay-and-pay-before-ranking',status:'UI preview; not a live protocol'};
export const demoStorageKey='nine-fruits-gravity-demo-v1';
export interface DemoState {phase:'idle'|'playing'|'settled';actions:[number,number][];attempts:number;claimed:boolean;hasCompletion:boolean;title:string;sponsoredAt:number|null}
export function restoreDemo():DemoState {
 const empty:DemoState={phase:'idle',actions:[],attempts:0,claimed:false,hasCompletion:false,title:'',sponsoredAt:null};
 try{const value=JSON.parse(localStorage.getItem(demoStorageKey)||'null');if(!value||value.version!==1)return empty;
  if(!['idle','playing','settled'].includes(value.phase)||!Array.isArray(value.actions)||value.actions.length>12||!value.actions.every((a:unknown)=>Array.isArray(a)&&a.length===2&&a.every(Number.isInteger)))return empty;
  const board=replay(value.actions);if(!board||(value.phase==='settled'&&fruitCount(board)!==0))return empty;
  return {phase:value.phase,actions:value.phase==='idle'?[]:value.actions,attempts:Number.isSafeInteger(value.attempts)&&value.attempts>=0?value.attempts:0,claimed:value.claimed===true,hasCompletion:value.hasCompletion===true||value.phase==='settled',title:typeof value.title==='string'?Array.from(value.title).slice(0,16).join(''):'',sponsoredAt:typeof value.sponsoredAt==='number'&&Number.isFinite(value.sponsoredAt)&&value.sponsoredAt>=0?value.sponsoredAt:null};
 }catch{return empty;}
}
