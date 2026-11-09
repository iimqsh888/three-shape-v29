import {useMemo,useState} from 'react';
import {ThreeShapeCard} from '../components/ThreeShapeCard';
import {MockAdapter} from '../contracts/adapter/MockAdapter';
import {TextGamePanel} from './TextGamePanel';
import {MockTools} from './MockTools';
import skill from '../generated/skill';
export function Website(){
 const adapter=useMemo(()=>new MockAdapter(),[]),[wallet,setWallet]=useState<string|null>(null),[tab,setTab]=useState<'card'|'text'|'skill'>('card'),[note,setNote]=useState('');
 const copySkill=async()=>{try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(skill);setNote('已复制 Skill。请在自己的可信 Agent 中阅读／导入，导入不等于钱包授权。');}catch{setNote('无法自动复制，可展开技能文本后手动复制。');}};
 return <main className="site-shell"><section id="game" className="site-game"><div className="site-game-main">{tab==='card'&&<ThreeShapeCard mode="mock" adapter={adapter} walletAddress={wallet} onWalletChange={setWallet}/>} {tab==='text'&&<TextGamePanel mode="mock" adapter={adapter} walletAddress={wallet} onWalletChange={setWallet}/>} {tab==='skill'&&<section className="skill-panel"><h2>把 Three Shape 交给你的 Agent</h2><p>复制并阅读技能文本，在支持技能导入的 Agent 中使用。</p><button onClick={()=>void copySkill()}>复制完整 Skill</button><a href="./skills/three-shape/SKILL.md" download>下载 SKILL.md</a><p role="status">{note}</p><details><summary>阅读完整技能文本</summary><pre>{skill}</pre></details></section>}</div></section>
 <details className="site-more"><summary>更多入口</summary><nav className="site-tabs" aria-label="游戏呈现方式">{(['card','text','skill']as const).map((t,i)=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{['卡片游戏','文字 + Emoji','导入 Skill'][i]}</button>)}</nav><a className="official-entry" href="https://ai.binance.com/" target="_blank" rel="noopener noreferrer">前往币安 AI Pro 登录 ↗</a><p className="site-note">官方跳转不连接本站钱包；当前游戏为模拟模式。</p>{tab!=='skill'&&<MockTools adapter={adapter}/>}</details>
 {tab!=='card'&&<footer className="site-footer"><p>本项目围绕 Binance Agent ID 的一项长期链上实验，由第三方独立发起，与 Binance 无任何隶属或合作关系。3Shape没有任何实际用途，也不承诺任何价值或收益。</p></footer>}</main>;
}
