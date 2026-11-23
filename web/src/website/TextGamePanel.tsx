import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {Mode,ThreeShapeAdapter,PlayPreview,StarQuote} from '../contracts/types';
import {useThreeShape} from '../state/useThreeShape';
import {gameView,textGame,canPurchaseStars} from '../game/presentation';
import {PostComposer} from '../components/PostComposer';
type Prepared={action:'play';preview:PlayPreview}|{action:'buyStars';quote:StarQuote}|{action:'claimReward'|'continueChallenge'};
export function TextGamePanel({adapter,mode,walletAddress,onWalletChange}:{adapter:ThreeShapeAdapter;mode:Mode;walletAddress:string|null;onWalletChange:(a:string|null)=>void}){
 const state=useThreeShape(adapter,walletAddress,mode==='live'),s=state.snapshot;
 const [section,setSection]=useState<'status'|'collection'|'rewards'>('status'),[input,setInput]=useState(''),[note,setNote]=useState(''),[reading,setReading]=useState(false);
 const epoch=useRef(0),preparing=useRef(false);
 useEffect(()=>onWalletChange(state.address),[state.address,onWalletChange]);
 useLayoutEffect(()=>{++epoch.current;setReading(false);setNote('');preparing.current=false;},[s,state.address,adapter]);
 useEffect(()=>()=>{++epoch.current;},[]);
 const busy=state.busy||reading,view=s&&state.address?gameView(s,mode,state.address,adapter.tokenDecimals??18):null;
 const command=async(text:string)=>{
  if(busy||preparing.current)return;setNote('');const normalized=text.trim();
  if(normalized==='连接钱包'){await state.connect();return;}
  if(normalized==='断开钱包'){await state.disconnect();return;}
  if(!s||!state.address){setNote('请先连接模拟钱包，或由宿主接入真实钱包。');return;}
  if(['状态','收藏','奖励','刷新'].includes(normalized)){setSection(normalized==='收藏'?'collection':normalized==='奖励'?'rewards':'status');await state.refresh();return;}
  if(!s.game.eligible){setNote('当前钱包未持有 .ai ID。');return;}
  const ticket=epoch.current;preparing.current=true;setReading(true);
  try{
   let next:Prepared;
   if(normalized==='免费领取'||normalized==='开始挑战'){
    if(!s.game.canPlay)throw new Error('当前合约状态不允许此操作');
    if(normalized==='免费领取'&&s.game.freeClaimed)throw new Error('本钱包已免费领取');
    if(normalized==='开始挑战'&&!s.game.freeClaimed)throw new Error('请先免费领取水果');
    if(!adapter.preparePlay)throw new Error('尚未接入操作预览接口');
    next={action:'play',preview:await adapter.preparePlay(state.address)};
   }else if(/^购买\s*[1-6]\s*(Star|star|星星)$/.test(normalized)){
    if(!canPurchaseStars(s.game,s.reward))throw new Error('当前购买入口已关闭');
    if(!adapter.quoteStars||!adapter.buyStars)throw new Error('尚未接入购星接口');
    next={action:'buyStars',quote:await adapter.quoteStars(state.address,Number(normalized.match(/[1-6]/)![0]))};
   }else if(normalized==='领取奖励'){
    if(!s.reward.eligible)throw new Error('当前没有可领取奖励');next={action:'claimReward'};
   }else if(normalized==='继续挑战'){
    if(!s.game.canContinue)throw new Error('当前不能继续挑战');next={action:'continueChallenge'};
   }else throw new Error('可输入：状态、收藏、奖励、免费领取、开始挑战、领取奖励、继续挑战、购买 1 Star、刷新。');
   if(ticket===epoch.current){if(next.action==='buyStars')await state.execute('buyStars',()=>adapter.buyStars!((next as Extract<Prepared,{action:'buyStars'}>).quote));else await state.act(next.action);}
  }catch(e){if(ticket===epoch.current)setNote(e instanceof Error?e.message:String(e));}
  finally{if(ticket===epoch.current){setReading(false);preparing.current=false;}}
 };
 const actions=view?.allowedActions??[];
 return <section className="text-game" aria-label="文字 Emoji 游戏"><div className="text-top"><h2>文字 + Emoji</h2><span>{mode==='mock'?'本地模拟':'Live'}</span></div><p>这是确定性指令演示，可把同样的规则交给 AI Pro；此处未连接语言模型。</p><pre aria-live="polite">{view?textGame(view,section):'🍏 🍋 🍇 Three Shape\n连接钱包后读取状态。'}</pre>
 <div className="text-actions">{!state.address?<button disabled={busy} onClick={()=>void command('连接钱包')}>连接模拟钱包</button>:<>{['状态','收藏','奖励'].map(t=><button key={t} disabled={busy} onClick={()=>void command(t)}>{t}</button>)}{actions.includes('claimFree')&&<button disabled={busy} onClick={()=>void command('免费领取')}>免费领取</button>}{actions.includes('challenge')&&<button disabled={busy} onClick={()=>void command('开始挑战')}>开始挑战</button>}{actions.includes('claimReward')&&<button disabled={busy} onClick={()=>void command('领取奖励')}>领取奖励</button>}{actions.includes('continueChallenge')&&<button disabled={busy} onClick={()=>void command('继续挑战')}>继续挑战</button>}{actions.includes('buyStars')&&<button disabled={busy} onClick={()=>void command('购买 1 Star')}>🌟 购买 1 Star</button>}<button disabled={busy} onClick={()=>void command('断开钱包')}>断开钱包</button></>}</div>
 <form onSubmit={e=>{e.preventDefault();void command(input);setInput('');}}><label htmlFor="text-command">输入游戏指令</label><div className="text-input"><input id="text-command" value={input} disabled={busy} onChange={e=>setInput(e.target.value)} placeholder="例如：购买 2 Star"/><button disabled={busy||!input.trim()}>发送指令</button></div></form>
 {busy&&<p role="status">{state.status==='confirming'?'⏳ 等待交易确认，不提前结算':'⏳ 正在准备操作'}</p>}{(note||state.error)&&<p role="alert">{note||state.error}</p>}{state.hash&&<p className="text-hash">{mode==='mock'?'模拟交易':'交易'}：{state.hash}</p>}
 {s?.game.freeClaimed&&s.game.phase==='ready'&&<PostComposer tier={s.game.tier}/>}
 {view&&<details><summary>结构化游戏状态 JSON</summary><pre>{JSON.stringify(view,null,2)}</pre></details>}
 </section>;
}
