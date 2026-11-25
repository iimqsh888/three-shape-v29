import {useState} from 'react';
import {useI18n} from '../i18n';

type Pairing = {urlForWeb:string; pairingCode:string; expireAt:number};

export function AgenticWalletEntry(){
 const {language}=useI18n();
 const en=language==='en';
 const enabled=import.meta.env.VITE_THREE_SHAPE_AGENTIC_PAIRING==='enabled';
 const [pairing,setPairing]=useState<Pairing|null>(null);
 const [busy,setBusy]=useState(false);
 const [failed,setFailed]=useState(false);
 const [status,setStatus]=useState('');
 const endpoint=new URL('./api/agentic-wallet/pairing',window.location.href);

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

 async function check(){
  setBusy(true);
  try{
   const response=await fetch(endpoint,{credentials:'same-origin',cache:'no-store'});
   const {status:state,address}=await response.json();
   if(response.ok&&state==='authorized'&&typeof address==='string'&&/^0x[a-f0-9]{40}$/i.test(address)){
    setPairing(null);
    setStatus(en?`Authorization verified for ${address}. Game signing is not yet connected.`:`已验证授权地址 ${address}。游戏签名尚未接入。`);
   }else if(response.ok&&state==='pending'){
    setStatus(en?'Waiting for confirmation in the Binance App.':'等待你在币安 App 确认。');
   }else{
    setPairing(null);
    setStatus(en?'Pairing expired or failed. Start again.':'配对已过期或失败，请重新连接。');
   }
  }catch{
   setStatus(en?'Could not check authorization. Try again.':'暂时无法检查授权，请重试。');
  }finally{
   setBusy(false);
  }
 }

 return <section className="agent-start" aria-label={en?'Agentic Wallet':'Agentic Wallet 授权'}>
  <div className="agent-start-actions">
   <button type="button" disabled={!enabled||busy} onClick={()=>void start()}>
    {busy?(en?'Creating pairing…':'正在创建配对…'):(en?'Connect Agentic Wallet':'连接 Agentic Wallet')}
   </button>
  </div>
  {!enabled&&<p>{en?'Website authorization is not available yet.':'官网授权暂未开放。'}</p>}
  {failed&&<p role="alert">{en?'Could not create a pairing. Try again.':'暂时无法生成配对，请重试。'}</p>}
  {status&&<p role="status">{status}</p>}
  {pairing&&<div>
   <p role="status">{en?'Verify this code in the Binance app':'请在币安 App 核对配对码'} <strong>{pairing.pairingCode}</strong></p>
   <a href={pairing.urlForWeb} target="_blank" rel="noopener noreferrer">{en?'Open Binance authorization':'打开币安授权页'}</a>
   <button type="button" disabled={busy} onClick={()=>void check()}>{en?'Check authorization':'我已确认，检查授权'}</button>
  </div>}
 </section>;
}
