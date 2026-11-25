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

 async function start(){
  setPairing(null);
  setFailed(false);
  setBusy(true);
  try{
   const response=await fetch(new URL('./api/agentic-wallet/pairing',window.location.href),{
    method:'POST',credentials:'same-origin',headers:{Accept:'application/json'},
   });
   if(!response.ok)throw new Error('Pairing unavailable');
   const data:Partial<Pairing>=await response.json();
   const url=new URL(data.urlForWeb??'');
   if(url.origin!=='https://web3.binance.com'||url.username||url.password||
      !/^\/(?:[a-z-]+\/)?agent-login\/?$/i.test(url.pathname)||
      typeof data.urlForWeb!=='string'||typeof data.pairingCode!=='string'||!data.pairingCode.trim()||
      typeof data.expireAt!=='number'||!Number.isFinite(data.expireAt)||data.expireAt<=Date.now()){
    throw new Error('Invalid pairing response');
   }
   setPairing({urlForWeb:data.urlForWeb,pairingCode:data.pairingCode,expireAt:data.expireAt});
  }catch{
   setFailed(true);
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
  {pairing&&<div>
   <p role="status">{en?'Verify this code in the Binance app':'请在币安 App 核对配对码'} <strong>{pairing.pairingCode}</strong></p>
   <a href={pairing.urlForWeb} target="_blank" rel="noopener noreferrer">{en?'Open Binance authorization':'打开币安授权页'}</a>
  </div>}
 </section>;
}
