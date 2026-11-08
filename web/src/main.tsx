import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ThreeShapeCard} from './components/ThreeShapeCard';
import {MockAdapter} from './contracts/adapter/MockAdapter';
import {formatAmount} from './contracts/config/metadata';
import './style.css';
function Tools({adapter}:{adapter:MockAdapter}){
 const [eligible,setEligible]=useState(true),[stage,setStage]=useState(1),[sold,setSold]=useState(0),[usdt,setUSDT]=useState('1000'),[note,setNote]=useState('');
 useEffect(()=>{const read=()=>{void adapter.getGameState(adapter.address).then(s=>{setEligible(s.eligible);setStage(s.globalStage);setSold(s.starsSold);});void adapter.getUSDTBalance(adapter.address).then(n=>setUSDT(formatAmount(n)));};read();return adapter.subscribe(read);},[adapter]);
 const call=(fn:()=>void,message:string)=>{try{fn();setNote(message);}catch(e){setNote(e instanceof Error?e.message:String(e));}};
 return <details className="demo-tools" open><summary><span>◈ 模拟工具</span><small>仅改变本地演示场景</small></summary><p>想体验下一档？先点「补齐本档 NFT」，再回到卡片挑战。</p><div className="tool-buttons"><button onClick={()=>call(()=>adapter.supplyNextTier(),'已补齐当前档位测试 NFT；这不是实际游戏奖励。')}>＋ 补齐本档 NFT</button><button onClick={()=>call(()=>adapter.reset(),'已重置模拟钱包与进度。')}>↺ 重置演示</button><button onClick={()=>call(()=>{adapter.failure='reject';},'下次操作模拟用户拒签。')}>模拟拒签</button><button onClick={()=>call(()=>{adapter.failure='receipt';},'下次操作模拟交易失败。')}>模拟失败</button><button onClick={()=>call(()=>adapter.switchWallet(),'已切换到另一个模拟钱包。')}>切换钱包 A/B</button><button onClick={()=>call(()=>adapter.topUp(),'已补充 1,000 模拟 USDT。')}>补充模拟 USDT</button></div><details><summary>高级测试场景（刷新恢复）</summary><div className="tool-settings"><label><input type="checkbox" checked={eligible} onChange={e=>call(()=>adapter.setEligibility(e.target.checked),'已更新模拟 .ai 资格。')}/> 持有 .ai ID</label><label>全局奖励阶段 <select aria-label="模拟全局阶段" value={stage} onChange={e=>call(()=>adapter.setStage(Number(e.target.value)),'已切换全局奖励场景。')}>{Array.from({length:10},(_,i)=><option key={i+1}>{i+1}</option>)}</select></label><label>全网已售 Star <input aria-label="模拟已售 Star" type="number" min="0" max="100000" value={sold} onChange={e=>call(()=>adapter.setSold(Number(e.target.value)),'已更新模拟销售计数。')}/></label></div></details><div className="tool-foot"><span>模拟余额 · {usdt} USDT</span><span role="status">{note}</span></div></details>;
}
function App(){
 const adapter=useMemo(()=>new MockAdapter(),[]);
 return <main className="chat-shell"><header className="chat-header"><div className="agent-avatar"><img src={new URL('../public/three-shape-logo.jpg',import.meta.url).href} alt="Three Shape logo"/></div><div><strong>Three Shape 卡片预览</strong><small>Agentic Wallet 接入前的模拟展示</small></div><span className="preview-tag">模拟预览</span></header><div className="chat-date">卡片测试容器 · 非币安官方界面</div><section className="chat-messages" aria-label="卡片嵌入效果"><div className="message assistant"><p>此处仅演示游戏卡片；正式聊天入口与钱包授权由宿主平台提供。</p><div data-message-id="three-shape-card"><ThreeShapeCard mode="mock" adapter={adapter}/></div><Tools adapter={adapter}/></div></section><p className="chat-caption">未接入 Binance Agentic Wallet · 不产生真实交易</p></main>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
