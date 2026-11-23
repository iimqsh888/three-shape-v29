import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture,pack,unpack,encode} from '../../puzzle/evm.mjs';
import {matches,countFruit} from '../../puzzle/engine.mjs';
import {gravity,validate,move,actions,replay,solve,template} from '../../puzzle/gravity.mjs';
let f;
before(async()=>{f=await fixture();});after(async()=>{await f?.engine.disconnect();});
const sample=[2,1,1,3,4,3,2,7,2,4,3,4,5,6,5,7,8,1,6,5,6,8,1,8,1,2,1,9,9,9,7,2,2,9,9,9];
test('stable full board with all fruits clears in both engines; prefixes remain stable and stars never move',async()=>{
 const solved=solve(sample);assert.equal(solved.status,'solved');const expected=replay(sample,solved.solution,{requireClear:true});const chain=await f.gravityVerifier.replay(pack(sample),encode(solved.solution));assert.deepEqual(unpack(chain[0]),expected.board);assert.equal(Number(chain[2]),0);assert.equal(Number(chain[3]),expected.rounds);
 let board=[...sample];for(const swap of solved.solution){const next=move(board,...swap);assert.ok(next.removed>=3);assert.deepEqual(matches(next.board),[]);assert.deepEqual(gravity(next.board),next.board);for(let i=0;i<36;i++)if(board[i]===9)assert.equal(next.board[i],9);const result=await f.gravityVerifier.replay(pack(board),encode([swap]));assert.deepEqual(unpack(result[0]),next.board);assert.equal(Number(result[3]),next.rounds);board=next.board;}
 assert.ok(solved.solution.length<=Math.floor(countFruit(sample)/3));assert.ok(expected.rounds<=Math.floor(countFruit(sample)/3));
});
test('two cascade rounds count as one player move',async()=>{
 const board=Array(36).fill(0);for(const i of [19,24,31])board[i]=1;for(const i of [13,25,30,32])board[i]=2;
 validate(board);const expected=move(board,24,25);assert.equal(expected.rounds,2);assert.equal(expected.removed,6);const result=await f.gravityVerifier.replay(pack(board),encode([[24,25]]));assert.equal(Number(result[1]),1);assert.equal(Number(result[3]),2);assert.deepEqual(unpack(result[0]),expected.board);
});
test('stars split a column into independent falling segments',async()=>{
 const board=Array(36).fill(0);board[6]=1;board[12]=2;board[18]=9;board[24]=1;board[30]=2;board[25]=2;board[31]=1;board[26]=1;board[32]=2;
 validate(board);const expected=move(board,25,31);assert.equal(expected.board[6],1);assert.equal(expected.board[12],2);assert.equal(expected.board[18],9);assert.equal(expected.board[30],0);const result=await f.gravityVerifier.replay(pack(board),encode([[25,31]]));assert.deepEqual(unpack(result[0]),expected.board);
});
test('invalid swaps, non-matching swaps, floating inputs and malformed paths revert',async()=>{
 const packed=pack(template);for(const pair of [[0,35],[5,6],[27,21],[36,0],[0,0]])await assert.rejects(f.gravityVerifier.replay(packed,encode([pair])),/IllegalMove/);
 await assert.rejects(f.gravityVerifier.replay(packed,encode([[0,1]])),/NoImmediateMatch/);
 await assert.rejects(f.gravityVerifier.replay(packed,'0x01'),/InvalidMoves/);
 await assert.rejects(f.gravityVerifier.validate(1n<<144n),/InvalidBoard/);await assert.rejects(f.gravityVerifier.validate(10),/InvalidBoard/);
 const floating=Array(36).fill(0);floating[0]=1;await assert.rejects(f.gravityVerifier.validate(pack(floating)),/UnstableBoard/);
 const triple=Array(36).fill(0);triple[30]=triple[31]=triple[32]=1;await assert.rejects(f.gravityVerifier.validate(pack(triple)),/InitialMatch/);
 const partial=move(template,1,7).board;await assert.rejects(f.gravityVerifier.replay(pack(partial),encode([[0,6]])),/IllegalMove/);
 const solved=solve(template);const final=replay(template,solved.solution).board;await assert.rejects(f.gravityVerifier.replay(pack(final),encode([[0,1]])),/AlreadyCleared/);
});
test('simultaneous horizontal and vertical matches clear their union once',async()=>{
 // Crossing match in bottom rows, with stable filler above each lower fruit.
 const board=Array(36).fill(0);board[14]=1;board[20]=1;board[26]=2;board[25]=1;board[27]=1;board[24]=1;board[30]=3;board[31]=4;board[32]=3;board[33]=4;
 validate(board);const expected=move(board,26,27);assert.equal(expected.frames[0].removed.length,5);const result=await f.gravityVerifier.replay(pack(board),encode([[26,27]]));assert.deepEqual(unpack(result[0]),expected.board);
});
test('bounded search distinguishes dead ends from budget exhaustion',()=>{
 const dead=Array(36).fill(0);dead[30]=1;dead[31]=2;assert.equal(solve(dead).status,'unsolvable');assert.equal(solve(sample,{maxNodes:1}).status,'budget-exhausted');assert.equal(solve(sample).status,'solved');
});
test('independent engines agree on seeded random stable boards and their legal moves',async()=>{
 let seed=240529,count=0;const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let attempt=0;attempt<500&&count<15;attempt++){
  const board=Array.from({length:36},()=>1+random(9));if(matches(board).length)continue;const options=actions(board);if(!options.length)continue;const choice=options[random(options.length)];const result=await f.gravityVerifier.replay(pack(board),encode([choice.swap]));assert.deepEqual(unpack(result[0]),choice.board);assert.equal(Number(result[3]),choice.rounds);assert.ok(choice.rounds<=12);count++;
 }assert.equal(count,15);
});
