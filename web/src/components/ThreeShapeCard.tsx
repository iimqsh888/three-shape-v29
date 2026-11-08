import {useEffect,useMemo,useRef,useState} from 'react';
import {MockAdapter} from '../contracts/adapter/MockAdapter';
import {ContractAdapter} from '../contracts/adapter/ContractAdapter';
import {formatAmount} from '../contracts/config/metadata';
import type {Action,Mode,NFTItem,PlayPreview,StarQuote,ThreeShapeAdapter} from '../contracts/types';
import {useThreeShape} from '../state/useThreeShape';
import {MysteryPortal} from './MysteryPortal';
import './ThreeShapeCard.css';
export interface ThreeShapeCardProps {mode:Mode;walletAddress?:string|null;adapter?:ThreeShapeAdapter;onAction?:(action:string)=>void}
const states={disconnected:'READY',ready:'READY',playing:'PENDING',confirming:'CONFIRMING',result:'RESULT',reward_available:'RESULT',claiming:'PENDING',claimed:'RESULT',error:'ERROR'};
export function ThreeShapeCard({mode,walletAddress,adapter:provided,onAction}:ThreeShapeCardProps){
 const adapter=useMemo<ThreeShapeAdapter>(()=>provided??(mode==='mock'?new MockAdapter():new ContractAdapter()),[provided,mode]);
 const state=useThreeShape(adapter,walletAddress,mode==='live'),s=state.snapshot;
 const [tab,setTab]=useState<'game'|'collection'|'rewards'>('game'),[selected,setSelected]=useState<NFTItem|null>(null),[plan,setPlan]=useState<PlayPreview|null>(null),[preparing,setPreparing]=useState(false),[readError,setReadError]=useState(''),[quantity,setQuantity]=useState(1),[quote,setQuote]=useState<StarQuote|null>(null),[starsOpen,setStarsOpen]=useState(false);
 const generation=useRef(0);
 useEffect(()=>{++generation.current;setPlan(null);setQuote(null);setSelected(null);setPreparing(false);setReadError('');},[state.address,s,adapter]);
 const emit=(action:string)=>{try{onAction?.(action);}catch{}};
 const act=(action:Action)=>{emit(action);void state.act(action);};
 const start=async()=>{
  if(!state.address){emit('connectWallet');await state.connect();return;}
  if(!adapter.preparePlay){act('play');return;}
  const ticket=generation.current;setPreparing(true);setReadError('');try{const p=await adapter.preparePlay(state.address);if(ticket===generation.current)setPlan(p);}catch(e){if(ticket===generation.current)setReadError(e instanceof Error?e.message:String(e));}finally{if(ticket===generation.current)setPreparing(false);}
 };
 const price=async()=>{if(!state.address||!adapter.quoteStars)return;const ticket=generation.current;setPreparing(true);setReadError('');try{const q=await adapter.quoteStars(state.address,quantity);if(ticket===generation.current)setQuote(q);}catch(e){if(ticket===generation.current)setReadError(e instanceof Error?e.message:String(e));}finally{if(ticket===generation.current)setPreparing(false);}};
 const busy=state.busy||preparing,pending=['playing','confirming','claiming'].includes(state.status);
 const amount=(value:bigint)=>formatAmount(value,adapter.tokenDecimals??18);
 const primary=!state.address?'连接钱包开始 →':!s?.game.freeClaimed?'免费领取水果 →':s?.game.phase==='settled'?'本次挑战已完成':s?.game.phase==='choice'?'请选择领取或继续':s?.game.canPlay?'开始挑战 →':'等待凑齐 NFT';
 return <article className="ts-card" aria-label="Three Shape 游戏卡片">
  <header className="ts-head"><div className="ts-brand"><span>✳</span><div>Three Shape<small>FRUIT CHALLENGE · V2.9</small></div></div><span className="ts-badge">{mode==='mock'?'● 模拟模式':'● LIVE'}</span></header>
  <div className="ts-wallet"><span>{state.address?'.ai ID · '+(s?.game.eligible?'已持有':'待验证'):'连接，收集，开启挑战。'}</span><button disabled={busy} onClick={()=>{emit(state.address?'disconnect':'connectWallet');void(state.address?state.disconnect():state.connect());}}>{state.address?`${state.address.slice(0,6)}…${state.address.slice(-4)} · 断开`:'连接钱包 ↗'}</button></div>
  <nav aria-label="卡片导航">{(['game','collection','rewards']as const).map((t,i)=><button key={t} aria-pressed={tab===t} onClick={()=>{setTab(t);emit(t);}}>{['开始游戏','查看收藏','查看奖励'][i]}</button>)}</nav>
  {tab==='game'&&<section className="ts-play"><div className="ts-eyebrow">A LITTLE FRUIT. A BIG POSSIBILITY.</div><h1>好事，凑成三。</h1><p>免费领取水果 NFT，挑战最高 <strong>1 亿代币</strong></p><div className={'ts-reels '+(pending?'spinning':'')} aria-label={pending?'等待交易确认':'NFT 展示'}>{(pending?['🍏','🍋','🍇']:s?.game.result??['🍏','🍋','🍇']).map((emoji,i)=><div key={i}><span>{emoji}</span></div>)}</div>
   <div className="ts-state" role="status"><i/>{states[state.status]}<span>{pending?'等待授权与确认':s?.reward.claimed?'奖励已领取':s?.game.phase==='choice'?`第 ${s.game.tier} 档匹配已确认`:'收集你的下一份惊喜'}</span></div>
   <button className="ts-primary" disabled={busy||Boolean(plan)||Boolean(state.address&&!s?.game.canPlay)} onClick={()=>void start()}>{busy?'正在处理…':primary}</button>
   {plan&&<div className="ts-confirm"><h3>{plan.kind==='burn'?'确认销毁 NFT':'确认模拟领取'}</h3><p>{plan.warning}</p>{plan.tokenIds.length>0&&<p>NFT ID：{plan.tokenIds.join(', ')}<br/>当前剩余份额：{s?.game.remainingShares.toLocaleString()}</p>}<div className="ts-actions"><button onClick={()=>setPlan(null)}>取消</button><button className="ts-primary" disabled={busy} onClick={()=>{setPlan(null);act('play');}}>{mode==='mock'?'确认并继续':'确认并请求钱包签名'}</button></div></div>}
   {s?.game.phase==='choice'&&<div className="ts-reward"><small>第 {s.game.tier} 档 · 当前可领取</small><h2>{amount(s.reward.amount)}<span>3SHAPE</span></h2><div className="ts-actions"><button className="ts-primary" disabled={busy||!s.reward.eligible} onClick={()=>act('claimReward')}>领取奖励</button>{s.game.tier<3&&<button disabled={busy||!s.game.canContinue} onClick={()=>act('continueChallenge')}>继续挑战 →</button>}</div><p>继续不兑现旧档奖励；领奖时才消耗份额。</p></div>}
   {s&&<p className="ts-game-note">{s.game.message}</p>}
   {s?.reward.claimed&&<p className="ts-success">✓ 已领取 · 余额 {amount(s.balance)} 3SHAPE</p>}
   {s&&<div className="ts-progress"><span>个人挑战 <b>{s.game.tier} / 3</b></span><span>全局阶段 <b>{s.game.globalStage} / 10</b></span><span>剩余份额 <b>{s.game.remainingShares.toLocaleString()}</b></span></div>}
  </section>}
  {tab==='collection'&&<section className="ts-panel"><div className="ts-panel-title"><h2>我的水果收藏</h2><span>{s?.collection.filter(n=>n.quantity>0n).length??0} / 9</span></div><p>每一种水果，都是一份小惊喜。</p>{s?<div className="ts-grid">{s.collection.map(n=><button key={n.type} disabled={n.quantity===0n} className={n.quantity===0n?'unowned':''} onClick={()=>setSelected(n)}><span>{n.emoji}</span><strong>{n.name}</strong><small>{n.quantity>0n?`已收藏 · ×${n.quantity}`:'未收藏 · ×0'}</small></button>)}</div>:<p>连接钱包后查看收藏。</p>}{selected&&<div className="ts-detail"><button aria-label="关闭 NFT 详情" onClick={()=>setSelected(null)}>×</button><h3>{selected.emoji} {selected.name}</h3><p>{mode==='mock'?'本地 JSON 模拟元数据':'链上 JSON 元数据'}</p><pre>{JSON.stringify({tokenIds:selected.tokenIds,metadata:selected.metadata},null,2)}</pre></div>}</section>}
  {tab==='rewards'&&<section className="ts-panel"><div className="ts-eyebrow">YOUR REWARD JOURNEY</div><h2>每一步，更近一点。</h2><p>当前第 {s?.game.globalStage??'—'} 个全局阶段，金额随成功领奖次数变化。</p><div className="ts-tier-list">{[1,2,3].map((tier,i)=><div className={s?.game.tier===tier?'active':''} key={tier}><span>0{tier}<small>{['3 枚同种水果','6 枚 NFT · 至少 1 枚 Star','9 枚 NFT · 至少 3 枚 Star'][i]}</small></span><strong>{s?amount(s.game.rewardTiers[i]):'—'}<small>3SHAPE</small></strong></div>)}</div><p>每钱包仅领取一档，奖励不叠加。销毁不预留份额。</p>{s&&<p>模拟 Token 余额：{amount(s.balance)}</p>}</section>}
  {state.address&&adapter.quoteStars&&<section className="ts-star"><button disabled={busy} onClick={()=>{setStarsOpen(!starsOpen);setQuote(null);}}>🌟 购买 Star</button>{starsOpen&&<div className="ts-confirm"><h3>点亮下一档挑战</h3><p>10 USDT 起，每售出 1,000 枚上涨 2 USDT。每钱包累计最多购买 6 枚。</p><label>购买数量 <select aria-label="购买 Star 数量" value={quantity} disabled={busy} onChange={e=>{setQuantity(Number(e.target.value));setQuote(null);}}>{[1,2,3,4,5,6].map(n=><option key={n}>{n}</option>)}</select></label><button disabled={busy||!s?.game.eligible} onClick={()=>void price()}>查看报价</button>{quote&&<><p>{quote.quantity} 枚 Star · 最高 {formatAmount(quote.payment,adapter.usdtDecimals??18)} USDT<br/>80% Reserve · 20% Treasury<br/>{mode==='mock'?'本次仅模拟余额与收藏，不执行真实授权或 LP。':'操作需用户钱包签名，以链上回执确认结果。'}</p><button className="ts-primary" disabled={busy} onClick={()=>{const q=quote;setQuote(null);emit('buyStars');void state.execute('buyStars',()=>adapter.buyStars!(q));}}>{mode==='mock'?'确认模拟购买':'确认购买并请求钱包签名'}</button></>}</div>}</section>}
  {(state.error||readError)&&<div className="ts-error" role="alert"><strong>操作未完成</strong><p>{state.error||readError}</p><button disabled={busy} onClick={()=>{setReadError('');void(state.address?state.refresh():state.connect());}}>重试 / 刷新状态</button></div>}
  {state.hash&&<p className="ts-hash">{mode==='mock'?'模拟交易':'交易'}：{state.hash}</p>}
  {state.address&&<button className="ts-refresh" disabled={busy} onClick={()=>void state.refresh()}>刷新状态</button>}
  <footer><div className="ts-disclaimer">{mode==='mock'?'ⓘ 本地模拟 · 无真实资产 · 未经链上验证':'ⓘ 以链上状态为准 · 交易须用户钱包签名'}</div><MysteryPortal/><details className="ts-rules"><summary>查看玩法与费用</summary><p>免费领取、销毁、继续、领奖和购星均需持有 .ai ID。免费领取仍有 gas 成本。</p><p>三档独立销毁 3 / 6 / 9 枚 NFT。后两档分别至少含 1 / 3 枚 Star，其余普通水果同种且至少 1 枚。走完三档共销毁 18 枚 NFT。</p><p>总奖励份额 55,000；实际领奖金额随全局十阶段变化。成功销毁后仍可能因份额耗尽无法领奖。</p><p>Token 玩家与 LP 铸币上限各 1.43 万亿。Star 总量 100,000，最高价格 208 USDT。</p><p>每枚 Star 本笔最多解锁 1,430 万 Token 的 LP 额度；未用额度立即过期，未用 USDT 保留。购星和 LP 结果应分别核实；LP 凭证发送至销毁地址。现货池比率存在被操纵的风险。</p></details><div className="ts-bottom"><span>THREE SHAPE</span><span>集齐快乐，探索可能 ✳</span></div></footer>
 </article>;
}
