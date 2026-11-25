import {execFile} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {isAbsolute,join} from 'node:path';
import {promisify} from 'node:util';
import {Contract,JsonRpcProvider,getAddress,id as selector} from 'ethers';

const run=promisify(execFile);
const origin=new URL(process.env.THREE_SHAPE_ORIGIN??'https://3shape.cc').origin;
const baw=process.env.THREE_SHAPE_BAW;
if(!baw||!isAbsolute(baw))throw new Error('Set THREE_SHAPE_BAW to the absolute path of the official baw CLI');
const route='/api/agentic-wallet/pairing';
const cookie='__Host-three-shape-pairing';
const sessions=new Map();
const ttl=360_000;
const gameAddress='0xDd127f91943C8a406A1e6577a9313526D950b99E';
const claimData=selector('claimFree()').slice(0,10);
const rpc=new JsonRpcProvider(process.env.THREE_SHAPE_BSC_RPC??'https://bsc-dataseed.bnbchain.org',56,{batchMaxCount:1});
const game=new Contract(gameAddress,[
 'function freeClaimed(address) view returns(bool)','function starsBought(address) view returns(uint8)',
 'function quoteStars(uint256) view returns(uint256)','function buyStars(uint256,uint256) payable',
],rpc);
const operations=new Set(['claim','star']);

async function closeSession(session){
 if(!session.directory)return;
 const directory=session.directory;
 session.directory=null;
 await cli(directory,['auth','signout']).catch(()=>{});
 await rm(directory,{recursive:true,force:true}).catch(()=>{});
}

async function cli(directory, args, timeout=20_000){
 // Disable the shared OS keyring. Each child uses a private, per-session directory.
 const {PATH,HTTPS_PROXY,HTTP_PROXY,NO_PROXY,NODE_USE_ENV_PROXY}=process.env;
 const {stdout}=await run(baw,[...args,'--json'],{timeout,maxBuffer:64*1024,env:{
  PATH,HTTPS_PROXY,HTTP_PROXY,NO_PROXY,NODE_USE_ENV_PROXY,HOME:directory,
  BINANCE_BAW_DIR:directory,DBUS_SESSION_BUS_ADDRESS:'unix:path=/dev/null',
 }});
 const response=JSON.parse(stdout);
 if(response.success!==true)throw new Error('Wallet authorization failed');
 return response.data;
}

const result=(res,status,body,headers={})=>{
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});
 res.end(JSON.stringify(body));
};

async function verify(session,directory,qrCodeId){
 try{
  await cli(directory,['auth','verify','--qrCodeId',qrCodeId],310_000);
  if((await cli(directory,['wallet','status'])).status!=='CONNECTED')throw new Error('Wallet not connected');
  const {addresses}=await cli(directory,['wallet','address']);
  session.address=getAddress(addresses.find(a=>String(a.binanceChainId)==='56').address);
  if(session.expired)throw new Error('Expired wallet session');
  session.status='authorized';
 }catch{
  session.status='failed';
 }finally{
  if(session.status!=='authorized')await closeSession(session);
 }
}

