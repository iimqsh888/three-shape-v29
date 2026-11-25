import {useCallback,useEffect,useRef,useState} from 'react';
import type {Action,Status,ThreeShapeAdapter,TransactionResult,TransactionReceipt} from '../contracts/types';
import type {GameSnapshot as Snapshot} from '../game/presentation';
export function useThreeShape(adapter:ThreeShapeAdapter,addressProp:string|null|undefined,live:boolean,externalWallet=false,refreshKey=0){
 const [address,setAddress]=useState<string|null>(addressProp??null),[status,setStatus]=useState<Status>('disconnected'),[snapshot,setSnapshot]=useState<Snapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[hash,setHash]=useState<string>(),[receipt,setReceipt]=useState<TransactionReceipt|null>(null);
 const epoch=useRef(0),locked=useRef(false),current=useRef<string|null>(addressProp??null);
 const key=(a:string)=>'three-shape-preview-pending:'+(adapter.pendingScope?adapter.pendingScope+':':'')+a.toLowerCase();
 const reload=useCallback(async(a:string,ticket:number)=>{
  if(live){const pending=localStorage.getItem(key(a));if(pending){if(!adapter.recoverPending)throw new Error('存在待核实交易，需要接入恢复接口后才能继续');const tx=await adapter.recoverPending(a,JSON.parse(pending).hash);if(tx){const receipt=await tx.wait(2);if(ticket===epoch.current){setReceipt(receipt);setHash(tx.hash??JSON.parse(pending).hash);}localStorage.removeItem(key(a));if(!receipt.success)throw new Error(receipt.message??'待处理交易失败');}else throw new Error('待处理交易结果尚未确认，请核实后重试；不会自动重发');}}
  const [game,collection,reward,balance]=await Promise.all([adapter.getGameState(a),adapter.getCollection(a),adapter.getRewardState(a),adapter.getTokenBalance(a)]);
  if(ticket!==epoch.current)return;
  setSnapshot({game,collection,reward,balance});setStatus(reward.claimed?'claimed':reward.eligible?'reward_available':game.freeClaimed?'result':'ready');
 },[adapter,live]);
 const change=useCallback((a:string|null)=>{
  const ticket=++epoch.current;current.current=a;locked.current=Boolean(a);setAddress(a);setSnapshot(null);setError('');setHash(undefined);setReceipt(null);setBusy(Boolean(a));setStatus(a?'ready':'disconnected');
  if(a)void reload(a,ticket).catch(e=>{if(ticket===epoch.current){setStatus('error');setError(e instanceof Error?e.message:String(e));}}).finally(()=>{if(ticket===epoch.current){locked.current=false;setBusy(false);}});
 },[reload]);
 useEffect(()=>{change(addressProp??null);return()=>{++epoch.current;};},[addressProp,change,refreshKey]);
 useEffect(()=>{if(!externalWallet)return adapter.subscribe?.(s=>change(s.address));},[adapter,change,externalWallet]);
 const connect=async()=>{if(locked.current)return;locked.current=true;setBusy(true);const ticket=epoch.current;try{const a=await adapter.connectWallet();if(ticket===epoch.current)change(a);}catch(e){if(ticket===epoch.current){setStatus('error');setError(e instanceof Error?e.message:String(e));}}finally{if(ticket===epoch.current){locked.current=false;setBusy(false);}}};
 const refresh=async()=>{if(locked.current||!current.current)return;locked.current=true;setBusy(true);setError('');const ticket=epoch.current;try{await reload(current.current,ticket);}catch(e){if(ticket===epoch.current){setStatus('error');setError(e instanceof Error?e.message:String(e));}}finally{if(ticket===epoch.current){locked.current=false;setBusy(false);}}};
 const execute=async(name:Action|'buyStars'|'transferNFT',task:()=>Promise<TransactionResult>)=>{
  const a=current.current;if(externalWallet||locked.current||!a||!snapshot)return;
  if(!snapshot.game.eligible){setError('此钱包未持有 .ai ID');return;}
  if(live&&localStorage.getItem(key(a))){setError('请先恢复待核实交易');return;}
  const ticket=epoch.current;locked.current=true;setBusy(true);setError('');setHash(undefined);setReceipt(null);setStatus(name==='claimReward'?'claiming':'playing');let known=false,confirmedChange=false;
  try{
   if(live)localStorage.setItem(key(a),JSON.stringify({action:name}));
   const tx=await task();if(live)localStorage.setItem(key(a),JSON.stringify({action:name,hash:tx.hash}));
   if(ticket===epoch.current){setHash(tx.hash);setStatus('confirming');}
   const receipt=await tx.wait(live?2:1);known=true;if(ticket===epoch.current)setReceipt(receipt);if(live)localStorage.removeItem(key(a));
   if(!receipt.success)throw new Error(receipt.message??'交易执行失败');
   confirmedChange=true;
   if(ticket===epoch.current)await reload(a,ticket);
  }catch(e){if(confirmedChange&&ticket===epoch.current)setSnapshot(null);if(live&&!known&&e&&typeof e==='object'&&(('code'in e&&(e.code===4001||e.code==='ACTION_REJECTED'))||('broadcast'in e&&e.broadcast===false)))localStorage.removeItem(key(a));if(ticket===epoch.current){setStatus('error');setError(e instanceof Error?e.message:String(e));}}
  finally{if(ticket===epoch.current){locked.current=false;setBusy(false);}}
 };
 const act=async(action:Action)=>{if(!snapshot)return;const allowed=action==='play'?snapshot.game.canPlay:action==='claimReward'?snapshot.reward.eligible:snapshot.game.canContinue;if(allowed)await execute(action,()=>action==='claimReward'?adapter.claimReward(snapshot.reward.amount):adapter[action]());};
 const disconnect=async()=>{change(null);try{await adapter.disconnect?.();}catch(e){setError(e instanceof Error?e.message:String(e));}};
 return {address,status,snapshot,error,busy,hash,receipt,connect,refresh,act,execute,disconnect};
}
