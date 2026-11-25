import {useCallback,useEffect,useState,type ReactNode} from 'react';
import {useI18n} from '../i18n';

type Pairing = {urlForWeb:string; pairingCode:string; expireAt:number};

export function AgenticWalletEntry({children}:{children?:(controls?:{connect:()=>Promise<void>; busy:boolean; details:ReactNode; address:string|null})=>ReactNode}){
 const {language}=useI18n();
 const en=language==='en';
 const enabled=import.meta.env.VITE_THREE_SHAPE_AGENTIC_PAIRING==='enabled';
 const [pairing,setPairing]=useState<Pairing|null>(null);
 const [busy,setBusy]=useState(false);
 const [failed,setFailed]=useState(false);
 const [status,setStatus]=useState('');
 const [address,setAddress]=useState<string|null>(null);
 const endpoint=new URL('./api/agentic-wallet/pairing',window.location.href).href;

 async function start(){
  setPairing(null);
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

 const details=(failed||status||pairing||address)&&<div className="ts-wallet-panel">
  {failed&&<p role="alert">{en?'Could not create a pairing. Try again.':'暂时无法生成配对，请重试。'}</p>}
  {address&&<div role="status" className="ts-wallet-success">
   <strong>{en?'✓ Wallet authorization verified':'✓ 钱包授权成功'}</strong>
   <code>{address}</code>
   <small>{en?'Game transaction signing is not connected.':'游戏交易签名尚未接入。'}</small>
  </div>}
  {pairing&&<>
   <div className="ts-wallet-code"><span>{en?'Confirm this code in Binance':'请在币安 App 核对配对码'}</span><strong>{pairing.pairingCode}</strong></div>
   <div className="ts-wallet-actions">
    <a href={pairing.urlForWeb} target="_blank" rel="noopener noreferrer">{en?'Open Binance App':'打开币安授权'}</a>
    <button type="button" onClick={()=>void check(true)}>{en?'Check status':'检查授权状态'}</button>
   </div>
  </>}
  {status&&<small role="status">{status}</small>}
 </div>;
 if(children)return children(enabled?{connect:start,busy,details,address}:undefined);
 return <section className="agent-start" aria-label={en?'Agentic Wallet':'Agentic Wallet 授权'}>
  <button type="button" disabled={!enabled||busy} onClick={()=>void start()}>
   {en?'Connect Agentic Wallet':'连接 Agentic Wallet'}
  </button>
  {details}
 </section>;
}