async function transaction(session,operation,action,query,req,res){
 if(session?.status!=='authorized'||!session.directory||session.expired)return result(res,401,{status:'expired'});
 if(action==='status'){
  try{
   if(operation==='claim'&&await game.freeClaimed(session.address)){
    if(session.claim?.operation==='claim')session.claim=null;
    return result(res,200,{status:'claimed'});
   }
   if(operation==='star'&&session.claim?.operation==='star'&&
      Number(await game.starsBought(session.address))>=session.claim.before+session.claim.quantity){
    session.claim=null;
    return result(res,200,{status:'star-purchased'});
   }
   if(session.claim?.operation!==operation)return result(res,200,{status:'ready'});
   if(session.claim?.hash&&(await rpc.getTransactionReceipt(session.claim.hash))?.status===0){
    session.claim=null;
    return result(res,200,{status:'failed'});
   }
   return result(res,200,{status:session.claim?.status??'ready',hash:session.claim?.hash});
  }catch{return result(res,502,{status:'unavailable'});}
 }
 if(session.claimBusy||session.claim)return result(res,409,{status:'busy'});
 session.claimBusy=true;
 try{
  if(action==='preview'){
   session.preview=null;
   const {devMode}=await cli(session.directory,['wallet','settings']);
   if(!devMode?.enabled||Number(devMode.expiresAt)<=Date.now())return result(res,409,{status:'developer-mode'});
   let data=claimData,value=0n,before=0,quantity=0;
   if(operation==='claim'){
    if(await game.freeClaimed(session.address))return result(res,200,{status:'claimed'});
   }else{
    const requested=query.get('quantity'), quoted=query.get('payment');
    if(!/^[1-6]$/.test(requested??'')||!/^\d{1,20}$/.test(quoted??''))return result(res,400,{status:'invalid-quantity'});
    quantity=Number(requested);
    before=Number(await game.starsBought(session.address));
    if(before+quantity>6)return result(res,409,{status:'wallet-limit'});
    value=await game.quoteStars(quantity);
    if(value!==BigInt(quoted))return result(res,409,{status:'quote-changed'});
    data=game.interface.encodeFunctionData('buyStars',[quantity,value]);
   }
   const preview=await cli(session.directory,['contract-call','preview','--binanceChainId','56','--from',session.address,'--to',gameAddress,'--value',value.toString(),'--inputData',data]);
   const expiresAt=Math.min(Number(preview.expiresAt),session.expiresAt);
   if(typeof preview.requestId!=='string'||!preview.requestId||!Number.isFinite(expiresAt)||expiresAt<=Date.now()||
      (preview.simulationResult?.authorityChanges?.length??0)>0){
    return result(res,409,{status:'preview-rejected'});
   }
   const token=randomBytes(24).toString('hex');
   session.preview={token,requestId:preview.requestId,expiresAt,operation,quantity,before,value};
   const risks=[...(preview.risks?.riskDetails??[]),...Object.values(preview.risks?.addresses??{}).flatMap(a=>a.riskDetails??[])];
   return result(res,200,{status:'preview',token,from:session.address,to:gameAddress,quantity,value:value.toString(),
    risks:risks.map(({title,description})=>({title,description})), appConfirmation:preview.requireConfirmation===true});
  }
  const preview=session.preview;
  if(!preview||preview.operation!==operation||preview.token!==req.headers['x-claim-preview']||preview.expiresAt<=Date.now())return result(res,409,{status:'preview-expired'});
  session.preview=null;
  if(operation==='star'&&(
     await game.quoteStars(preview.quantity)!==preview.value||
     Number(await game.starsBought(session.address))!==preview.before)){
   return result(res,409,{status:'quote-changed'});
  }
  const purchase={operation,before:preview.before,quantity:preview.quantity};
  session.claim={...purchase,status:'unknown'};
  const executed=await cli(session.directory,['contract-call','execute','--requestId',preview.requestId]);
  const hash=/^0x[0-9a-f]{64}$/i.test(executed.txHash??'')?executed.txHash:undefined;
  const status=executed.status==='PENDING_CONFIRMATION'?'app-confirmation':executed.status==='BROADCASTED'&&hash?'submitted':'unknown';
  session.claim={...purchase,status,hash};
  return result(res,200,{status,hash});
 }catch{
  return result(res,502,{status:session.claim?.status??'preview-failed'});
 }finally{
  session.claimBusy=false;
  if(session.expired)await closeSession(session);
 }
}

const server=createServer(async(req,res)=>{
 const [pathname,query]=req.url.split('?');
 if(pathname!==route)return result(res,404,{status:'unavailable'});
 const id=req.headers.cookie?.split('; ').find(v=>v.startsWith(cookie+'='))?.slice(cookie.length+1);
 const current=sessions.get(id);
 const params=new URLSearchParams(query);
 const requested=params.get('action');
 if(requested){
  const [operation,action]=requested.split('-');
  if(!operations.has(operation)||!['status','preview','execute'].includes(action))return result(res,404,{status:'unavailable'});
  if(action==='status'&&req.method==='GET')return transaction(current,operation,action,params,req,res);
  if(action==='status'||req.method!=='POST')return result(res,405,{status:'unavailable'});
  if(req.headers.origin!==origin)return result(res,403,{status:'unavailable'});
  return transaction(current,operation,action,params,req,res);
 }
 if(req.method==='GET')return current
  ? result(res,200,{status:current.status,...(current.address&&{address:current.address})})
  : result(res,404,{status:'expired'});
 if(req.method!=='POST')return result(res,405,{status:'unavailable'},{Allow:'GET, POST'});
 if(req.headers.origin!==origin)return result(res,403,{status:'unavailable'});
 if(current?.status==='pending'){
  return current.pairing?result(res,200,current.pairing):result(res,409,{status:'pending'});
 }
 if(sessions.size>=24)return result(res,429,{status:'busy'});
 const sessionId=randomBytes(32).toString('hex');
 const session={status:'pending',expiresAt:Date.now()+ttl};
 sessions.set(sessionId,session);
 setTimeout(()=>{
  sessions.delete(sessionId);
  session.expired=true;
  if(session.status==='authorized'&&!session.claimBusy)void closeSession(session);
 },ttl).unref();
 let directory;
 try{
  directory=await mkdtemp(join(tmpdir(),'three-shape-wallet-'));
  session.directory=directory;
  const {qrCodeId,urlForWeb,pairingCode,expireAt}=await cli(directory,['auth','signin']);
  if(typeof qrCodeId!=='string'||!qrCodeId||typeof urlForWeb!=='string'||typeof pairingCode!=='string'||!Number.isFinite(Number(expireAt))||Number(expireAt)<=Date.now()){
   throw new Error('Invalid pairing');
  }
  session.pairing={urlForWeb,pairingCode,expireAt};
  result(res,201,session.pairing,{'Set-Cookie':cookie+'='+sessionId+'; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=360'});
  void verify(session,directory,qrCodeId).catch(()=>{});
 }catch{
  sessions.delete(sessionId);
  if(directory)await rm(directory,{recursive:true,force:true}).catch(()=>{});
  result(res,502,{status:'failed'});
 }
});
server.listen(Number(process.env.THREE_SHAPE_PAIRING_PORT??3070),'127.0.0.1');
