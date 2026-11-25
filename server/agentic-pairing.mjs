import {execFile} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {isAbsolute,join} from 'node:path';
import {promisify} from 'node:util';
import {getAddress} from 'ethers';

const run=promisify(execFile);
const origin=new URL(process.env.THREE_SHAPE_ORIGIN??'https://3shape.cc').origin;
const baw=process.env.THREE_SHAPE_BAW;
if(!baw||!isAbsolute(baw))throw new Error('Set THREE_SHAPE_BAW to the absolute path of the official baw CLI');
const route='/api/agentic-wallet/pairing';
const cookie='__Host-three-shape-pairing';
const sessions=new Map();
const ttl=360_000;

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
  session.status='authorized';
 }catch{
  session.status='failed';
 }finally{
  // This service exposes login status only and retains no wallet signing session.
  await cli(directory,['auth','signout']).catch(()=>{});
  await rm(directory,{recursive:true,force:true});
 }
}

const server=createServer(async(req,res)=>{
 if(req.url!==route)return result(res,404,{status:'unavailable'});
 const id=req.headers.cookie?.split('; ').find(v=>v.startsWith(cookie+'='))?.slice(cookie.length+1);
 const current=sessions.get(id);
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
 const session={status:'pending'};
 sessions.set(sessionId,session);
 setTimeout(()=>sessions.delete(sessionId),ttl).unref();
 let directory;
 try{
  directory=await mkdtemp(join(tmpdir(),'three-shape-wallet-'));
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
