import { useI18n } from '../i18n';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ContractAdapter } from '../contracts/adapter/ContractAdapter';
import { metadata, formatAmount } from '../contracts/config/metadata';
import type { Action, Mode, NFTItem, PlayPreview, StarQuote, ThreeShapeAdapter } from '../contracts/types';
import { useThreeShape } from '../state/useThreeShape';
import { MysteryPortal } from './MysteryPortal';
import {FruitMarketPortal} from './FruitMarketPortal';
import {ProjectDetails, type ContractAddressInfo} from './ProjectDetails';
import './ThreeShapeCard.css';
import { CollectionTransfer } from './CollectionTransfer';
import { PostComposer } from './PostComposer';
import { canPurchaseStars } from '../game/presentation';
export interface ThreeShapeCardProps {
    mode: Mode;
    deployment?: ContractAddressInfo;
    walletAddress?: string | null;
    adapter?: ThreeShapeAdapter;
    onAction?: (action: string) => void;
    walletConnect?: {connect:()=>Promise<void>; busy:boolean; details:ReactNode; address:string|null; label?:string; blocked?:boolean; pending?:boolean; claimed?:boolean; refreshKey?:number; purchase?:(quantity:number,payment:bigint)=>Promise<void>};
    onWalletChange?: (address: string | null) => void;
}
const states = { disconnected: 'READY', ready: 'READY', playing: 'PENDING', confirming: 'CONFIRMING', result: 'RESULT', reward_available: 'RESULT', claiming: 'PENDING', claimed: 'RESULT', error: 'ERROR' };
export function ThreeShapeCard({ mode, walletAddress, adapter: provided, onAction, onWalletChange, deployment, walletConnect }: ThreeShapeCardProps) {
    const { t, language } = useI18n();
    const adapter = useMemo<ThreeShapeAdapter>(() => provided ?? new ContractAdapter(), [provided, mode]);
    const unavailable = adapter.readiness === 'unconfigured';
    const agentic = Boolean(walletConnect);
    const state = useThreeShape(adapter, agentic ? walletConnect?.address : walletAddress, mode === 'live', agentic, walletConnect?.refreshKey), s = state.snapshot;
    const [tab, setTab] = useState<'game' | 'collection' | 'rewards'>('game'), [selected, setSelected] = useState<NFTItem | null>(null), [plan, setPlan] = useState<PlayPreview | null>(null), [preparing, setPreparing] = useState(false), [readError, setReadError] = useState(''), [quantity, setQuantity] = useState(1), [quote, setQuote] = useState<StarQuote | null>(null), [starsOpen, setStarsOpen] = useState(false);
    useEffect(() => { onWalletChange?.(state.address); }, [state.address, onWalletChange]);
    const generation = useRef(0);
    const canBuyStars = Boolean(state.address && s && adapter.quoteStars && (agentic ? walletConnect?.purchase : adapter.buyStars) && canPurchaseStars(s.game, s.reward));
    const maxPurchase = s ? Math.max(0, Math.min(6 - s.game.starsBought, 100000 - s.game.starsSold)) : 0;
    useEffect(() => { setQuantity(current => Math.max(1, Math.min(current, maxPurchase))); setQuote(null); }, [maxPurchase]);
    useEffect(() => { if (!canBuyStars) {
        setStarsOpen(false);
        setQuote(null);
    } }, [canBuyStars]);
    useEffect(() => { setStarsOpen(false); }, [state.address, adapter]);
    useLayoutEffect(() => { ++generation.current; setPlan(null); setQuote(null); setSelected(null); setPreparing(false); setReadError(''); }, [state.address, s, adapter]);
    const emit = (action: string) => { try {
        onAction?.(action);
    }
    catch { } };
    const act = (action: Action) => { emit(action); void state.act(action); };
    const start = async () => {
        if (walletConnect) {
            await walletConnect.connect();
            return;
        }
        if (!state.address) {
            emit('connectWallet');
            await state.connect();
            return;
        }
        if (!adapter.preparePlay) {
            act('play');
            return;
        }
        const ticket = generation.current;
        setPreparing(true);
        setReadError('');
        try {
            const p = await adapter.preparePlay(state.address);
            if (ticket === generation.current)
                setPlan(p);
        }
        catch (e) {
            if (ticket === generation.current)
                setReadError(e instanceof Error ? e.message : String(e));
        }
        finally {
            if (ticket === generation.current)
                setPreparing(false);
        }
    };
    const price = async () => { if (!canBuyStars || !state.address || !adapter.quoteStars)
        return; const ticket = generation.current; setPreparing(true); setReadError(''); try {
        const q = await adapter.quoteStars(state.address, quantity);
        if (ticket === generation.current)
            setQuote(q);
    }
    catch (e) {
        if (ticket === generation.current)
            setReadError(e instanceof Error ? e.message : String(e));
    }
    finally {
        if (ticket === generation.current)
            setPreparing(false);
    } };
    const busy = state.busy || preparing || Boolean(walletConnect?.busy), pending = Boolean(walletConnect?.pending) || ['playing', 'confirming', 'claiming'].includes(state.status);
    const reelSymbols = pending ? ['🍏', '🍋', '🍇'] : s?.game.result ?? (s?.game.freeClaimed || walletConnect?.claimed ? ['—', '—', '—'] : ['🍏', '🍋', '🍇']);
    const amount = (value: bigint) => formatAmount(value, adapter.tokenDecimals ?? 18);
    const primary = unavailable ? t("等待合约接入") : !state.address ? t("连接钱包开始 →") : s?.game.phase === 'settled' ? t("本次挑战已完成") : s?.game.phase === 'choice' ? t("请选择领取或继续") : !s?.game.freeClaimed ? t("免费领取水果 →") : t("开始挑战 →");
    return <article className="ts-card" aria-label={t("Three Shape 游戏卡片")}>
  <header className="ts-head"><div className="ts-brand"><img className="ts-logo" src={new URL('../../public/three-shape-logo-v2.jpg', import.meta.url).href} alt="Three Shape logo"/><div>Three Shape<small>FRUIT CHALLENGE · V2.9</small></div></div><span className="ts-badge">{unavailable ? t("待接入") : mode === 'mock' ? t("● 模拟模式") : t("链上")}</span></header>
  {state.address && !agentic && <div className="ts-wallet"><span>.ai ID · {s?.game.eligible ? t("已持有") : t("待验证")}</span><button disabled={busy} onClick={() => { emit('disconnect'); void state.disconnect(); }}>{t(`${state.address.slice(0, 6)}…${state.address.slice(-4)} · 断开`)}</button></div>}
  <nav aria-label={t("卡片导航")}>{(['game', 'collection', 'rewards'] as const).map((tabKey, i) => <button key={tabKey} aria-pressed={tab === tabKey} onClick={() => { setTab(tabKey); emit(tabKey); }}>{[t("开始游戏"), t("查看收藏"), t("查看奖励")][i]}</button>)}</nav>
  {tab === 'game' && <section className="ts-play"><div className="ts-eyebrow">A LITTLE FRUIT. A BIG POSSIBILITY.</div><h1>{t("好事，凑成三。")}</h1><p>{t("免费领取水果 NFT，挑战最高")}<strong>{t("1 亿代币")}</strong></p><div className={'ts-reels ' + (pending ? 'spinning' : '')} aria-label={pending ? t("等待交易确认") : t("NFT 展示")}>{reelSymbols.map((emoji, i) => <div key={i}><span>{emoji}</span></div>)}</div>
   <div className="ts-state" role="status"><i />{states[state.status]}<span>{unavailable ? t("等待真实 ABI 与钱包接入") : pending ? t("等待授权与确认") : s?.reward.claimed ? t("奖励已领取") : s?.game.phase === 'choice' ? t(`第 ${s.game.tier} 档匹配已确认`) : t("收集你的下一份惊喜")}</span></div>
   <button className="ts-primary" disabled={unavailable || busy || walletConnect?.busy || Boolean(walletConnect?.blocked || (agentic && s?.game.freeClaimed)) || Boolean(plan) || Boolean(!agentic && state.address && !s?.game.canPlay)} onClick={() => void start()}>{busy || walletConnect?.busy ? t("正在处理…") : (agentic && s?.game.freeClaimed ? (language==='en'?'Fruit claimed':'水果已领取') : walletConnect?.label) || primary}</button>
   {walletConnect?.details}
   {plan && <div className="ts-confirm"><h3>{plan.kind === 'burn' ? t("确认销毁 NFT") : (mode === 'mock' ? t("确认模拟领取") : t("确认领取水果"))}</h3><p>{t(plan.warning)}</p>{plan.tokenIds.length > 0 && <p>{t("NFT ID：")}{plan.tokenIds.join(', ')}<br />{t("当前剩余份额：")}{s?.game.remainingShares.toLocaleString()}</p>}<div className="ts-actions"><button onClick={() => setPlan(null)}>{t("取消")}</button><button className="ts-primary" disabled={busy} onClick={() => { setPlan(null); act('play'); }}>{mode === 'mock' ? t("确认并继续") : t("确认并请求钱包签名")}</button></div></div>}
   {s?.game.phase === 'choice' && <div className="ts-reward"><small>{t("第")}{s.game.tier}{t("档 · 当前可领取")}</small><h2>{amount(s.reward.amount)}<span><img className="ts-token-logo" src={new URL('../../public/three-shape-logo-v2.jpg', import.meta.url).href} alt="3Shape token logo"/>3SHAPE</span></h2><div className="ts-actions"><button className="ts-primary" disabled={agentic || busy || !s.reward.eligible} onClick={() => act('claimReward')}>{t("领取奖励")}</button>{s.game.tier < 3 && <button disabled={agentic || busy || !s.game.canContinue} onClick={() => act('continueChallenge')}>{t("继续挑战 →")}</button>}</div><p>{t("继续不兑现旧档奖励；领奖时才消耗份额。")}</p></div>}
   {s && <p className="ts-game-note">{t(s.game.message)}</p>}
   {s?.game.freeClaimed && s.game.phase === 'ready' && <div className="ts-help"><p>{agentic ? (language==='en'
    ? (s.game.canMatch?'Your collection meets this tier’s requirements. Challenge signing is not connected yet.':'Collect three matching fruits for the first challenge. Stars can fill missing slots under the game rules.')
    : (s.game.canMatch?'当前收藏已满足本档条件。挑战销毁签名尚未接入。':'第一档可凑齐 3 枚同种水果，或按规则用 Star 补齐；挑战成功后可选择领奖。')) : s.game.canMatch ? t("✓ NFT 已满足本档条件；开始挑战后核对销毁清单。") : canBuyStars ? t("点击开始挑战验证当前收藏。若不足，可购买 Star 补齐，或与其他玩家交换。") : t("点击开始挑战验证当前收藏。可使用已持有的 Star 补齐，或与其他玩家交换。")}</p>{canBuyStars && <button disabled={busy} onClick={() => setStarsOpen(true)}>{t("用 Star 补齐")}</button>}<PostComposer key={s.game.tier} tier={s.game.tier}/></div>}
   {s?.reward.claimed && <p className="ts-success">{t("✓ 已领取 · 余额")} {amount(s.balance)} 3SHAPE</p>}
   {s && <div className="ts-progress"><span>{t("个人挑战")}<b>{s.game.tier} / 3</b></span><span>{t("全局阶段")}<b>{s.game.globalStage} / 10</b></span><span>{t("剩余份额")}<b>{s.game.remainingShares.toLocaleString()}</b></span></div>}
  </section>}
  {tab === 'collection' && <section className="ts-panel"><div className="ts-panel-title"><h2>{t("我的水果收藏")}</h2><span>{s ? s.collection.filter(n => n.quantity > 0n).length : '—'} / 9</span></div><p>{t("每一种水果，都是一份小惊喜。")}</p>{s ? <div className="ts-grid">{s.collection.map(n => <button key={n.type} disabled={n.quantity === 0n} className={n.quantity === 0n ? 'unowned' : ''} onClick={() => setSelected(n)}><span role="img" aria-label={n.name}>{n.emoji}</span><small>{n.quantity > 0n ? t(`已收藏 · ×${n.quantity}`) : t("未收藏 · ×0")}</small></button>)}</div> : <div className="ts-grid">{metadata.map(n => <button key={n.kind} disabled aria-label={n.name}><span>{n.symbol}</span><small>{t("数量待查询 · —")}</small></button>)}</div>}{selected && <div className="ts-detail"><button className="ts-close" aria-label={t("关闭 NFT 详情")} onClick={() => setSelected(null)}>×</button>{agentic ? <p>{selected.emoji} {selected.name} · ×{selected.quantity.toString()}</p> : <CollectionTransfer key={selected.type} item={selected} adapter={adapter} busy={busy} execute={task => { emit('transferNFT'); return state.execute('transferNFT', task); }}/>}</div>}</section>}
  {tab === 'rewards' && <section className="ts-panel"><div className="ts-eyebrow">YOUR REWARD JOURNEY</div><h2>{t("每一步，更近一点。")}</h2><p>{t("当前第")}{s?.game.globalStage ?? '—'}{t("个全局阶段，金额随成功领奖次数变化。")}</p><div className="ts-tier-list">{[1, 2, 3].map((tier, i) => <div className={s?.game.tier === tier ? 'active' : ''} key={tier}><span>0{tier}<small>{[t("3 枚 NFT · 至少 1 枚同种水果"), t("6 枚 NFT · 至少 1 枚 Star"), t("9 枚 NFT · 至少 3 枚 Star")][i]}</small></span><strong>{s ? amount(s.game.rewardTiers[i]) : '—'}<small>3SHAPE</small></strong></div>)}</div><p>{t("每钱包仅领取一档，奖励不叠加。销毁不预留份额。")}</p>{s && <p>{t("剩余份额")} {s.game.remainingShares.toLocaleString()}</p>}{s && <p>{t(mode === 'mock' ? "模拟 Token 余额：" : "Token 余额：")}{amount(s.balance)}</p>}</section>}
  {canBuyStars && <section className="ts-star"><button disabled={busy} onClick={() => { setStarsOpen(!starsOpen); setQuote(null); }}>{t("\uD83C\uDF1F 购买 Star")}</button>{starsOpen && <div className="ts-confirm"><h3>{t("点亮下一档挑战")}</h3><p>{t("0.01 BNB 起，每售出 1,000 枚上涨 0.005 BNB。每钱包累计最多购买 6 枚。")}</p><label>{t("购买数量")}<select aria-label={t("购买 Star 数量")} value={quantity} disabled={busy} onChange={e => { setQuantity(Number(e.target.value)); setQuote(null); }}>{Array.from({length:maxPurchase},(_,i)=>i+1).map(n => <option key={n}>{n}</option>)}</select></label><button disabled={busy || !s?.game.eligible} onClick={() => void price()}>{t("查看报价")}</button>{quote && <><p>{quote.quantity}{t("枚 Star · 最高")}{formatAmount(quote.payment, adapter.paymentDecimals ?? 18)} BNB<br />80% Reserve · 20% Treasury<br />{mode === 'mock' ? t("本次仅模拟余额与收藏，不执行真实授权或 LP。") : t("操作需用户钱包签名，以链上回执确认结果。")}</p><button className="ts-primary" disabled={busy} onClick={() => { if (!canBuyStars)
        return; const q = quote; setQuote(null); emit('buyStars'); if(walletConnect?.purchase){setTab('game');void walletConnect.purchase(q.quantity,q.payment);}else void state.execute('buyStars', () => adapter.buyStars!(q)); }}>{agentic ? (language==='en'?'Review Star purchase':'预览 Star 交易') : mode === 'mock' ? t("确认模拟购买") : t("确认购买并请求钱包签名")}</button></>}</div>}</section>}
  {(state.error || readError) && <div className="ts-error" role="alert"><strong>{t("操作未完成")}</strong><p>{t(state.error || readError)}</p><button disabled={busy} onClick={() => { setReadError(''); void (state.address ? state.refresh() : state.connect()); }}>{t("重试 / 刷新状态")}</button></div>}
  {state.receipt?.success&&state.receipt.liquidity&&<p className="ts-receipt" role="status">{t(state.receipt.liquidity==='added'?'购星已确认；本次 LP 已完成':state.receipt.liquidity==='failed'?'购星已确认；本次 LP 未完成':'购星已确认；LP 状态待核实')}</p>}
  {state.receipt?.success&&state.receipt.message&&<p className="ts-receipt" role="status">{t(state.receipt.message)}</p>}
  {state.hash && <p className="ts-hash">{mode === 'mock' ? t("模拟交易") : t("交易")}：{state.hash}</p>}
  {state.address && <button className="ts-refresh" disabled={busy} onClick={() => void state.refresh()}>{t("刷新状态")}</button>}
  <footer><div className="ts-disclaimer">{unavailable ? t("等待真实 ABI 与钱包接入") : mode === 'mock' ? t("ⓘ 本地模拟 · 无真实资产 · 未经链上验证") : t("ⓘ 以链上状态为准 · 交易须用户钱包签名")}</div><FruitMarketPortal address={walletConnect?.address??state.address} deployment={deployment}/><MysteryPortal /><ProjectDetails deployment={deployment}><p>{t("免费领取、销毁、继续、领奖和购星均需持有 .ai ID。免费领取仍有 gas 成本。")}</p><p>{t("三档独立销毁 3 / 6 / 9 枚 NFT。第一档允许 Star 补齐，三档都至少含 1 枚普通水果且普通水果必须同种；后两档分别至少含 1 / 3 枚 Star。走完三档共销毁 18 枚 NFT。")}</p><p>{t("总奖励份额 55,000；实际领奖金额随全局十阶段变化。成功销毁后仍可能因份额耗尽无法领奖。")}</p><p>{t("Token 玩家与 LP 铸币上限各 1.43 万亿。Star 总量 100,000，最高价格 0.505 BNB。")}</p><p>{t("每枚 Star 本笔最多解锁 1,430 万 Token 的 LP 额度；未用额度立即过期，未用 BNB 保留。购星和 LP 结果应分别核实；LP 凭证发送至销毁地址。")}</p><p>{t("售罄后，Reserve 余款可单独结算给固定 T；最后 LP 失败的余额也包含在内。T 拒收则留存，可重试。")}</p></ProjectDetails><p className="ts-project-notice">{t("本项目围绕 Binance Agent ID 的一项长期链上实验，由第三方独立发起，与 Binance 无任何隶属或合作关系。3Shape没有任何实际用途，也不承诺任何价值或收益。")}</p></footer>
 </article>;
}
