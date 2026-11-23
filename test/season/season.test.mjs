import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ethers} from 'ethers';
import {scenario,UNIT,DEAD,PACKED,PATH,COMMITMENT,REENTRANCY,recordGas} from './helpers.mjs';
const Z=ethers.ZeroAddress;
const sent=async promise=>(await promise).wait();

test('funding, strict titles, exact token deposits, delayed publication and restricted administration',async()=>{
 const f=await scenario();try{
  const {game,reward,admin}=f;
  assert.equal(await game.owner(),admin.address);assert.ok((await f.provider.getCode(await game.verifier())).length>2);
  await assert.rejects(game.renounceOwnership.staticCall(),/renounce disabled/);
  for(const title of ['', '   ', 'a'.repeat(17),'果'.repeat(17),'a\n'])await assert.rejects(game.sponsor.staticCall(1,title,Z,0,{value:UNIT}),/title/);
  for(const title of ['果'.repeat(16),'🥑'.repeat(16)])await game.sponsor.staticCall(1,title,Z,0,{value:UNIT});
  const malformed=game.interface.getFunction('sponsor').selector+ethers.AbiCoder.defaultAbiCoder().encode(['uint256','bytes','address','uint256'],[1,'0xc080',Z,0]).slice(2);
  await assert.rejects(f.provider.call({to:game.target,from:admin.address,data:malformed,value:UNIT}),/title/);
  await assert.rejects(game.sponsor.staticCall(2,'S2',Z,0,{value:2n*UNIT}),/not available/);
  await assert.rejects(game.sponsor.staticCall(1,'S1',Z,0,{value:UNIT-1n}),/BNB pool/);
  const per=100n*10n**6n;await sent(reward.mint(admin.address,per*90n));await sent(reward.approve(game.target,ethers.MaxUint256));
  await assert.rejects(game.sponsor.staticCall(1,'S1',reward.target,per,{value:UNIT}),/token not allowed/);
  await sent(game.setRewardTokenAllowed(reward.target,true));await sent(reward.setTaxed(true));
  const failed=await game.sponsor(1,'S1',reward.target,per,{value:UNIT,gasLimit:1000000});await assert.rejects(failed.wait());assert.equal((await game.season(1)).sponsor,Z);assert.equal(await f.provider.getBalance(game.target),0n);assert.equal(await reward.balanceOf(game.target),0n);
  await sent(reward.setTaxed(false));await sent(game.sponsor(1,'冠名标题',reward.target,per,{value:UNIT}));assert.equal((await game.season(1)).tokenPool,per*90n);
  await assert.rejects(game.sponsor.staticCall(1,'again',Z,0,{value:UNIT}),/not available/);
  const other=await f.provider.getSigner(1);await assert.rejects(game.connect(other).publish.staticCall(1,PACKED,COMMITMENT),/publisher only/);
  await f.engine.request({method:'evm_increaseTime',params:[9*3600]});await f.engine.request({method:'evm_mine',params:[]});assert.equal(await game.publicationDelayed(1),true);
  await assert.rejects(game.publish.staticCall(1,0,COMMITMENT),/empty board/);
  await assert.rejects(game.publish.staticCall(1,PACKED,ethers.ZeroHash),/solution commitment/);
  await sent(game.setPublisher(other.address,true));await sent(game.connect(other).publish(1,PACKED,COMMITMENT));assert.equal((await game.season(1)).opened,true);assert.equal(await game.nextSeasonToSponsor(),2n);
  await assert.rejects(game.publish.staticCall(1,PACKED,COMMITMENT),/not publishable/);
  assert.equal((await game.season(1)).title,'冠名标题');assert.equal((await game.season(1)).board,PACKED);
  await sent(game.transferOwnership(other.address));assert.equal(await game.owner(),admin.address);await sent(game.connect(other).acceptOwnership());assert.equal(await game.owner(),other.address);
 }finally{await f.engine.disconnect();}
});

