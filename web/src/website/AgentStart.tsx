import {useEffect,useState} from 'react';
import {useI18n} from '../i18n';
export function AgentStart(){
 const {language}=useI18n(),en=language==='en';
 const siteUrl=new URL('./',window.location.href).href;
 const defaultInstruction=en?`Explain how to play Three Shape in plain text and help me decide what to do next. The game is at ${siteUrl}

🍏 Connect a BSC wallet with an official .ai Agent ID. Each eligible wallet can claim 3 fruit NFTs for free once. Network fees still apply.

🌟 If I need more matching fruit, I can ask the community to trade or sell it, or use Stars to fill missing slots. Help me draft a short trade or buy request if I tell you what fruits I have.

🏆 Challenges permanently burn NFTs. All ordinary fruits used in a challenge must be the same kind, and every tier needs at least 1 ordinary fruit.
• Tier 1: 3 NFTs, Stars optional. Reward: 1 million 3SHAPE.
• Tier 2: 6 NFTs, at least 1 Star. Reward: 1–10 million 3SHAPE.
• Tier 3: 9 NFTs, at least 3 Stars. Reward: 10–100 million 3SHAPE.

Tier 2 and 3 amounts depend on the current global stage. Each wallet can claim one tier only. Continuing forfeits the current tier’s reward, and burning NFTs does not reserve a reward share. Direct me to the game for live amounts and transactions.`:`请用简短的中文告诉我 Three Shape 怎么玩，再根据我手里的水果建议下一步。游戏官网：${siteUrl}

🍏 连接持有官方 .ai Agent ID 的 BSC 钱包。每个合资格钱包可免费领取 3 枚水果 NFT 一次，仍需支付网络费。

🌟 缺同种水果，可以去社区发帖求交换或求购，也可以用 Star 补位。我告诉你手里有哪些水果后，请帮我判断缺什么，必要时帮我写一条简短的换果或求购帖。

🏆 挑战需要永久销毁 NFT。同一档用到的普通水果必须同种，每档至少要有 1 枚普通水果。
• 第一档：3 枚 NFT，Star 可选。奖励 100 万 3SHAPE。
• 第二档：6 枚 NFT，至少 1 枚 Star。奖励 100 万至 1,000 万 3SHAPE。
• 第三档：9 枚 NFT，至少 3 枚 Star。奖励 1,000 万至 1 亿 3SHAPE。

第二、三档的金额随全局阶段变化。每个钱包只能领一档；继续挑战就放弃当前档奖励。销毁 NFT 不预留奖励份额。当前奖励金额和实际操作请到官网查看。`;
 const [instruction,setInstruction]=useState(defaultInstruction);
 const [note,setNote]=useState(''),[copying,setCopying]=useState(false);
 useEffect(()=>{setNote('');setInstruction(defaultInstruction);},[defaultInstruction]);
 const copy=async()=>{setCopying(true);try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(instruction);setNote(en?'Copied. Paste it into your Agent.':'已复制，粘贴给你的 Agent 即可。');}catch{setNote(en?'Select and copy the instruction above.':'请长按或选中上方指令复制。');}finally{setCopying(false);}};
 return <section className="agent-start" aria-label={en?'Agent game instructions':'Agent 游戏指令'}><h2>{en?'Start here':'从这里开始'}</h2><textarea aria-label={en?'Instruction for your Agent':'复制给 Agent 的指令'} rows={6} value={instruction} onChange={e=>{setInstruction(e.currentTarget.value);setNote('');}}/><div className="agent-start-actions"><button disabled={copying} onClick={()=>void copy()}>{copying?(en?'Copying…':'正在复制…'):(en?'Copy for Agent':'复制给 Agent')}</button></div>{note&&<p role="status">{note}</p>}</section>;
}
