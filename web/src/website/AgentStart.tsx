import {useEffect,useState} from 'react';
import {useI18n} from '../i18n';
export function AgentStart(){
 const {language}=useI18n(),en=language==='en';
 const skillUrl=new URL(`./skills/three-shape/${en?'SKILL.en.md':'SKILL.md'}`,window.location.href).href;
 const defaultInstruction=en?`I want to play Three Shape. Please download and read the Skill:\n${skillUrl}\nGuide me with concise text and Emoji panels. Understand my own words, show my collection and challenge status, and help me prepare transfers, Star purchases, NFT burns or reward claims when I ask. Check the network, contract and my wallet capabilities first; if something is unavailable, explain what is missing. Preview every on-chain action and wait for my confirmation.\nIf the link is inaccessible, ask me to upload the downloaded Skill file.`:`我想玩 Three Shape，请下载并阅读 Skill：\n${skillUrl}\n请用简洁的文字 + Emoji 游戏面板带我玩，理解我用自己的话提出的需求，展示收藏和挑战状态，并在我提出需求时准备转赠、购买 Star、销毁挑战或领取奖励。先核对网络、合约和我的钱包能力；缺少接入时说明原因。任何链上操作先预览并等待我确认。\n如链接无法访问，请让我上传下载好的 Skill 文件。`;
 const [instruction,setInstruction]=useState(defaultInstruction);
 const [note,setNote]=useState(''),[copying,setCopying]=useState(false);
 useEffect(()=>{setNote('');setInstruction(defaultInstruction);},[defaultInstruction]);
 const copy=async()=>{setCopying(true);try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(instruction);setNote(en?'Copied. Paste it into your Agent.':'已复制，粘贴给你的 Agent 即可。');}catch{setNote(en?'Select and copy the instruction above.':'请长按或选中上方指令复制。');}finally{setCopying(false);}};
 return <section className="agent-start" aria-label={en?'Agent game instructions':'Agent 游戏指令'}><h2>{en?'Start here':'从这里开始'}</h2><textarea aria-label={en?'Instruction for your Agent':'复制给 Agent 的指令'} rows={6} value={instruction} onChange={e=>{setInstruction(e.currentTarget.value);setNote('');}}/><div className="agent-start-actions"><button disabled={copying} onClick={()=>void copy()}>{copying?(en?'Copying…':'正在复制…'):(en?'Copy for Agent':'复制给 Agent')}</button><a href={skillUrl} download={en?'SKILL.en.md':'SKILL.md'}>{en?'Download Skill':'下载 Skill'}</a></div>{note&&<p role="status">{note}</p>}</section>;
}