test('eligibility, entry and fee rollback, immutable puzzle, complete replay and soulbound medal',async()=>{
 const f=await scenario();try{
  await f.fundOpen();const p=await f.player(1),other=await f.player(2),{game,shape}=f;
  await sent(f.identity.set(p.address,0));await assert.rejects(p.game.start.staticCall(1,p.ids),/no .ai/);await sent(f.identity.set(p.address,1));
  const duplicate=[...p.ids];duplicate[8]=duplicate[0];await assert.rejects(p.game.start.staticCall(1,duplicate),/duplicate kind/);await assert.rejects(p.game.start.staticCall(1,other.ids),/NFT owner/);
  await sent(shape.connect(p.signer).approve(game.target,0));const denied=await p.game.start(1,p.ids,{gasLimit:1000000});await assert.rejects(denied.wait());assert.equal((await game.challenges(1,p.address)).nonce,0n);assert.equal(await shape.balanceOf(DEAD),0n);
  await sent(shape.connect(p.signer).approve(game.target,10000n*UNIT));const started=await sent(p.game.start(1,p.ids));recordGas('startNineNFTs',started.gasUsed);assert.equal(await shape.balanceOf(DEAD),10000n*UNIT);
  await assert.rejects(p.game.start.staticCall(1,p.ids),/active challenge/);await assert.rejects(other.game.settle.staticCall(1,1,PATH,p.ids),/challenge/);
  await assert.rejects(p.game.settle.staticCall(1,2,PATH,p.ids),/challenge/);await assert.rejects(p.game.settle.staticCall(1,1,'0x0107',p.ids),/incomplete/);await assert.rejects(p.game.settle.staticCall(1,1,'0x0001',p.ids));
  const before=await shape.balanceOf(p.address);const unpaid=await p.game.settle(1,1,PATH,p.ids,{gasLimit:2700000});await assert.rejects(unpaid.wait());assert.equal((await game.season(1)).completions,0n);assert.equal((await game.challenges(1,p.address)).active,true);assert.equal(await shape.balanceOf(p.address),before);
  await sent(shape.connect(p.signer).approve(game.target,ethers.MaxUint256));await sent(f.identity.set(p.address,0));await assert.rejects(p.game.settle.staticCall(1,1,PATH,p.ids),/no .ai/);await sent(f.identity.set(p.address,1));
  await sent(f.nft.connect(p.signer).transfer(p.ids[8],other.address));await assert.rejects(p.game.settle.staticCall(1,1,PATH,p.ids),/NFT owner/);await sent(f.nft.connect(other.signer).transfer(p.ids[8],p.address));
  const receipt=await sent(p.game.settle(1,1,PATH,p.ids,{gasLimit:2700000}));recordGas('settleFiveMovesWithMedal',receipt.gasUsed);assert.equal((await game.completions(1,p.address)).rank,1n);assert.equal((await game.completions(1,p.address)).moves,5n);assert.equal((await game.challenges(1,p.address)).active,false);assert.equal(await shape.balanceOf(DEAD),10005n*UNIT);
  const medal=new ethers.Contract(await game.medal(),f.compiled.artifacts.NineFruitsMedal.abi,p.signer),id=await medal.medalOf(p.address,1);assert.equal(await medal.ownerOf(id),p.address);
  const json=JSON.parse(Buffer.from((await medal.tokenURI(id)).split(',')[1],'base64').toString());assert.equal(json.symbol,'🏅');assert.equal(json.attributes.find(a=>a.trait_type==='Completion Moves').value,5);assert.equal(json.attributes.find(a=>a.trait_type==='Rank').value,1);
  await assert.rejects(medal.transferFrom.staticCall(p.address,other.address,id),/Soulbound/);await assert.rejects(medal.approve.staticCall(other.address,id),/Soulbound/);await assert.rejects(medal.issue.staticCall(p.address,2,1,5,COMMITMENT),/issuer only/);
  await assert.rejects(p.game.settle.staticCall(1,1,PATH,p.ids),/challenge/);await assert.rejects(p.game.start.staticCall(1,p.ids),/already completed/);
 }finally{await f.engine.disconnect();}
});

