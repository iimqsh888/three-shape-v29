import {readFile} from 'node:fs/promises';
import {resolve,relative,extname} from 'node:path';
import {rules,capabilities} from './rules.mjs';
const skillFile=new URL('../skills/three-shape/SKILL.md',import.meta.url);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.md':'text/markdown; charset=utf-8','.ico':'image/x-icon'};
/** Public read-only service. liveReader must perform its own authoritative chain reads.
 * No server route signs, broadcasts, pairs wallets or enables developer mode. */
export function createHandler({staticDirectory=new URL('../web/dist',import.meta.url).pathname,liveReader=null,ruleSet=rules,capabilitySet=capabilities,deployment=null}={}){
 const root=resolve(staticDirectory);
 return async(req,res)=>{
  const send=(status,body,type='application/json; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://bsc-testnet-rpc.publicnode.com; base-uri 'none'; frame-ancestors 'self'"});res.end(req.method==='HEAD'?undefined:typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body,(_,v)=>typeof v==='bigint'?String(v):v));};
  try{
   if(req.method!=='GET'&&req.method!=='HEAD')return send(405,{error:'READ_ONLY',message:'此服务不接收交易或钱包授权'});
   if((req.url??'').length>4096)return send(414,{error:'URL_TOO_LONG'});
   const url=new URL(req.url,'http://localhost'),path=decodeURIComponent(url.pathname);
   if(path==='/healthz')return send(200,{ok:true,service:'three-shape-read-only'});
   if(['/api/rules','/api/rules.json'].includes(path))return send(200,ruleSet);
   if(['/api/capabilities','/api/capabilities.json'].includes(path))return send(200,{...capabilitySet,modes:liveReader?['live']:[],liveConfigured:!!liveReader});
   if(path==='/api/deployment.json')return deployment?send(200,deployment):send(503,{error:'LIVE_NOT_CONFIGURED'});
   if(path==='/skills/three-shape/SKILL.en.md')return send(200,await readFile(new URL('../skills/three-shape/SKILL.en.md',import.meta.url)),'text/markdown; charset=utf-8');
   if(path==='/skills/three-shape/SKILL.md')return send(200,await readFile(skillFile),'text/markdown; charset=utf-8');
   if(path==='/api/game'){
    const address=url.searchParams.get('address')??'';if(!/^0x[0-9a-fA-F]{40}$/.test(address))return send(400,{error:'INVALID_ADDRESS'});
    if(!liveReader)return send(503,{error:'LIVE_NOT_CONFIGURED',message:'真实合约和钱包绑定尚未接入；操作暂不可用'});
    const view=await liveReader(address);if(view?.mode!=='live'||view?.schemaVersion!=='three-shape.game.v1'||view?.address?.toLowerCase()!==address.toLowerCase())return send(502,{error:'INVALID_LIVE_RESULT'});
    return send(200,view);
   }
   if(path.startsWith('/api/'))return send(404,{error:'NOT_FOUND'});
   const target=resolve(root,'.'+(path==='/'?'/index.html':path)),rel=relative(root,target);
   if(rel.startsWith('..')||rel.split(/[\\/]/).some(p=>p.startsWith('.')))return send(404,{error:'NOT_FOUND'});
   const extension=extname(target);if(!types[extension])return send(404,{error:'NOT_FOUND'});
   try{return send(200,await readFile(target),types[extension]);}catch{return send(404,{error:'NOT_FOUND'});}
  }catch{return send(500,{error:'SERVICE_UNAVAILABLE',message:'读取失败，请重试；不代表链上操作成功'});}
 };
}
