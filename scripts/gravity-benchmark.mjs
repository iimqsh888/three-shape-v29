import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fixture,pack,unpack,encode} from '../puzzle/evm.mjs';
import {generate,template,solve,replay,move,validate} from '../puzzle/gravity.mjs';
const directory='reports/nine-fruits/gravity';fs.mkdirSync(directory,{recursive:true});const f=await fixture();
try{
 const generated=generate({seed:2909,perturbations:8,maxAttempts:400});
 const second={board:[9,2,1,3,4,3,5,1,2,4,3,4,2,6,5,7,8,7,6,5,6,8,7,8,2,2,1,1,9,9,1,1,2,9,9,9]};
 const cascade=Array(36).fill(0);for(const i of [19,24,31])cascade[i]=1;for(const i of [13,25,30,32])cascade[i]=2;
 const cases=[{name:'structured-full-board',board:template},{name:'shuffled-seed-2909',...generated},{name:'shuffled-seed-2910',...second},{name:'two-round-cascade-partial',board:cascade,solution:[[24,25]]}];
 const report={network:'Local Ganache, chainId 31337, Shanghai; not BSC Fork or public network',compiler:f.compiled.compiler,optimizer:f.compiled.settings.optimizer,scope:'Actual verifier transaction receipts only; no eligibility, fees, ranks, rewards, medals or state writes.',ruleVersion:'gravity-v1',runtimeBytes:f.compiled.artifacts.NineFruitsGravityVerifier.evm.deployedBytecode.object.length/2,cases:[]};
 for(const item of cases){const s=item.solution?{solution:item.solution}:solve(item.board);assert.ok(s.solution);const expected=replay(item.board,s.solution);if(!item.name.includes('partial'))assert.equal(expected.remaining,0);
  const result=await f.gravityVerifier.replay(pack(item.board),encode(s.solution));assert.deepEqual(unpack(result[0]),expected.board);assert.equal(Number(result[3]),expected.rounds);
  const tx=await f.signer.sendTransaction({to:await f.gravityVerifier.getAddress(),data:f.gravityVerifier.interface.encodeFunctionData('replay',[pack(item.board),encode(s.solution)]),gasLimit:2700000}),receipt=await tx.wait();
  const row={name:item.name,board:item.board,solution:s.solution,moves:s.solution.length,cascadeRounds:expected.rounds,remaining:expected.remaining,gasUsed:Number(receipt.gasUsed),receiptStatus:receipt.status,shortestProven:false};report.cases.push(row);
 }
 fs.writeFileSync(`${directory}/seed-2909.json`,JSON.stringify(generated,null,2)+'\n');fs.writeFileSync(`${directory}/gas.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await f.engine.disconnect();}