test('no challenge expiry, explicit abandonment/nonces, S1-S3 progression and permanent old-season entry',async()=>{
 const f=await scenario();try{
  await f.fundOpen(1);await f.fundOpen(2);const p=await f.player(1),newcomer=await f.player(2),retry=await f.player(3);
  await assert.rejects(newcomer.game.start.staticCall(2,newcomer.ids),/previous medal/);
  await sent(p.game.start(1,p.ids));await f.engine.request({method:'evm_increaseTime',params:[365*86400]});await f.engine.request({method:'evm_mine',params:[]});await sent(p.game.settle(1,1,PATH,p.ids,{gasLimit:2700000}));
  await f.complete(p,2);await f.fundOpen(3);await f.complete(p,3);const medal=new ethers.Contract(await f.game.medal(),f.compiled.artifacts.NineFruitsMedal.abi,p.signer);for(const id of [1,2,3])assert.equal(await medal.hasMedal(p.address,id),true);
  await sent(retry.game.start(1,retry.ids));await assert.rejects(retry.game.abandon.staticCall(1,2),/challenge/);const before=await f.shape.balanceOf(DEAD);await sent(retry.game.abandon(1,1));assert.equal(await f.shape.balanceOf(DEAD),before);await sent(retry.game.start(1,retry.ids));assert.equal((await f.game.challenges(1,retry.address)).nonce,2n);assert.equal(await f.shape.balanceOf(DEAD)-before,10000n*UNIT);await assert.rejects(retry.game.settle.staticCall(1,1,PATH,retry.ids),/challenge/);
  await f.complete(newcomer,1);assert.equal((await f.game.completions(1,newcomer.address)).rank,2n);assert.equal((await f.game.season(1)).opened,true);
 }finally{await f.engine.disconnect();}
});

test('failed BNB receivers preserve claims and recipient callbacks cannot reenter',async()=>{
 const f=await scenario();try{
  await f.fundOpen();const p=await f.player(1);await f.complete(p);const reject=await f.deploy('SeasonRejectBNB');
  const denied=await p.game.claimBNB(1,reject.target,{gasLimit:500000});await assert.rejects(denied.wait());assert.equal((await f.game.completions(1,p.address)).bnbClaimed,false);assert.equal((await f.game.season(1)).bnbPaid,0n);
  const receiver=await f.deploy('SeasonReenterBNB',[f.game.target]);await sent(receiver.setSeason(1));const receipt=await sent(p.game.claimBNB(1,receiver.target));recordGas('claimBNB',receipt.gasUsed);assert.equal(await receiver.attempted(),true);assert.equal(await receiver.succeeded(),false);assert.equal(await receiver.failure(),REENTRANCY);assert.equal(await f.provider.getBalance(receiver.target),3n*UNIT/10n);assert.equal((await f.game.season(1)).bnbPaid,3n*UNIT/10n);assert.equal(await f.provider.getBalance(f.game.target),7n*UNIT/10n);
  await assert.rejects(p.game.claimBNB.staticCall(1,p.address),/no BNB claim/);
 }finally{await f.engine.disconnect();}
});

