import {Contract,Interface,getAddress,zeroPadValue,ZeroHash} from 'ethers';
import type {AbstractProvider,Signer,InterfaceAbi,TransactionResponse,TransactionReceipt as EthersReceipt} from 'ethers';
import type {ThreeShapeAdapter,GameState,NFTCollection,RewardState,PlayPreview,StarQuote,TransactionResult,TransactionReceipt} from '../types/index.ts';

export interface NativeDeployment {
 chainId:number; deploymentBlock:number; rpc:string;
 contracts:{game:string;nft:string;token:string;liquidity:string;reserve?:string;testIdentityRegistry?:string};
 abi:{game:InterfaceAbi;nft:InterfaceAbi;token:InterfaceAbi;liquidity:InterfaceAbi;registry:InterfaceAbi;reserve?:InterfaceAbi};
 catalog:{kind:number;metadata:Record<string,unknown>}[];
}
type Snapshot={game:GameState;collection:NFTCollection;reward:RewardState;balance:bigint;blockNumber:number};
type Plan=PlayPreview&{state:number;emoji:string[]};
const same=(a:string,b:string)=>a.toLowerCase()===b.toLowerCase();
const decodeJSON=(uri:string)=>{
 if(!uri.startsWith('data:application/json;base64,'))throw new Error('Unsupported on-chain metadata');
 const bytes=Uint8Array.from(atob(uri.slice(uri.indexOf(',')+1)),x=>x.charCodeAt(0));
 const json=JSON.parse(new TextDecoder().decode(bytes));
 if(typeof json.name!=='string'||typeof json.symbol!=='string')throw new Error('Invalid on-chain JSON metadata');
 return json as Record<string,unknown>;
};
/** Native-BNB binding for the compiled V2.9 ABI. Signing always belongs to the
 * caller's wallet. This class never accepts/stores a private key or signs itself. */
