import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Wallet,Contract,keccak256,concat,toUtf8Bytes,formatEther} from 'ethers';
import {testnetProvider,requireTestnet,READ_RPC} from './lib/bsc-testnet-rpc.mjs';

const deploymentDirectory=process.env.THREE_SHAPE_DEPLOYMENT_DIR??'deployments/bsc-testnet-settlement';
const file=`${deploymentDirectory}/function-tests.json`;
const finalOnly=process.argv.includes('--verify-final');
const resume=process.argv.includes('--resume')||finalOnly;
if(fs.existsSync(file)&&!resume)throw new Error('On-chain scenario already started. Inspect its receipts; use explicit --resume only after correcting the harness.');
const d=JSON.parse(fs.readFileSync(`${deploymentDirectory}/deployment.json`));
const report=resume?JSON.parse(fs.readFileSync(file)):{chainId:97,startedAt:new Date().toISOString(),status:'running',dependencyNotice:d.dependencyNotice,checks:[],transactions:[],players:[]};
if(resume){report.attempts??=[];report.attempts.push({previousStatus:report.status,error:report.error,resumedAt:new Date().toISOString()});delete report.error;report.status='running';}
const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
const provider=testnetProvider(READ_RPC);await requireTestnet(provider);
const root=await Wallet.fromEncryptedJson(fs.readFileSync('/workspace/.secrets/three-shape-bsc-testnet/wallet.keystore.json','utf8'),fs.readFileSync('/workspace/.secrets/three-shape-bsc-testnet/wallet.password','utf8').trim());
const wallets=[root,...Array.from({length:15},(_,i)=>new Wallet(keccak256(concat([root.privateKey,toUtf8Bytes(`three-shape-testnet-scenario-${i+1}`)]))))].map(w=>w.connect(provider));
report.players=wallets.map(w=>w.address);save();
const artifact=name=>JSON.parse(fs.readFileSync(`artifacts/${name}.json`));
const bind=(key,name)=>new Contract(d.contracts[key],artifact(name).abi,wallets[0]);
const game=bind('game','ThreeShapeGameV29'),nft=bind('nft','ThreeShapeNFTV29'),token=bind('token','ThreeShapeTokenV29'),identity=bind('testIdentityRegistry','MockRegistry'),liquidity=bind('liquidity','ThreeShapeLiquidityV29');
const pair=new Contract(d.contracts.pair,['function totalSupply() view returns(uint256)','function balanceOf(address) view returns(uint256)','function getReserves() view returns(uint112,uint112,uint32)','function token0() view returns(address)'],provider);
const treasuryBefore=BigInt(report.treasuryBefore??await provider.getBalance(d.treasury));report.treasuryBefore=String(treasuryBefore);
const U=10n**18n,gasPrice=(await provider.getFeeData()).gasPrice;
assert(gasPrice&&gasPrice<=3_000_000_000n);
const owned=[],batches=new Map(),stars=wallets.map(()=>[]);
async function check(name,fn){if(report.checks.some(x=>x.name===name&&x.status==='passed')){console.log('RESUME checkpoint',name);return;}await fn();report.checks.push({name,status:'passed'});save();console.log('PASS',name);}
async function send(name,fn,{failure=false}={}){
 await requireTestnet(provider);
 const tx=await fn({gasPrice});const row={name,hash:tx.hash,status:'pending'};report.transactions.push(row);save();
 console.log('TX',name,tx.hash);
 let r;try{r=await tx.wait(2,120000);}catch(e){if(e.receipt)r=e.receipt;else throw e;}
 assert.equal(r.status,failure?0:1);Object.assign(row,{status:failure?'expected_revert':'confirmed',blockNumber:r.blockNumber,gasUsed:String(r.gasUsed),feeWei:String(r.fee)});save();return r;
}
async function buy(i,q){
 const w=wallets[i],g=game.connect(w),cost=await g.quoteStars(q),first=await nft.nextId();
 const receipt=await send(`buy ${q} Stars player ${i}`,o=>g.buyStars(q,cost,{...o,value:cost,gasLimit:2_000_000}));
 const decoded=receipt.logs.map(l=>{try{return game.interface.parseLog(l)}catch{return null}}).filter(Boolean);
 assert(decoded.some(e=>e.name==='StarsPurchased'));assert(!decoded.some(e=>e.name==='LPAttemptFailed'));
 assert(receipt.logs.some(l=>{try{return liquidity.interface.parseLog(l)?.name==='Added'}catch{return false}}));
 for(let id=first;id<first+BigInt(q);id++){assert.equal(await nft.kind(id),9n);stars[i].push(id);}
}
async function moveStar(from,to,count){for(const id of stars[from].splice(0,count)){await send(`transfer NFT ${id} player ${from} to ${to}`,o=>nft.connect(wallets[from]).transferFrom(wallets[from].address,wallets[to].address,id,o));assert.equal(await nft.ownerOf(id),wallets[to].address);stars[to].push(id);}}
const denied=()=>[()=>game.claimFree.staticCall(),()=>game.burnForTier.staticCall([]),()=>game.continueChallenge.staticCall(),()=>game.claimReward.staticCall(0),()=>game.buyStars.staticCall(1,10n**16n,{value:10n**16n})];
async function revoke(value){await send(`set test identity ${value}`,o=>identity.setBalance(wallets[0].address,value,o));}
async function match(i,tier){
 const ordinary=batches.get(`${i}:${tier}`),ids=[...ordinary,...stars[i].splice(0,tier*3-ordinary.length)],g=game.connect(wallets[i]);
 assert.equal(ids.length,tier*3);assert.equal(await g.canBurn(wallets[i].address,ids),true);
 if(i===0){await revoke(0);assert.equal(await g.canBurn(wallets[i].address,ids),false);await assert.rejects(g.burnForTier.staticCall(ids),/no \.ai Agent ID/);await revoke(1);}
 const before=await game.totalClaims();await send(`match tier ${tier} player ${i}`,o=>g.burnForTier(ids,o));
 assert.equal(await game.state(wallets[i].address),BigInt(tier*2-1));assert.equal(await game.totalClaims(),before);
 for(const id of ids){await assert.rejects(nft.ownerOf(id));await assert.rejects(nft.tokenURI(id));assert.equal(await nft.kind(id),0n);}
}
async function claim(i,tier){const amount=await game.currentReward(tier),g=game.connect(wallets[i]);await assert.rejects(g.claimReward.staticCall(amount+1n),/reward changed/);const receipt=await send(`claim tier ${tier} player ${i}`,o=>g.claimReward(amount,o));const event=receipt.logs.map(l=>{try{return game.interface.parseLog(l)}catch{return null}}).find(e=>e?.name==='Claimed');assert.equal(event.args.tier,BigInt(tier));assert.equal(event.args.amount,amount);assert.equal(await token.balanceOf(wallets[i].address),amount);assert.equal(await game.state(wallets[i].address),6n);await assert.rejects(g.claimReward.staticCall(0),/no claim/);}
async function verifyFinal(){
 await check('authoritative global stage, shares, reward supply and reload',async()=>{
  assert.equal(await game.totalClaims(),3n);assert.equal(await game.remainingShares(),54997n);assert.equal(await game.currentStage(),1n);assert.equal(await token.playerMinted(),111_000_000n*U);
  const fresh=new Contract(game.target,artifact('ThreeShapeGameV29').abi,provider);assert.equal(await fresh.state(wallets[0].address),6n);
  const end=await provider.getBlockNumber(),logs=[];for(let from=d.deploymentBlock;from<=end;from+=500)logs.push(...await game.queryFilter(game.filters.Claimed(wallets[0].address),from,Math.min(from+499,end))); assert.equal(logs.length,1);assert.equal(logs[0].args.tier,3n);
  await assert.rejects(game.continueChallenge.staticCall(),/cannot continue/);
 });
}
if(finalOnly){
 try{await verifyFinal();report.status='passed';report.readRpc=READ_RPC;report.completedAt=new Date().toISOString();report.deployerBalance=formatEther(await provider.getBalance(wallets[0].address));save();console.log('REPORT',report.status,report.checks.length,'checks');}
 catch(e){report.status='failed';report.error=e.message;save();throw e;}finally{provider.destroy();}
 process.exit(0);
}
try{
 if(resume){assert.equal(await game.starsSold(),6n,'Resume checkpoint must have exactly six sales');assert.equal(await game.totalClaims(),0n);for(let id=1n;id<await nft.nextId();id++){const owner=await nft.ownerOf(id),i=wallets.findIndex(w=>w.address===owner),kind=Number(await nft.kind(id));assert(i>=0);if(kind===9)stars[i].push(id);else owned.push({id,kind,owner:i});}}
 await check('all five game writes reject missing identity',async()=>{for(const fn of denied())await assert.rejects(fn,/no \.ai Agent ID/);assert.equal(await game.totalClaims(),0n);assert.equal(await game.starsSold(),0n);});
 await check('on-chain revert preserves progress',async()=>{await send('expected missing-identity revert',o=>game.claimFree({...o,gasLimit:150000}),{failure:true});assert.equal(await game.freeClaimed(wallets[0].address),false);assert.equal(await game.state(wallets[0].address),0n);});
 for(let i=1;!resume&&i<wallets.length;i++)if(await provider.getBalance(wallets[i].address)<150_000_000_000_000n)await send(`test gas player ${i}`,o=>wallets[0].sendTransaction({...o,to:wallets[i].address,value:150_000_000_000_000n}));
 await check('free claim once per qualified wallet and all eight ordinary kinds',async()=>{
  const kinds=new Set();
  for(let i=0;i<wallets.length;i++){
   await send(`issue isolated test identity player ${i}`,o=>identity.setBalance(wallets[i].address,1,o));const first=await nft.nextId();
   await send(`free claim player ${i}`,o=>game.connect(wallets[i]).claimFree(o));
   for(let id=first;id<first+3n;id++){const kind=Number(await nft.kind(id));owned.push({id,kind,owner:i});kinds.add(kind);}
   assert.equal(await nft.balanceOf(wallets[i].address),3n);await assert.rejects(game.connect(wallets[i]).claimFree.staticCall(),/ineligible/);
  }assert.deepEqual([...kinds].sort(),[1,2,3,4,5,6,7,8]);
 });
 await check('real DEX bootstrap; 80/20 native BNB split; LP sent to burn address',async()=>{
  await buy(0,6);assert.equal(await liquidity.initialized(),true);assert.equal(await token.lpMinted(),85_800_000n*U);assert.equal(await provider.getBalance(d.treasury)-treasuryBefore,12n*10n**15n);assert.equal(await provider.getBalance(d.contracts.reserve),0n);
  assert(await pair.totalSupply()>0n);assert(await pair.balanceOf('0x000000000000000000000000000000000000dEaD')>0n);
 });
 await check('six-Star wallet limit; price and quote protections',async()=>{
  await assert.rejects(game.buyStars.staticCall(1,10n**16n,{value:10n**16n}),/wallet limit/);
  await assert.rejects(game.connect(wallets[1]).buyStars.staticCall(1,10n**16n-1n,{value:0}),/slippage/);
  for(const [sold,price]of [[0,10],[999,10],[1000,15],[10000,60],[99999,505]])assert.equal(await game.starPrice(sold),BigInt(price)*10n**15n);
  await assert.rejects(game.starPrice(100000));
 });
 await check('nine metadata names and Emoji originate from on-chain JSON',async()=>{
  const symbols=['🍏','🍋','🍇','🍒','🍓','🍐','🥭','🍉','🌟'],found=new Set();
  for(let id=1n;id<await nft.nextId();id++){const k=Number(await nft.kind(id)),uri=await nft.tokenURI(id);assert(uri.startsWith('data:application/json;base64,'));const meta=JSON.parse(Buffer.from(uri.split(',')[1],'base64').toString());assert.equal(meta.symbol,symbols[k-1]);assert.equal(meta.image,undefined);assert(meta.name.startsWith('Three Shape '));found.add(k);report.metadataCatalog??=[];if(!report.metadataCatalog.some(x=>x.kind===k))report.metadataCatalog.push({kind:k,tokenId:String(id),metadata:meta,uri});}
  assert.equal(found.size,9);
 });
 await check('subsequent native buy adds liquidity on the real V2 ratio',async()=>{
  await send('fund native purchase player 1',o=>wallets[0].sendTransaction({...o,to:wallets[1].address,value:10n**16n}));
  await buy(1,1);assert.equal(await game.starsSold(),7n);assert.equal(await token.lpMinted(),100_100_000n*U);assert.equal(await provider.getBalance(d.treasury)-treasuryBefore,14n*10n**15n);
  const r=await pair.getReserves(),token0=await pair.token0(),bnbReserve=token0.toLowerCase()===token.target.toLowerCase()?r[1]:r[0];assert.equal(bnbReserve,56n*10n**15n);
 });
 await check('NFT transfers, ownership checks, and prepared tier inventories',async()=>{
  const grouped=Array.from({length:8},(_,i)=>owned.filter(x=>x.kind===i+1));assert(grouped.every(g=>g.length===6));
  const assignments=[[0,1,0,2],[0,2,1,5],[0,3,2,6],[1,1,3,3],[2,1,4,3],[2,2,5,5]];
  for(const [player,tier,group,count]of assignments){const items=grouped[group].slice(0,count);batches.set(`${player}:${tier}`,items.map(x=>x.id));for(const item of items)if(item.owner!==player){await send(`transfer fruit ${item.id} to player ${player}`,o=>nft.connect(wallets[item.owner]).transferFrom(wallets[item.owner].address,wallets[player].address,item.id,o));assert.equal(await nft.ownerOf(item.id),wallets[player].address);}}
  await moveStar(0,2,1);await assert.rejects(nft.connect(wallets[4]).transferFrom.staticCall(wallets[0].address,wallets[4].address,stars[0][0]));
  assert.equal(stars[0].length,5);assert.equal(stars[2].length,1);assert.equal(await game.starsBought(wallets[0].address),6n);
 });
 await check('invalid all-Star, mixed fruit and duplicate burns are rejected',async()=>{
  assert.equal(await game.canBurn(wallets[0].address,stars[0].slice(0,3)),false);const first=batches.get('0:1')[0],other=batches.get('0:2')[0];
  assert.equal(await game.canBurn(wallets[0].address,[first,first,stars[0][0]]),false);assert.equal(await game.canBurn(wallets[0].address,[first,other,stars[0][0]]),false);
 });
 await check('first-tier claim pays one million exactly',async()=>{await match(1,1);await claim(1,1);});
 await check('second-tier continue and claim pays ten million exactly',async()=>{await match(2,1);await send('continue player 2 to tier 2',o=>game.connect(wallets[2]).continueChallenge(o));assert.equal(await token.balanceOf(wallets[2].address),0n);await match(2,2);await claim(2,2);});
 await check('three-tier progression; every burn/continue/claim rechecks identity',async()=>{
  for(let tier=1;tier<=3;tier++){
   await match(0,tier);await revoke(0);await assert.rejects(game.claimReward.staticCall(0),/no \.ai Agent ID/);if(tier<3)await assert.rejects(game.continueChallenge.staticCall(),/no \.ai Agent ID/);await revoke(1);
   if(tier<3){await send(`continue main to tier ${tier+1}`,o=>game.continueChallenge(o));assert.equal(await token.balanceOf(wallets[0].address),0n);}else await claim(0,3);
  }
 });
 await verifyFinal();
 report.status='passed';
}catch(e){report.status='failed';report.error=String(e.shortMessage??e.message);console.error(report.error);process.exitCode=1;}
finally{report.completedAt=new Date().toISOString();report.deployerBalance= formatEther(await provider.getBalance(wallets[0].address));report.totalTestGasWei=report.transactions.reduce((s,x)=>s+BigInt(x.feeWei??0),0n).toString();save();provider.destroy();console.log('REPORT',report.status,report.checks.length,'checks');}