test('ranks 1-101, exact 30/70 allocation, all 90 token recipients, failed-token isolation and season liabilities',async()=>{
 const f=await scenario(104);try{
  const per=123n*10n**6n;await f.fundOpen(1,{token:f.reward.target,perPerson:per});const players=[];let sum=0n,maxGas=0n;
  for(let i=1;i<=101;i++){const p=await f.player(i);players.push(p);const receipt=await f.complete(p);if(receipt.gasUsed>maxGas)maxGas=receipt.gasUsed;assert.equal((await f.game.completions(1,p.address)).rank,BigInt(i));const bnb=await f.game.bnbEntitlement(1,p.address),token=await f.game.tokenEntitlement(1,p.address);if(i<=10){sum+=bnb;assert.equal(token,0n);}else{assert.equal(bnb,0n);assert.equal(token,i<=100?per:0n);}if(i%20===0)console.log(`Season ranking integration: ${i}/101 completions verified`);}
  assert.equal(sum,UNIT);assert.equal(await f.game.bnbEntitlement(1,players[0].address),3n*UNIT/10n);const base=(7n*UNIT/10n)/9n;assert.equal(await f.game.bnbEntitlement(1,players[9].address),7n*UNIT/10n-base*8n);recordGas('maximumSettleAcross101Players',maxGas);
  const medal=new ethers.Contract(await f.game.medal(),f.compiled.artifacts.NineFruitsMedal.abi,f.admin);assert.equal(await medal.hasMedal(players[100].address,1),true);
  await sent(f.game.setRewardTokenAllowed(f.reward.target,false));await sent(f.reward.setFail(true));const denied=await players[10].game.claimToken(1,f.admin.address,{gasLimit:500000});await assert.rejects(denied.wait());assert.equal((await f.game.completions(1,players[10].address)).tokenClaimed,false);assert.equal((await f.game.season(1)).tokenPaid,0n);
  // Paused reward token cannot block unrelated BNB claims.
  for(let i=0;i<10;i++)await sent(players[i].game.claimBNB(1,f.admin.address));assert.equal((await f.game.season(1)).bnbPaid,UNIT);assert.equal(await f.provider.getBalance(f.game.target),0n);
  await sent(f.reward.setFail(false));await sent(f.reward.setTaxed(true));const taxed=await players[10].game.claimToken(1,f.admin.address,{gasLimit:500000});await assert.rejects(taxed.wait());assert.equal(await f.reward.balanceOf(f.game.target),per*90n);assert.equal((await f.game.completions(1,players[10].address)).tokenClaimed,false);await sent(f.reward.setTaxed(false));
  await sent(f.reward.setHook(f.game.target,f.game.interface.encodeFunctionData('claimToken',[1,f.admin.address])));await sent(players[10].game.claimToken(1,f.admin.address));assert.equal(await f.reward.hookSucceeded(),false);assert.equal(await f.reward.hookError(),REENTRANCY);await sent(f.reward.setHook(Z,'0x'));
  for(let i=11;i<100;i++)await sent(players[i].game.claimToken(1,f.admin.address));assert.equal((await f.game.season(1)).tokenPaid,per*90n);assert.equal(await f.reward.balanceOf(f.game.target),0n);assert.equal(await f.reward.balanceOf(f.admin.address),per*90n);
  await assert.rejects(players[10].game.claimToken.staticCall(1,f.admin.address),/no token claim/);await assert.rejects(players[100].game.claimToken.staticCall(1,f.admin.address),/no token claim/);
  await f.fundOpen(2,{token:f.reward.target,perPerson:per});assert.equal(await f.provider.getBalance(f.game.target),2n*UNIT);assert.equal(await f.reward.balanceOf(f.game.target),per*90n);await assert.rejects(players[0].game.claimBNB.staticCall(2,f.admin.address),/no BNB claim/);assert.equal((await f.game.season(1)).tokenPaid,per*90n);assert.equal((await f.game.season(2)).tokenPaid,0n);
 }finally{await f.engine.disconnect();}
});

test('BSC deployment refuses an arbitrary replacement .ai registry',async()=>{
 const f=await scenario(3,{chainId:56});try{await assert.rejects(f.newGame(),/wrong BSC identity|missing revert data/);}finally{await f.engine.disconnect();}
});


