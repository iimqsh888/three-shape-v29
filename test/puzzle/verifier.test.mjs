import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,pack,unpack,encode} from '../../puzzle/evm.mjs';
import {generate} from '../../puzzle/generate.mjs';
import {solve} from '../../puzzle/solve.mjs';
import {replay,matches,move,legalMoves,countFruit} from '../../puzzle/engine.mjs';
import {exchange as uiExchange} from '../../web/src/game/nineFruits.ts';
let f,p,solution;
before(async()=>{f=await fixture();p=generate({seed:2907,shuffle:6});const result=solve(p.board);assert.equal(result.status,'solved');solution=result.solution;});
after(async()=>{await f?.engine.disconnect();});
test('seeded full board has all eight fruits, fixed stars, no automatic matches and two valid certificates',()=>{
 assert.deepEqual(generate({seed:2907,shuffle:6}),p);assert.equal(countFruit(p.board),30);assert.equal(p.board.filter(n=>n===9).length,6);for(let n=1;n<=8;n++)assert.ok(p.board.includes(n));assert.deepEqual(matches(p.board),[]);
 assert.equal(countFruit(replay(p.board,p.solution,{requireClear:true})),0);assert.equal(countFruit(replay(p.board,solution,{requireClear:true})),0);assert.equal(p.difficulty.shortestProven,false);
 assert.equal(solve(p.board,{maxNodes:1}).status,'budget-exhausted');
});
test('UI, JS and Solidity agree for every prefix, including no-match movements and simultaneous clearing',async()=>{
 let board=[...p.board];for(const action of solution){const result=move(board,...action);assert.deepEqual(uiExchange(board,...action)?.board,result.board);const chain=await f.verifier.replay(pack(board),encode([action]));assert.deepEqual(unpack(chain[0]),result.board);assert.equal(Number(chain[2]),countFruit(result.board));board=result.board;}
 // A five-fruit cross formed by one swap must clear simultaneously, not three then two.
 const cross=Array(36).fill(0);for(const i of [8,12,13,15,20])cross[i]=1;cross[14]=2;
 const result=move(cross,14,15);assert.equal(result.removed.length,5);assert.equal(Number((await f.verifier.replay(pack(cross),encode([[14,15]])))[2]),1);
});
test('rejects malformed boards, initial matches, malformed paths and illegal moves',async()=>{
 await assert.rejects(f.verifier.validate(1n<<144n),/InvalidBoard/);await assert.rejects(f.verifier.validate(10),/InvalidBoard/);
 const triple=Array(36).fill(0);triple[0]=triple[1]=triple[2]=1;await assert.rejects(f.verifier.validate(pack(triple)),/InitialMatch/);
 await assert.rejects(f.verifier.replay(pack(p.board),'0x01'),/InvalidMoves/);
 for(const action of [[0,0],[0,35],[5,6],[8,14],[36,0],[255,0]])await assert.rejects(f.verifier.replay(pack(p.board),encode([action])),/IllegalMove/);
 const final=pack(replay(p.board,solution));await assert.rejects(f.verifier.replay(final,encode([[0,1]])),/AlreadyCleared/);
});
test('mixed legal paths match all engines even when they do not clear',async()=>{
 let board=[...p.board],state=1234567;
 for(let batch=0;batch<5;batch++){const start=[...board],actions=[];for(let i=0;i<20&&countFruit(board);i++){state=(Math.imul(state,1664525)+1013904223)>>>0;const candidates=legalMoves(board),action=candidates[state%candidates.length];actions.push(action);const next=move(board,...action).board;assert.deepEqual(uiExchange(board,...action)?.board,next);board=next;}
 const chain=await f.verifier.replay(pack(start),encode(actions));assert.deepEqual(unpack(chain[0]),board);}
});
test('session binds intermediate state to the caller and rolls back invalid or oversized batches',async()=>{
 await(await f.session.start(pack(p.board))).wait();const address=await f.signer.getAddress();
 await assert.rejects(f.session.connect(await f.provider.getSigner(1)).submit.staticCall(encode(solution.slice(0,1))),/inactive/);
 await assert.rejects(f.session.submit.staticCall('0x'),/batch/);
 await assert.rejects(f.session.submit.staticCall(encode(Array(65).fill([0,1]))),/batch/);
 const before=await f.session.sessions(address);await assert.rejects(f.session.submit.staticCall(encode([[8,14]])),e=>f.verifier.interface.parseError(e.data)?.name==='IllegalMove');
 const rejected=await f.session.submit(encode([solution[0],[8,14]]),{gasLimit:3000000});await assert.rejects(rejected.wait());assert.deepEqual(Array.from(await f.session.sessions(address)),Array.from(before));
 for(let i=0;i<solution.length;i+=16)await(await f.session.submit(encode(solution.slice(i,i+16)),{gasLimit:3000000})).wait();
 const end=await f.session.sessions(address);assert.equal(end.moves,BigInt(solution.length));assert.equal(end.active,false);assert.equal(countFruit(unpack(end.board)),0);
 await assert.rejects(f.session.submit.staticCall(encode(solution.slice(0,1))),/inactive/);
});
