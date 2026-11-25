import {useCallback,useEffect,useState,type ReactNode} from 'react';
import {useI18n} from '../i18n';

type Pairing = {urlForWeb:string; pairingCode:string; expireAt:number};

export function AgenticWalletEntry({children}:{children?:(controls?:{connect:()=>Promise<void>; busy:boolean; details:ReactNode; address:string|null; label?:string; blocked?:boolean; pending?:boolean; claimed?:boolean})=>ReactNode}){
 const {language}=useI18n();
 const en=language==='en';
 const enabled=import.meta.env.VITE_THREE_SHAPE_AGENTIC_PAIRING==='enabled';
 const [pairing,setPairing]=useState<Pairing|null>(null);
 const [busy,setBusy]=useState(false);
 const [failed,setFailed]=useState(false);
 const [status,setStatus]=useState('');
 const [address,setAddress]=useState<string|null>(null);
 const [claimState,setClaimState]=useState('');
 const [preview,setPreview]=useState<{token:string;from:string;to:string;gas?:unknown;risks?:{title?:string;description?:string}[];appConfirmation?:boolean}|null>(null);
 const endpoint=new URL('./api/agentic-wallet/pairing',window.location.href).href;

 async function start(){
  setPairing(null);
  setClaimState('');
  setPreview(null);
  setFailed(false);
  setStatus('');
  setBusy(true);
  try{
   const response=await fetch(endpoint,{
    method:'POST',credentials:'same-origin',headers:{Accept:'application/json'},
   });
   if(!response.ok)throw new Error('Pairing unavailable');
   const data:Partial<Omit<Pairing,'expireAt'>> & {expireAt?:number|string}=await response.json();
   const url=new URL(data.urlForWeb??'');
   const officialPage=(url.origin==='https://web3.binance.com'&&/^\/(?:[a-z-]+\/)?agent-login\/?$/i.test(url.pathname))||
     (url.origin==='https://app.binance.com'&&/^\/uni-qr\/[a-z0-9_-]+\/?$/i.test(url.pathname));
   const expireAt=Number(data.expireAt);
   if(!officialPage||url.username||url.password||
      typeof data.urlForWeb!=='string'||typeof data.pairingCode!=='string'||!data.pairingCode.trim()||
      !Number.isFinite(expireAt)||expireAt<=Date.now()){
    throw new Error('Invalid pairing response');
   }
   setPairing({urlForWeb:data.urlForWeb,pairingCode:data.pairingCode,expireAt});
  }catch{
   setFailed(true);
  }finally{
   setBusy(false);
  }
 }

 const check=useCallback(async(active:boolean, signal?:AbortSignal)=>{
  try{
   const response=await fetch(endpoint,{credentials:'same-origin',cache:'no-store',signal});
   const {status:state,address:wallet}=await response.json();
   if(signal?.aborted)return;
   if(response.ok&&state==='authorized'&&typeof wallet==='string'&&/^0x[a-f0-9]{40}$/i.test(wallet)){
    setAddress(wallet);
    setPairing(null);
    setFailed(false);
    setStatus('');
   }else if(response.ok&&state==='pending'){
    if(active)setStatus(en?'Waiting for confirmation in the Binance App.':'等待币安 App 确认');
   }else{
    setAddress(null);
    if(active){
     setPairing(null);
     setStatus(en?'Pairing expired or failed. Start again.':'配对已过期或失败，请重新连接。');
    }
   }
  }catch{
   if(active&&!signal?.aborted)setStatus(en?'Could not check authorization. Try again.':'暂时无法检查授权，请重试。');
  }
 },[endpoint,en]);

 useEffect(()=>{
  if(!enabled||busy||(!children&&!pairing))return;
  const controller=new AbortController();
  let checking=false;
  const update=async()=>{
   if(checking||document.hidden)return;
   checking=true;
   try{await check(Boolean(pairing),controller.signal);}
   finally{checking=false;}
  };
  void update();
  const timer=pairing?window.setInterval(update,2500):undefined;
  window.addEventListener('focus',update);
  document.addEventListener('visibilitychange',update);
  return ()=>{
   controller.abort();
   window.clearInterval(timer);
   window.removeEventListener('focus',update);
   document.removeEventListener('visibilitychange',update);
  };
 },[enabled,busy,Boolean(children),pairing,check]);

 const claimPending=['submitting','app-confirmation','submitted','unknown'].includes(claimState);
 useEffect(()=>{
  if(!address||!claimPending)return;
  const controller=new AbortController();
  const refresh=async()=>{
   try{
    const response=await fetch(endpoint+'?action=claim-status',{signal:controller.signal,cache:'no-store'});
    const {status:next}=await response.json();
    if(!controller.signal.aborted&&['claimed','failed','expired'].includes(next))setClaimState(next);
   }catch{}
  };
  void refresh();
  const timer=window.setInterval(refresh,3500);
  window.addEventListener('focus',refresh);
  return ()=>{controller.abort();window.clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[address,claimPending,endpoint]);

 async function handleClaim(confirm=false){
  if(confirm)setClaimState('submitting');
  setBusy(true);
  try{
   const response=await fetch(endpoint+'?action='+(confirm?'claim-execute':'claim-preview'),{
    method:'POST',headers:confirm&&preview?{'X-Claim-Preview':preview.token}:undefined,
   });
   const data=await response.json();
   if(response.ok&&data.status==='preview'){
    setPreview(data);
    setClaimState('');
   }else{
    setPreview(null);
    setClaimState(data.status||'failed');
    if(data.status==='expired'&&!confirm)setAddress(null);
   }
  }catch{
   setPreview(null);
   setClaimState(confirm?'unknown':'failed');
  }finally{setBusy(false);}
 }

 const claimNote:Record<string,string>=en?{
  submitting:'Submitting the claim.',
  'developer-mode':'Enable Developer Mode in Binance App → Agentic Wallet → Settings, then try again.',
  'app-confirmation':'Confirm the transaction in the Binance App.',
  submitted:'Waiting for on-chain confirmation.',
  unknown:'Checking the chain for a submitted claim.',
  expired:'Session expired. Reconnect your wallet.',
 }:{
  submitting:'正在提交领取交易。',
  'developer-mode':'请在币安 App → Agentic Wallet → 设置中开启开发者模式，再重试。',
  'app-confirmation':'请去币安 App 确认这笔交易。',
  submitted:'正在等待链上确认。',
  unknown:'正在核对领取是否已经提交。',
  expired:'授权会话已过期，请重新连接。',
 };
 const details=(failed||status||pairing||preview||(claimState&&claimState!=='claimed'))&&<div className="ts-wallet-panel">
  {failed&&<p role="alert">{en?'Could not create a pairing. Try again.':'暂时无法生成配对，请重试。'}</p>}
  {preview&&<div className="ts-wallet-success">
   <strong>{en?'Confirm free fruit claim':'确认领取水果'}</strong>
   <small>BNB Smart Chain · 0 BNB {en?'plus gas':'，另付网络费'}</small>
   <code>{preview.from} → {preview.to}</code>
   {preview.risks?.map((risk,index)=><small key={index}>{risk.title} {risk.description}</small>)}
   {preview.appConfirmation&&<small>{en?'Binance App confirmation will be required.':'提交后还需在币安 App 确认。'}</small>}
   <div className="ts-wallet-actions"><button type="button" disabled={busy} onClick={()=>setPreview(null)}>{en?'Cancel':'取消'}</button><button type="button" disabled={busy} onClick={()=>void handleClaim(true)}>{en?'Confirm claim':'确认领取'}</button></div>
  </div>}
  {claimState&&claimState!=='claimed'&&<small role="status">{claimNote[claimState]??(en?'Could not prepare the claim. Try again.':'暂时无法领取，请检查资格和 BNB 网络费后重试。')}</small>}
  {pairing&&<>
   <div className="ts-wallet-code"><span>{en?'Confirm this code in Binance':'请在币安 App 核对配对码'}</span><strong>{pairing.pairingCode}</strong></div>
   <div className="ts-wallet-actions">
    <a href={pairing.urlForWeb} target="_blank" rel="noopener noreferrer">{en?'Open Binance App':'打开币安授权'}</a>
    <button type="button" onClick={()=>void check(true)}>{en?'Check status':'检查授权状态'}</button>
   </div>
  </>}
  {status&&<small role="status">{status}</small>}
 </div>;
 if(children)return children(enabled?{
  connect:address?()=>handleClaim():start,busy,details,address,
  label:address?(claimState==='claimed'?(en?'Fruit claimed':'水果已领取'):claimPending?(en?'Claim in progress':'正在领取…'):(en?'Authorized · Claim fruit':'已登录 · 领取水果')):undefined,
  blocked:Boolean(preview)||claimPending||claimState==='claimed',pending:claimPending,claimed:claimState==='claimed',
 }:undefined);
 return <section className="agent-start" aria-label={en?'Agentic Wallet':'Agentic Wallet 授权'}>
  <button type="button" disabled={!enabled||busy} onClick={()=>void start()}>
   {en?'Connect Agentic Wallet':'连接 Agentic Wallet'}
  </button>
  {details}
 </section>;
}
