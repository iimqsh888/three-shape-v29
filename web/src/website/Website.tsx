import {useMemo,useState} from 'react';
import {ThreeShapeCard} from '../components/ThreeShapeCard';
import {MockAdapter} from '../contracts/adapter/MockAdapter';
import {TextGamePanel} from './TextGamePanel';
import {MockTools} from './MockTools';
import {AgentStart} from './AgentStart';
export function Website(){
 const adapter=useMemo(()=>new MockAdapter(),[]),[wallet,setWallet]=useState<string|null>(null),[tab,setTab]=useState<'card'|'text'>('card');
 return <main className="site-shell"><section id="game" className="site-game"><div className="site-game-main">{tab==='card'&&<ThreeShapeCard mode="mock" adapter={adapter} walletAddress={wallet} onWalletChange={setWallet}/>} {tab==='text'&&<TextGamePanel mode="mock" adapter={adapter} walletAddress={wallet} onWalletChange={setWallet}/>}</div></section>
 <AgentStart/>
 <details className="site-more"><summary>更多入口</summary><nav className="site-tabs" aria-label="游戏呈现方式">{(['card','text']as const).map((t,i)=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{['卡片游戏','文字 + Emoji'][i]}</button>)}</nav><a className="official-entry" href="https://ai.binance.com/" target="_blank" rel="noopener noreferrer">前往币安 AI Pro 登录 ↗</a><p className="site-note">官方跳转不连接本站钱包；当前游戏为模拟模式。</p><MockTools adapter={adapter}/></details>
 {tab!=='card'&&<footer className="site-footer"><p>本项目围绕 Binance Agent ID 的一项长期链上实验，由第三方独立发起，与 Binance 无任何隶属或合作关系。3Shape没有任何实际用途，也不承诺任何价值或收益。</p></footer>}</main>;
}
