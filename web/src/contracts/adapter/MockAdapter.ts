import {metadata,unit} from '../config/metadata';
import type {GameState,PlayPreview,StarQuote,ThreeShapeAdapter,TransactionResult,WalletSession} from '../types';
interface Account {eligible:boolean;free:boolean;tier:1|2|3;phase:'ready'|'choice'|'settled';nfts:{id:string;kind:number}[];balance:string;usdt:string;starsBought:number;result:string[]|null}
interface World {accounts:Record<string,Account>;claims:number;sold:number;next:number}
const initial=():World=>({accounts:{},claims:0,sold:0,next:1});
const account=():Account=>({eligible:true,free:false,tier:1,phase:'ready',nfts:[],balance:'0',usdt:String(1000n*unit),starsBought:0,result:null});
const choices=['0x0000000000000000000000000000000000000001','0x0000000000000000000000000000000000000002'];
const tops=[100,80,60,50,40,30,20,10,10,10];
export class MockAdapter implements ThreeShapeAdapter {
 readonly tokenDecimals=18;
 readonly usdtDecimals=18;
 address=choices[0];failure:'reject'|'receipt'|null=null;
 private claimOffset=0;private soldOffset=0;
 private listeners=new Set<(session:WalletSession)=>void>();private plan:PlayPreview|null=null;private pending=false;private connected=false;private serial=0;private memory=initial();
 constructor(private delay=650,private storage:Storage|undefined=globalThis.localStorage){}
 private read(){try{const raw=this.storage?.getItem('three-shape-preview-v4');if(raw)return JSON.parse(raw)as World;const old=this.storage?.getItem('three-shape-preview-v3');if(old){const w=JSON.parse(old)as World;w.claims=Object.values(w.accounts).filter(a=>a.phase==='settled').length;w.sold=Object.values(w.accounts).reduce((n,a)=>n+a.starsBought,0);this.save(w);return w;}}catch{}return structuredClone(this.memory);}
 private save(w:World){this.memory=structuredClone(w);try{this.storage?.setItem('three-shape-preview-v4',JSON.stringify(w));}catch{}}
 private player(w:World,address=this.address){return w.accounts[address.toLowerCase()]??=(account());}
 private emit(){this.plan=null;this.listeners.forEach(fn=>fn({address:this.connected?this.address:null,chainId:'mock'}));}
 private write(change:(w:World,a:Account)=>void){if(this.pending)throw new Error('模拟交易确认中，请稍后再调整场景');const w=this.read();change(w,this.player(w));this.save(w);this.emit();}
 connectWallet=async()=>{this.connected=true;return this.address;};
 disconnect=async()=>{this.connected=false;this.plan=null;this.listeners.forEach(fn=>fn({address:null,chainId:'mock'}));};
 subscribe=(fn:(session:WalletSession)=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 switchWallet(){if(this.pending)throw new Error('请先等待模拟交易结束');this.address=this.address===choices[0]?choices[1]:choices[0];this.emit();}
 setEligibility(eligible:boolean){this.write((_,a)=>{a.eligible=eligible;});}
 reset(){if(this.pending)throw new Error('请等待模拟交易结束');this.claimOffset=0;this.soldOffset=0;this.save(initial());this.emit();}
 setStage(stage:number){if(stage<1||stage>10)return;if(this.pending)throw new Error("请等待模拟交易结束");this.claimOffset=(stage-1)*stage*500-this.read().claims;this.emit();}
 setSold(sold:number){if(this.pending)throw new Error("请等待模拟交易结束");this.soldOffset=Math.max(0,Math.min(100000,Math.floor(sold)))-this.read().sold;this.emit();}
 topUp(){this.write((_,a)=>{a.usdt=String(BigInt(a.usdt)+1000n*unit);});}
 /** Explicit test fixture: supplies inventory. It is not a game reward or random result. */
 supplyNextTier(){this.write((w,a)=>{if(a.phase!=='ready'||!a.free)throw new Error('请先领取水果，再补齐测试 NFT');const fruitCount=[0,3,5,6][a.tier],starCount=[0,0,1,3][a.tier];while(a.nfts.filter(n=>n.kind===1).length<fruitCount)a.nfts.push({id:String(w.next++),kind:1});while(a.nfts.filter(n=>n.kind===9).length<starCount)a.nfts.push({id:String(w.next++),kind:9});});}
 private stage(claims:number){let max=0;for(let i=1;i<=10;i++){max+=i*1000;if(claims<max)return i;}return 10;}
 private amounts(w:World){const top=BigInt(tops[this.stage(w.claims+this.claimOffset)-1])*1_000_000n*unit;return [1_000_000n*unit,top/10n,top];}
 private ids(a:Account){if(a.phase!=='ready')return [];const count=a.tier*3,minStars=[0,0,1,3][a.tier],stars=a.nfts.filter(n=>n.kind===9);for(let kind=1;kind<=8;kind++){const fruit=a.nfts.filter(n=>n.kind===kind),fruits=Math.min(fruit.length,count-minStars),needed=count-fruits;if(fruits>0&&needed<=stars.length&&needed>=minStars)return [...fruit.slice(0,fruits),...stars.slice(0,needed)].map(n=>n.id);}return [];}
 getGameState=async(address:string):Promise<GameState>=>{const w=this.read(),a=this.player(w,address),ended=w.claims+this.claimOffset>=55000;return {tier:a.tier,phase:a.phase,freeClaimed:a.free,eligible:a.eligible,canPlay:a.eligible&&!ended&&a.phase==='ready',canMatch:this.ids(a).length>0,scenarioActive:this.claimOffset!==0||this.soldOffset!==0,canContinue:a.eligible&&!ended&&a.phase==='choice'&&a.tier<3,result:a.result,globalStage:this.stage(w.claims+this.claimOffset),remainingShares:Math.max(0,55000-w.claims-this.claimOffset),starsSold:w.sold+this.soldOffset,starsBought:a.starsBought,rewardTiers:ended?[0n,0n,0n]:this.amounts(w),message:!a.eligible?'当前模拟钱包没有 .ai ID，请在模拟工具中切换资格。':a.phase==='settled'?'本钱包已完成领奖，不能重复领取。':ended?'奖励份额已耗尽。':!a.free?'免费领取 3 枚水果，收集后开启挑战。':a.phase==='choice'?`第 ${a.tier} 档匹配已确认，选择领取或继续。`:this.ids(a).length?'已满足当前档条件，点击开始挑战查看销毁清单；确认后才执行。':'尚未凑齐：普通水果需同种，至少 1 枚；可用 Star 补齐，或生成交换／收购帖。'};};
 getCollection=async(address:string)=>{const w=this.read(),a=this.player(w,address);return metadata.map(m=>{const ids=a.nfts.filter(n=>n.kind===m.kind).map(n=>n.id);return {type:m.kind,name:m.name,emoji:m.symbol,quantity:BigInt(ids.length),tokenIds:ids,metadata:{name:m.name,symbol:m.symbol,attributes:[{trait_type:'kind',value:m.kind}]}};});};
 getRewardState=async(address:string)=>{const w=this.read(),a=this.player(w,address);return {eligible:a.eligible&&w.claims+this.claimOffset<55000&&a.phase==='choice',claimed:a.phase==='settled',amount:a.phase==='choice'?this.amounts(w)[a.tier-1]:0n};};
 getTokenBalance=async(address:string)=>{const w=this.read();return BigInt(this.player(w,address).balance);};
 getUSDTBalance=async(address:string)=>{const w=this.read();return BigInt(this.player(w,address).usdt);};
 preparePlay=async(address:string):Promise<PlayPreview>=>{if(address.toLowerCase()!==this.address.toLowerCase())throw new Error('模拟钱包已切换');const w=this.read(),a=this.player(w,address);if(!a.eligible)throw new Error('需要持有 .ai ID');if(w.claims+this.claimOffset>=55000)throw new Error('奖励份额已耗尽');const ids=a.free?this.ids(a):[];if(a.free&&!ids.length)throw new Error('尚未凑齐：至少 1 枚同种普通水果，其余可用 Star 补齐；也可生成交换帖或收购帖。');const plan:PlayPreview={kind:a.free?'burn':'free',tokenIds:ids,address,warning:a.free?'销毁不可撤销；当前查询和销毁都不预留奖励份额。领奖前份额可能被其他钱包用完。':'仅为模拟免费领取，无真实资产或钱包签名。'};this.plan=plan;return plan;};
 resolveRecipient=async(name:string)=>{const aliases:Record<string,string>={'alice.ai':choices[0],'bob.ai':choices[1]};const result=aliases[name.trim().toLowerCase()];if(!result)throw new Error('模拟解析仅支持 alice.ai / bob.ai，不代表真实 .ai 地址解析');return result;};
 transferNFT=async(tokenId:string,recipient:string)=>{if(!choices.includes(recipient))throw new Error('模拟接收地址无效');const sender=this.address;return this.tx((w,a)=>{if(sender===recipient)throw new Error('不能发送给自己');const item=a.nfts.find(n=>n.id===tokenId);if(!item)throw new Error('此钱包已不持有该 NFT');a.nfts=a.nfts.filter(n=>n.id!==tokenId);this.player(w,recipient).nfts.push(item);});};
 private async tx(change:(w:World,a:Account)=>void):Promise<TransactionResult>{
  if(this.pending)throw new Error('已有模拟交易正在等待确认');const address=this.address,failure=this.failure;this.failure=null;this.pending=true;
  try{await new Promise(resolve=>setTimeout(resolve,this.delay/2));if(failure==='reject'){const e=new Error('模拟：用户拒绝签名');Object.assign(e,{code:4001});throw e;}}
  catch(e){this.pending=false;throw e;}
  let settled:Promise<{success:boolean;message?:string}>|null=null;
  return {hash:`mock:transaction-${++this.serial}`,wait:()=>settled??=(async()=>{try{await new Promise(resolve=>setTimeout(resolve,this.delay));if(failure==='receipt')return {success:false,message:'模拟：交易执行失败，进度没有改变'};const w=this.read(),a=this.player(w,address);if(!a.eligible)throw new Error('模拟：该钱包不持有 .ai ID');change(w,a);this.save(w);return {success:true};}finally{this.pending=false;}})()};
 }
 play=async()=>{const plan=this.plan;this.plan=null;if(!plan||plan.address!==this.address)throw new Error('请先确认本次操作');return this.tx((w,a)=>{if(w.claims+this.claimOffset>=55000)throw new Error('奖励份额已耗尽');if(plan.kind==='free'){if(a.free)throw new Error('已领取过免费水果');a.free=true;const fixture=[1,1,2];fixture.forEach(kind=>a.nfts.push({id:String(w.next++),kind}));a.result=fixture.map(k=>metadata[k-1].symbol);return;}const actual=this.ids(a);if(a.phase!=='ready'||!plan.tokenIds.length||actual.join(',')!==plan.tokenIds.join(','))throw new Error('NFT 条件已变化');a.result=plan.tokenIds.slice(0,3).map(id=>metadata[a.nfts.find(n=>n.id===id)!.kind-1].symbol);a.nfts=a.nfts.filter(n=>!plan.tokenIds.includes(n.id));a.phase='choice';});};
 claimReward=async()=>this.tx((w,a)=>{if(a.phase!=='choice'||w.claims+this.claimOffset>=55000)throw new Error('当前无法领取');a.balance=String(BigInt(a.balance)+this.amounts(w)[a.tier-1]);w.claims++;a.phase='settled';});
 continueChallenge=async()=>this.tx((w,a)=>{if(a.phase!=='choice'||a.tier>=3||w.claims+this.claimOffset>=55000)throw new Error('当前不能继续');a.tier=(a.tier+1)as 2|3;a.phase='ready';a.result=null;});
 quoteStars=async(address:string,quantity:number)=>{const w=this.read(),a=this.player(w,address);if(!a.eligible)throw new Error('需要持有 .ai ID');if(!Number.isInteger(quantity)||quantity<1||a.starsBought+quantity>6||w.sold+this.soldOffset+quantity>100000)throw new Error('超出每钱包累计 6 枚或总销售上限');let payment=0n;for(let i=0;i<quantity;i++)payment+=BigInt(10+2*Math.floor((w.sold+this.soldOffset+i)/1000))*unit;return {quantity,payment,address};};
 buyStars=async(quote:StarQuote)=>{if(quote.address!==this.address)throw new Error('钱包已切换');return this.tx((w,a)=>{if(a.starsBought+quote.quantity>6||w.sold+this.soldOffset+quote.quantity>100000)throw new Error('超出销售数量限制');let cost=0n;for(let i=0;i<quote.quantity;i++)cost+=BigInt(10+2*Math.floor((w.sold+this.soldOffset+i)/1000))*unit;if(cost>quote.payment)throw new Error('报价已变化');if(BigInt(a.usdt)<cost)throw new Error('模拟 USDT 不足，可在工具中补充');a.usdt=String(BigInt(a.usdt)-cost);a.starsBought+=quote.quantity;w.sold+=quote.quantity;for(let i=0;i<quote.quantity;i++)a.nfts.push({id:String(w.next++),kind:9});});};
}