export class EthersThreeShapeAdapter implements ThreeShapeAdapter {
 readonly readiness='ready' as const;
 readonly tokenDecimals=18;
 readonly paymentDecimals=18;
 readonly pendingScope:string;
 readonly config:NativeDeployment;
 readonly provider:AbstractProvider;
 private signer:()=>Promise<Signer>;
 private game:Contract;private nft:Contract;private token:Contract;private lp:Interface;
 private plans=new Map<string,Plan>();
 private inflight=new Map<string,Promise<Snapshot>>();
 private received=new Map<string,{through:number;ids:Set<string>;mints:Map<string,Set<string>>}>();
 private results=new Map<string,string[]>();
 private activeAddress:string|null=null;
 resolveRecipient?:ThreeShapeAdapter['resolveRecipient'];
 getReserveState?:ThreeShapeAdapter['getReserveState'];
 settleReserve?:ThreeShapeAdapter['settleReserve'];
 constructor(config:NativeDeployment,provider:AbstractProvider,getSigner:()=>Promise<Signer>,resolver?:ThreeShapeAdapter['resolveRecipient']){
  if(!Number.isInteger(config.chainId)||config.deploymentBlock<1)throw new Error('Missing deployed network configuration');
  this.config=config;this.provider=provider;this.signer=getSigner;this.resolveRecipient=resolver;
  this.pendingScope=`${config.chainId}:${config.contracts.game.toLowerCase()}`;
  this.game=new Contract(config.contracts.game,config.abi.game,provider);this.nft=new Contract(config.contracts.nft,config.abi.nft,provider);this.token=new Contract(config.contracts.token,config.abi.token,provider);this.lp=new Interface(config.abi.liquidity);
  if(config.catalog.length!==9||new Set(config.catalog.map(x=>x.kind)).size!==9)throw new Error('Nine chain-metadata catalog types are required');
  if(config.contracts.reserve&&config.abi.reserve){
   const reserve=new Contract(config.contracts.reserve,config.abi.reserve,provider);
   this.getReserveState=async()=>{
    await this.chain();const blockNumber=await provider.getBlockNumber();
    const [closed,balance,treasury]=await Promise.all([this.game.starSalesClosed({blockTag:blockNumber}),provider.getBalance(reserve.target as string,blockNumber),reserve.treasury({blockTag:blockNumber})]);
    return {address:reserve.target as string,treasury,balance,starSalesClosed:Boolean(closed),canSettle:Boolean(closed)&&balance>0n,blockNumber};
   };
   this.settleReserve=async()=>{
    const expected=this.activeAddress;let signer:Signer;
    try{if(!expected)throw new Error('Connect the current wallet before submitting');signer=await this.wallet();if(!same(await signer.getAddress(),expected))throw new Error('Wallet changed; prepare again');await reserve.connect(signer).getFunction('settleToTreasury').staticCall();}
    catch(e){throw Object.assign(new Error((e as Error).message),{broadcast:false});}
    return this.wrap(await reserve.connect(signer).getFunction('settleToTreasury')());
   };
  }
 }
 private async chain(){if((await this.provider.getNetwork()).chainId!==BigInt(this.config.chainId))throw new Error('Wrong chain; connect to the configured network');}
 private async wallet(){await this.chain();const signer=await this.signer();if(!signer.provider||(await signer.provider.getNetwork()).chainId!==BigInt(this.config.chainId))throw new Error('Wallet network changed');return signer;}
 synchronizeWalletSession(address:string|null){this.activeAddress=address?getAddress(address):null;this.plans.clear();}
 connectWallet=async()=>{const address=getAddress(await(await this.wallet()).getAddress());this.synchronizeWalletSession(address);return address;};
 disconnect=async()=>{this.synchronizeWalletSession(null);};
 /** Address/topic-filtered windows stay below PublicNode's 10k block limit. */
 private async logs(address:string,topics:(string|null)[],from:number,to:number){
  const logs=[];for(let start=from;start<=to;start+=9000)logs.push(...await this.provider.getLogs({address,topics,fromBlock:start,toBlock:Math.min(start+8999,to)}));return logs;
 }
 private async index(address:string,block:number){
  const key=address.toLowerCase(),previous=this.received.get(key),ids=new Set(previous?.ids??[]),mints=new Map(previous?.mints??[]);
  const transfer=this.nft.interface.getEvent('Transfer')!;
  const incoming=await this.logs(this.nft.target as string,[transfer.topicHash,null,zeroPadValue(address,32)],previous?Math.max(this.config.deploymentBlock,previous.through-64):this.config.deploymentBlock,block);
  for(const log of incoming){
   const tokenId=BigInt(log.topics[3]).toString();
   ids.add(tokenId);
   if(log.topics[1]===ZeroHash){
    const batch=mints.get(log.transactionHash)??new Set<string>();
    batch.add(tokenId);
    mints.set(log.transactionHash,batch);
   }
  }
  this.received.set(key,{through:block,ids,mints});return ids;
 }
 private async collection(address:string,block:number):Promise<NFTCollection>{
  const ids=await this.index(address,block);
  const items:NFTCollection=this.config.catalog.map(({kind,metadata})=>({type:kind,name:String(metadata.name),emoji:String(metadata.symbol),quantity:0n,tokenIds:[],metadata,contractAddress:this.nft.target as string}));
  await Promise.all([...ids].map(async id=>{
   let owner:string;try{owner=await this.nft.ownerOf(id,{blockTag:block});}catch(e){if((e as {code?:string}).code==='CALL_EXCEPTION')return;throw e;}
   if(!same(owner,address))return;
   const [rawKind,uri]=await Promise.all([this.nft.kind(id,{blockTag:block}),this.nft.tokenURI(id,{blockTag:block})]);
   const kind=Number(rawKind),item=items.find(x=>x.type===kind);if(!item)throw new Error('Unknown NFT kind');
   const metadata=decodeJSON(uri);item.name=String(metadata.name);item.emoji=String(metadata.symbol);item.metadata=metadata;item.quantity++;item.tokenIds.push(id);
  }));
  for(const item of items)item.tokenIds.sort((a,b)=>BigInt(a)<BigInt(b)?-1:1);
  return items;
 }
 private async freeClaimResult(address:string,collection:NFTCollection){
  const key=address.toLowerCase();
  const cached=this.results.get(key);
  if(cached)return cached;
  const claimSelector=this.game.interface.getFunction('claimFree')!.selector;
  for(const [hash,ids] of this.received.get(key)?.mints??[]){
   if(ids.size!==3)continue;
   const tx=await this.provider.getTransaction(hash);
   if(!tx?.to||!same(tx.to,this.config.contracts.game)||!same(tx.from,address)||tx.data!==claimSelector)continue;
   const symbols=[...ids].map(id=>collection.find(item=>item.tokenIds.includes(id))?.emoji??'—');
   if(symbols.every(symbol=>symbol!=='—'))this.results.set(key,symbols);
   return symbols;
  }
  return null;
 }
 private select(collection:NFTCollection,tier:number){
  const stars=collection.find(x=>x.type===9)?.tokenIds??[],required=tier*3,minStars=tier===1?0:tier===2?1:3;
  for(const fruit of collection.filter(x=>x.type!==9&&x.quantity>0n)){
   const fruitCount=Math.min(fruit.tokenIds.length,required-minStars),starCount=required-fruitCount;
   if(fruitCount>=1&&starCount<=stars.length)return [...fruit.tokenIds.slice(0,fruitCount),...stars.slice(0,starCount)];
  }return [];
 }
 private async snapshot(address:string):Promise<Snapshot>{
  address=getAddress(address);const key=address.toLowerCase();let promise=this.inflight.get(key);
  if(!promise){promise=this.readSnapshot(address).finally(()=>this.inflight.delete(key));this.inflight.set(key,promise);}return promise;
 }
 private async readSnapshot(address:string):Promise<Snapshot>{
  await this.chain();
  // Index history before selecting the state-read block. A long initial scan
  // must not age the block beyond a public node's state-retention window.
  await this.index(address,await this.provider.getBlockNumber());
  const block=await this.provider.getBlockNumber(),at={blockTag:block};
  const registryAddress=await this.game.registry(at),registry=new Contract(registryAddress,this.config.abi.registry,this.provider);
  const [raw,free,ended,remaining,stage,sold,bought,identity,balance,collection]=await Promise.all([this.game.state(address,at),this.game.freeClaimed(address,at),this.game.ended(at),this.game.remainingShares(at),this.game.currentStage(at),this.game.starsSold(at),this.game.starsBought(address,at),registry.balanceOf(address,at),this.token.balanceOf(address,at),this.collection(address,block)]);
  const state=Number(raw);if(state<0||state>6)throw new Error('Unknown contract game state');
  let tier:number=state<6?Math.floor(state/2)+1:0,claimedAmount=0n;
  if(state===6){const event=this.game.interface.getEvent('Claimed')!,logs=await this.logs(this.game.target as string,[event.topicHash,zeroPadValue(address,32)],this.config.deploymentBlock,block);const claim=logs.at(-1);if(!claim)throw new Error('Settled tier requires confirmed Claimed event');const args=this.game.interface.parseLog(claim)!.args;tier=Number(args.tier);claimedAmount=BigInt(args.amount);}
  if(tier!==1&&tier!==2&&tier!==3)throw new Error('Invalid claimed tier');
  const phase=state===6?'settled':state%2?'choice':'ready',eligible=identity>0n,ids=this.select(collection,tier);
  const canMatch=eligible&&!ended&&phase==='ready'&&ids.length>0&&Boolean(await this.game.canBurn(address,ids,at));
  const rewardTiers=await Promise.all([1,2,3].map(t=>this.game.reward(t,stage,at).then((x:bigint)=>BigInt(x))));
  const reward={eligible:eligible&&!ended&&phase==='choice',claimed:phase==='settled',amount:phase==='settled'?claimedAmount:rewardTiers[tier-1]};
  const message=!eligible?'此钱包未持有 .ai ID':phase==='settled'?'本钱包已完成领奖，不能重复领取。':ended?'奖励份额已耗尽。':phase==='choice'?`第 ${tier} 档匹配已确认，选择领取或继续。`:!free?'免费领取 3 枚水果，收集后开启挑战。':canMatch?'已满足当前档条件，点击开始挑战查看销毁清单；确认后才执行。':'尚未凑齐：普通水果需同种，至少 1 枚；可用 Star 补齐，或生成交换／收购帖。';
  const result=free?await this.freeClaimResult(address,collection).catch(()=>null):null;
  return {blockNumber:block,collection,reward,balance:BigInt(balance),game:{tier,phase,freeClaimed:Boolean(free),eligible,canPlay:eligible&&!ended&&phase==='ready',canMatch,canContinue:eligible&&!ended&&phase==='choice'&&tier<3,result,globalStage:Number(stage),remainingShares:Number(remaining),starsSold:Number(sold),starsBought:Number(bought),rewardTiers,message}};
 }
 getGameState=async(a:string)=>(await this.snapshot(a)).game;
 getCollection=async(a:string)=>(await this.snapshot(a)).collection;
 getRewardState=async(a:string)=>(await this.snapshot(a)).reward;
 getTokenBalance=async(a:string)=>(await this.snapshot(a)).balance;
 preparePlay=async(address:string):Promise<PlayPreview>=>{
  const snapshot=await this.snapshot(address),g=snapshot.game;if(!g.canPlay)throw new Error(g.message);
  const ids=g.freeClaimed?this.select(snapshot.collection,g.tier):[];if(g.freeClaimed&&!g.canMatch)throw new Error(g.message);
  const emoji=ids.map(id=>snapshot.collection.find(x=>x.tokenIds.includes(id))!.emoji);
  const plan:Plan={address:getAddress(address),kind:g.freeClaimed?'burn':'free',tokenIds:ids,emoji,state:(g.tier-1)*2,warning:g.freeClaimed?'销毁不可撤销；当前查询和销毁都不预留奖励份额。领奖前份额可能被其他钱包用完。':'免费领取 3 枚水果，收集后开启挑战。'};
  this.plans.set(address.toLowerCase(),plan);return plan;
 };
 private receipt(receipt:EthersReceipt):TransactionReceipt{
  if(receipt.status!==1)return {success:false,message:'Transaction reverted; reward progress is unchanged'};
  let purchase=false,liquidity:TransactionReceipt['liquidity'];
  for(const log of receipt.logs){
   if(same(log.address,this.game.target as string)){const event=this.game.interface.parseLog(log);if(event?.name==='StarsPurchased')purchase=true;if(event?.name==='LPAttemptFailed')liquidity='failed';}
   if(same(log.address,this.config.contracts.liquidity)&&this.lp.parseLog(log)?.name==='Added')liquidity='added';
  }
  return {success:true,...(purchase?{liquidity:liquidity??'unknown'}:{})};
 }
 private wrap(tx:TransactionResponse,onConfirmed?:(r:EthersReceipt)=>Promise<void>):TransactionResult{
  return {hash:tx.hash,wait:async confirmations=>{
   let receipt:EthersReceipt|null;
   try{receipt=await tx.wait(Math.max(2,confirmations),120000);}catch(e){
    const error=e as {receipt?:EthersReceipt;code?:string;cancelled?:boolean;replacement?:TransactionResponse};
    if(error.code==='TRANSACTION_REPLACED'){
     if(error.cancelled||!error.replacement||!same(error.replacement.to??'',tx.to??'')||error.replacement.data!==tx.data||error.replacement.value!==tx.value)return {success:false,message:'Transaction replaced or cancelled'};
    }
    if(!error.receipt)throw e;receipt=error.receipt;
   }
   if(!receipt)throw new Error('Transaction result is unresolved');const result=this.receipt(receipt);
   if(result.success&&onConfirmed)await onConfirmed(receipt);return result;
  }};
 }
 private async send(method:string,args:unknown[],value=0n,expectedAddress?:string,onConfirmed?:(r:EthersReceipt)=>Promise<void>){
  let signer:Signer,address:string,contract:Contract;
  const expected=expectedAddress??this.activeAddress;
  // buyStars catches a failed LP subcall. An estimator can therefore find a
  // "successful" gas limit that is only sufficient to sell the NFT. Use the
  // tested LP-inclusive limit, charged by actual gas used, for this method.
  const overrides=method==='buyStars'?{value,gasLimit:2_000_000n}:{value};
  try{if(!expected)throw new Error('Connect the current wallet before submitting');signer=await this.wallet();address=getAddress(await signer.getAddress());if(!same(address,expected))throw new Error('Wallet changed; prepare again');contract=this.game.connect(signer) as Contract;await contract[method].staticCall(...args,overrides);}
  catch(e){throw Object.assign(new Error((e as Error).message),{broadcast:false});}
  const tx=await contract[method](...args,overrides);return this.wrap(tx,onConfirmed);
 }
 play=async()=>{
  let address:string,plan:Plan|undefined;
  try{address=getAddress(await(await this.wallet()).getAddress());plan=this.plans.get(address.toLowerCase());if(!plan)throw new Error('Wallet changed or no confirmed preparation');if(Number(await this.game.state(address))!==plan.state)throw new Error('Game state changed; prepare again');}
  catch(e){throw Object.assign(new Error((e as Error).message),{broadcast:false});}
  const confirmed=async(receipt:EthersReceipt)=>{
   if(plan!.kind==='burn'){
    const burned=receipt.logs.filter(l=>same(l.address,this.nft.target as string)).map(l=>this.nft.interface.parseLog(l)).filter(e=>e?.name==='Transfer'&&same(e.args.from,address)&&same(e.args.to,'0x0000000000000000000000000000000000000000')).map(e=>String(e!.args.tokenId));
    if(plan!.tokenIds.every(id=>burned.includes(id)))this.results.set(address.toLowerCase(),plan!.emoji);
   }else{
    const minted=receipt.logs.filter(l=>same(l.address,this.nft.target as string)).map(l=>this.nft.interface.parseLog(l)).filter(e=>e?.name==='Transfer'&&same(e.args.to,address));
    // Confirmed mint metadata is read from the chain; animations never set results.
    const emoji=await Promise.all(minted.map(async e=>String(decodeJSON(await this.nft.tokenURI(e!.args.tokenId)).symbol)));this.results.set(address.toLowerCase(),emoji);
   }this.plans.delete(address.toLowerCase());
  };
  return this.send(plan.kind==='free'?'claimFree':'burnForTier',plan.kind==='free'?[]:[plan.tokenIds],0n,address,confirmed);
 };
 claimReward=async(minAmount?:bigint)=>{if(minAmount===undefined||minAmount<=0n)throw Object.assign(new Error('A user-approved minimum reward is required'),{broadcast:false});return this.send('claimReward',[minAmount]);};
 continueChallenge=async()=>this.send('continueChallenge',[]);
 quoteStars=async(address:string,quantity:number):Promise<StarQuote>=>{
  const s=await this.snapshot(address);if(!s.game.eligible||!Number.isInteger(quantity)||quantity<1||quantity>6||s.game.starsBought+quantity>6||s.game.starsSold+quantity>100000||(s.reward.claimed&&s.game.tier===3))throw new Error('Star purchase is unavailable');
  return {address:getAddress(address),quantity,payment:BigInt(await this.game.quoteStars(quantity))};
 };
 buyStars=async(quote:StarQuote)=>this.send('buyStars',[quote.quantity,quote.payment],quote.payment,quote.address);
 transferNFT=async(tokenId:string,recipient:string)=>{
  let signer:Signer,from:string;
  const expected=this.activeAddress;
  try{if(!expected)throw new Error('Connect the current wallet before submitting');signer=await this.wallet();from=await signer.getAddress();if(!same(from,expected))throw new Error('Wallet changed; prepare again');if(!same(await this.nft.ownerOf(tokenId),from))throw new Error('NFT ownership changed');await this.nft.connect(signer).getFunction('safeTransferFrom(address,address,uint256)').staticCall(from,getAddress(recipient),tokenId);}
  catch(e){throw Object.assign(new Error((e as Error).message),{broadcast:false});}
  return this.wrap(await this.nft.connect(signer).getFunction('safeTransferFrom(address,address,uint256)')(from,getAddress(recipient),tokenId));
 };
 recoverPending=async(address:string,hash?:string):Promise<TransactionResult|null>=>{
  await this.chain();if(!hash)return null;const tx=await this.provider.getTransaction(hash);if(!tx)return null;
  if(!same(tx.from,address)||![this.game.target as string,this.nft.target as string,...(this.config.contracts.reserve&&this.config.abi.reserve?[this.config.contracts.reserve]:[])].some(to=>same(to,tx.to??'')))throw new Error('Pending transaction does not belong to this deployment and wallet');return this.wrap(tx);
 };
}