test('real V2.9 Token/NFT interfaces integrate without changing mint permissions or burning collectibles',async()=>{
 const f=await scenario();try{
  const actor=await f.provider.getSigner(1),token=await f.deploy('ThreeShapeTokenV29',[f.admin.address,f.admin.address]),nft=await f.deploy('ThreeShapeNFTV29',[f.admin.address]);
  const game=await f.deploy('NineFruitsSeason',[token.target,nft.target,f.identity.target,f.admin.address]);await sent(f.identity.set(actor.address,1));await sent(token.mintPlayer(actor.address,100100n*UNIT));const supply=await token.totalSupply();
  const ids=[];for(let k=1;k<=9;k++){ids.push(await nft.nextId());await sent(nft.mintTo(actor.address,k));}
  await sent(game.sponsor(1,'原版接口',Z,0,{value:UNIT}));await sent(game.publish(1,PACKED,COMMITMENT));await sent(token.connect(actor).approve(game.target,ethers.MaxUint256));
  await sent(game.connect(actor).start(1,ids));const receipt=await sent(game.connect(actor).settle(1,1,PATH,ids,{gasLimit:2700000}));recordGas('settleWithOriginalTokenAndNFT',receipt.gasUsed);
  assert.equal(await token.balanceOf(DEAD),10005n*UNIT);assert.equal(await token.totalSupply(),supply);for(const id of ids)assert.equal(await nft.ownerOf(id),actor.address);
  await assert.rejects(token.connect(actor).mintPlayer.staticCall(actor.address,1),/player mint denied/);await assert.rejects(nft.connect(actor).mintTo.staticCall(actor.address,1),/mint denied/);
 }finally{await f.engine.disconnect();}
});

test('extra sender fees on the entry asset revert the entire ticket transaction',async()=>{
 const f=await scenario();try{await f.fundOpen();const p=await f.player(1);await sent(f.shape.setSenderTax(true));const before=await f.shape.balanceOf(p.address);const tx=await p.game.start(1,p.ids,{gasLimit:1000000});await assert.rejects(tx.wait());assert.equal(await f.shape.balanceOf(p.address),before);assert.equal(await f.shape.balanceOf(DEAD),0n);assert.equal((await f.game.challenges(1,p.address)).nonce,0n);assert.equal((await f.game.challenges(1,p.address)).active,false);}finally{await f.engine.disconnect();}
});


test('reward sponsorship rejects an extra sender-side fee even when the prize pool would receive the exact amount',async()=>{
 const f=await scenario();try{const per=1000000n,total=per*90n;await sent(f.game.setRewardTokenAllowed(f.reward.target,true));await sent(f.reward.mint(f.admin.address,total*2n));await sent(f.reward.approve(f.game.target,ethers.MaxUint256));await sent(f.reward.setSenderTax(true));const tx=await f.game.sponsor(1,'exact reward',f.reward.target,per,{value:UNIT,gasLimit:1000000});await assert.rejects(tx.wait());assert.equal((await f.game.season(1)).sponsor,Z);assert.equal(await f.reward.balanceOf(f.admin.address),total*2n);assert.equal(await f.reward.balanceOf(f.game.target),0n);assert.equal(await f.provider.getBalance(f.game.target),0n);}finally{await f.engine.disconnect();}
});

test('seven-move shuffled board settles atomically under the 2.7M budget',async()=>{
 const f=await scenario();try{const fs=await import('node:fs');const sample=JSON.parse(fs.readFileSync('reports/nine-fruits/gravity/seed-2909.json','utf8'));const board=sample.board.reduce((v,k,i)=>v|(BigInt(k)<<BigInt(i*4)),0n),path=ethers.hexlify(Uint8Array.from(sample.solution.flat()));await sent(f.game.sponsor(1,'seven moves',Z,0,{value:UNIT}));await sent(f.game.publish(1,board,ethers.keccak256(path)));const p=await f.player(1);await sent(p.game.start(1,p.ids));const receipt=await sent(p.game.settle(1,1,path,p.ids,{gasLimit:2700000}));recordGas('settleSevenMoveShuffledBoard',receipt.gasUsed);assert.equal((await f.game.completions(1,p.address)).moves,7n);assert.equal(await f.shape.balanceOf(DEAD),10007n*UNIT);assert.ok(receipt.gasUsed<2700000n);}finally{await f.engine.disconnect();}
});
