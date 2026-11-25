import {useEffect,useState} from 'react';
import {useI18n} from '../i18n';
export function AgentStart(){
 const {language}=useI18n(),en=language==='en';
 const skillUrl=new URL(`./skills/three-shape/${en?'SKILL.en.md':'SKILL.md'}`,window.location.href).href;
 const deploymentUrl=new URL('./api/deployment.json',window.location.href).href;
 const defaultInstruction=en?`I want to play Three Shape. Be my game guide in this chat. Start with a short fruit Emoji panel and give me the next available action. Understand requests like “show my collection”, “can I challenge?” or “claim my reward”.

Rules: Game actions on BSC mainnet (56) require the signing wallet to hold an official .ai Agent ID. An eligible wallet can claim its free fruits once. Stars start at 0.01 BNB, rise by 0.005 BNB per 1,000 sold, and are limited to six purchases per wallet. Read the exact on-chain quote, including price steps. Challenges burn 3, 6 or 9 NFTs. Tiers 1–3 respectively require at least 0, 1 or 3 Stars and at least one ordinary fruit; all ordinary fruits in a set must match. Burns are permanent and reserve no reward share. Each wallet can claim one tier. Continuing forfeits the previous tier's reward opportunity. Check the live stage and remaining shares before a burn or claim. Market activation permanently locks one Star; fruits trade in 3SHAPE.

Read the connected wallet's eligibility and actual game state when tools are available. If this host supports Agentic Wallet, use its official connection flow when I ask. If reads or signing are unavailable, explain what is missing and guide me to the game site. Never invent holdings or transaction results. Preview the exact assets, amount, network and recipient before each write and wait for my confirmation.

Start from these rules immediately. Optional full Skill: ${skillUrl}
Mainnet addresses and ABI: ${deploymentUrl}`:`我想玩 Three Shape。请在这个对话里当我的游戏向导，用简洁的文字和水果 Emoji 给我一个开局面板和下一步。理解我自己的话，例如「看看收藏」「我能挑战吗」「领取奖励」。

玩法：BSC 主网（56）的游戏操作要求交易钱包持有官方 .ai Agent ID。合资格钱包可免费领一次水果。Star 起价 0.01 BNB，每卖出 1,000 枚涨 0.005 BNB，每钱包累计最多买 6 枚。购星以链上精确报价为准，报价可能跨档。挑战分别销毁 3、6、9 枚 NFT，三档至少需要 0、1、3 枚 Star，每档至少一枚普通水果，且所有普通水果必须同种。销毁不可撤回，不预留奖励份额。每钱包只能领一档，继续挑战会放弃上一档领奖机会。销毁和领奖前核对链上阶段与剩余份额。水果市场永久锁定一枚 Star 激活，只用 3SHAPE 交易。

有工具时读取已连接钱包的资格、收藏和游戏状态。若宿主支持 Agentic Wallet，在我要求连接时走官方授权流程。缺少查询或签名能力时，告诉我缺什么并引导我到游戏官网。不要编造持仓或交易结果。每笔链上操作先展示资产、金额、网络和接收方，等待我确认。

请直接按以上规则开始。完整 Skill 可选参考：${skillUrl}
主网合约与 ABI：${deploymentUrl}`;
 const [instruction,setInstruction]=useState(defaultInstruction);
 const [note,setNote]=useState(''),[copying,setCopying]=useState(false);
 useEffect(()=>{setNote('');setInstruction(defaultInstruction);},[defaultInstruction]);
 const copy=async()=>{setCopying(true);try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(instruction);setNote(en?'Copied. Paste it into your Agent.':'已复制，粘贴给你的 Agent 即可。');}catch{setNote(en?'Select and copy the instruction above.':'请长按或选中上方指令复制。');}finally{setCopying(false);}};
 return <section className="agent-start" aria-label={en?'Agent game instructions':'Agent 游戏指令'}><h2>{en?'Start here':'从这里开始'}</h2><textarea aria-label={en?'Instruction for your Agent':'复制给 Agent 的指令'} rows={6} value={instruction} onChange={e=>{setInstruction(e.currentTarget.value);setNote('');}}/><div className="agent-start-actions"><button disabled={copying} onClick={()=>void copy()}>{copying?(en?'Copying…':'正在复制…'):(en?'Copy for Agent':'复制给 Agent')}</button><a href={skillUrl} download={en?'SKILL.en.md':'SKILL.md'}>{en?'Download Skill':'下载 Skill'}</a></div>{note&&<p role="status">{note}</p>}</section>;
}
