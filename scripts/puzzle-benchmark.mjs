import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generate} from '../puzzle/generate.mjs';
import {solve} from '../puzzle/solve.mjs';
import {replay,countFruit,legalMoves,swapRaw,matches} from '../puzzle/engine.mjs';
import {fixture,pack,unpack,encode} from '../puzzle/evm.mjs';
const directory='reports/nine-fruits';fs.mkdirSync(directory,{recursive:true});
const f=await fixture();
try{
 const report={network:'Local Ganache EVM, chainId 31337; NOT BSC fork/testnet/mainnet',compiler:f.compiled.compiler,settings:f.compiled.settings,scope:'Pure replay and stateful research harness only; excludes NFT/.ai checks, token fees, ranks, rewards, medals, transaction-order protection.',deployment:{},samples:[],longPaths:[]};
 for(const [name,a] of Object.entries(f.compiled.artifacts))report.deployment[name]={runtimeBytes:a.evm.deployedBytecode.object.length/2};
 for(const seed of [2901,2919,2907]){
  const p=generate({seed,shuffle:6}),s=solve(p.board);assert.equal(s.status,'solved');replay(p.board,s.solution,{requireClear:true});
  const actions=encode(s.solution),result=await f.verifier.replay(pack(p.board),actions);assert.equal(Number(result[2]),0);
  const tx=await f.signer.sendTransaction({to:await f.verifier.getAddress(),data:f.verifier.interface.encodeFunctionData('replay',[pack(p.board),actions]),gasLimit:15000000});const receipt=await tx.wait();
  const sample={...p,solver:{status:s.status,nodes:s.nodes,solution:s.solution,moves:s.solution.length,shortestProven:false},gas:{fullReplayTransaction:Number(receipt.gasUsed),calldataBytes:(tx.data.length-2)/2}};
  fs.writeFileSync(`${directory}/seed-${seed}.json`,JSON.stringify(sample,null,2)+'\n');report.samples.push({seed,fruitCount:p.fruitCount,constructiveMoves:p.solution.length,solverMoves:s.solution.length,searchNodes:s.nodes,pureReplayGas:Number(receipt.gasUsed)});
 }
 const p=generate({seed:2907,shuffle:6}),solution=solve(p.board).solution;
 const detour=legalMoves(p.board).find(pair=>!matches(swapRaw(p.board,...pair)).length);assert.ok(detour);
 for(const extra of [0,150,450]){
  const moves=[...Array.from({length:extra/2},()=>[detour,detour]).flat(),...solution];
  assert.equal(countFruit(replay(p.board,moves,{requireClear:true})),0);
  const actions=encode(moves),pure=await f.signer.sendTransaction({to:await f.verifier.getAddress(),data:f.verifier.interface.encodeFunctionData('replay',[pack(p.board),actions]),gasLimit:15000000}),receipt=await pure.wait();
  await(await f.session.start(pack(p.board))).wait();let total=0;const batches=[];
  for(let i=0;i<moves.length;i+=64){const part=moves.slice(i,i+64),tx=await f.session.submit(encode(part),{gasLimit:3000000}),r=await tx.wait();total+=Number(r.gasUsed);batches.push({moves:part.length,gas:Number(r.gasUsed)});}
  const end=await f.session.sessions(await f.signer.getAddress());assert.equal(end.moves,BigInt(moves.length));assert.equal(countFruit(unpack(end.board)),0);assert.equal(end.active,false);
  report.longPaths.push({moves:moves.length,paddedDetourMoves:extra,pureReplayGas:Number(receipt.gasUsed),statefulBatchGasTotal:total,batches});
 }
 fs.writeFileSync(`${directory}/gas.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await f.engine.disconnect();}
