import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ganache from 'ganache';
import {BrowserProvider,Contract,ContractFactory,parseEther,toBeHex} from 'ethers';
import {mainnetReadOnlyProvider,READ_METHODS} from './lib/bsc-mainnet-readonly.mjs';
const registryAddress='0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F';
// Public registered identity from SPACE ID's documented alice lookup. Impersonation is LOCAL ONLY.
const holder='0xA506ac7069937571DC56C5f8FDa53c4A729456c6';
const upstream=mainnetReadOnlyProvider();
let engine,provider;
const report={mode:'local Ganache fork of BSC mainnet; real official registry state; impersonation only on local chain',publicTransactionsSent:0,registry:registryAddress,holder,sourceSha256:createHash('sha256').update(fs.readFileSync('contracts/ThreeShapeV29.sol')).digest('hex'),checks:[]};
const check=async(name,fn)=>{await fn();report.checks.push({name,status:'passed'});console.log('PASS',name);};
try{
 assert.equal((await upstream.getNetwork()).chainId,56n);
 const block=await upstream.getBlockNumber()-20;report.forkBlock=block;
 engine=ganache.provider({logging:{quiet:true},chain:{chainId:56,hardfork:'shanghai'},miner:{blockGasLimit:60000000},wallet:{totalAccounts:3,defaultBalance:1000,unlockedAccounts:[holder]},fork:{blockNumber:block,provider:{request:({method,params})=>{if(!READ_METHODS.has(method))throw Error('Refusing mainnet write');return upstream.send(method,params??[]);}}}});
 provider=new BrowserProvider(engine,'any',{cacheTimeout:-1});provider.pollingInterval=10;
 const signer=await provider.getSigner(),address=await signer.getAddress();
 const a=name=>JSON.parse(fs.readFileSync(`artifacts/${name}.json`));
 const deploy=async(name,args=[])=>{const data=a(name),c=await new ContractFactory(data.abi,data.bytecode,signer).deploy(...args,{gasLimit:20000000});await c.waitForDeployment();return c;};
 const registry=new Contract(registryAddress,['function ownerOf(uint256) view returns(address)','function name() view returns(string)','function symbol() view returns(string)','function balanceOf(address) view returns(uint256)','function handleOf(address) view returns(string)','function ownerOfHandle(string) view returns(address)','function transferFrom(address,address,uint256)'],provider);
 await check('official registry bytecode, collection, holder balance and bidirectional handle match',async()=>{
  assert.notEqual(await provider.getCode(registryAddress),'0x');assert.equal(await registry.name(),'SPACE ID Agent ID');assert.equal(await registry.symbol(),'AI');assert((await registry.balanceOf(holder))>0n);assert.equal(await registry.handleOf(holder),'alice');assert.equal((await registry.ownerOfHandle('alice')).toLowerCase(),holder.toLowerCase());assert.equal(await registry.balanceOf(address),0n);
 });
 const wbnb=await deploy('MockWBNB'),factory=await deploy('ThreeShapeDeploymentV29'),pair=await deploy('MockPair',[await factory.predicted(1),wbnb.target]),amm=await deploy('MockFactory',[pair.target]),router=await deploy('MockRouter',[amm.target,pair.target,wbnb.target]);
 const fake=await deploy('MockRegistry');
 await check('one-shot deployment rejects a fake registry atomically on chain 56',async()=>{
  await assert.rejects(factory.deploy.staticCall(fake.target,address,router.target,pair.target),/address mismatch/);assert.equal(await factory.deployed(),false);assert.equal(await provider.getCode(await factory.predicted(1)),'0x');
 });
 await(await factory.deploy(registryAddress,address,router.target,pair.target,{gasLimit:15000000})).wait();
 const game=new Contract(await factory.predicted(4),a('ThreeShapeGameV29').abi,signer),nft=new Contract(await factory.predicted(2),a('ThreeShapeNFTV29').abi,signer),token=new Contract(await factory.predicted(1),a('ThreeShapeTokenV29').abi,signer);
 report.localGame=game.target;
 await check('a wallet with no real Agent ID cannot perform any of the five game writes',async()=>{
  for(const run of [()=>game.claimFree.staticCall(),()=>game.buyStars.staticCall(1,parseEther('.01'),{value:parseEther('.01')}),()=>game.burnForTier.staticCall([]),()=>game.continueChallenge.staticCall(),()=>game.claimReward.staticCall(0)])await assert.rejects(run,/no \.ai Agent ID/);
  assert.equal(await game.totalClaims(),0n);assert.equal(await game.starsSold(),0n);
 });
 await provider.send('evm_setAccountBalance',[holder,toBeHex(parseEther('10'))]);const holderSigner=await provider.getSigner(holder),player=game.connect(holderSigner);
 await check('real ID holder can claim fruit, buy Star and complete the first match on the local fork',async()=>{
  await(await player.claimFree({gasLimit:2000000})).wait();const cost=await player.quoteStars(1);await(await player.buyStars(1,cost,{value:cost,gasLimit:6000000})).wait();
  assert.equal(await nft.kind(1),await nft.kind(2));assert.equal(await nft.kind(4),9n);await(await player.burnForTier([1,2,4],{gasLimit:2000000})).wait();assert.equal(await player.state(holder),1n);
 });
 const snapshot=await provider.send('evm_snapshot',[]);
 await check('real ID holder can claim the authoritative reward',async()=>{
  await(await player.claimReward(0,{gasLimit:2000000})).wait();assert.equal(await token.balanceOf(holder),parseEther('1000000'));assert.equal(await player.state(holder),6n);
 });
 await provider.send('evm_revert',[snapshot]);
 await check('real ID holder can choose continue instead of claiming',async()=>{
  await(await player.continueChallenge({gasLimit:1000000})).wait();assert.equal(await player.state(holder),2n);assert.equal(await token.balanceOf(holder),0n);
 });
 await check('official Agent ID cannot be transferred to qualify a second wallet',async()=>{
  const tokenId=BigInt('70564938991660933374592024341600875602376452319261984317470407481576058979585');
  assert.equal((await registry.ownerOf(tokenId)).toLowerCase(),holder.toLowerCase());await assert.rejects(registry.connect(holderSigner).transferFrom.staticCall(holder,address,tokenId));assert.equal(await registry.balanceOf(address),0n);
 });
 report.status='passed';
}catch(e){report.status='failed';report.error=e.shortMessage??e.message;process.exitCode=1;console.error(report.error);}
finally{fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/identity-mainnet-fork.json',JSON.stringify(report,null,2)+'\n');provider?.destroy();if(engine)await engine.disconnect();upstream.destroy();console.log('REPORT',report.status,report.checks.length,'checks; public transactions: 0');}
