import {useEffect,useState} from 'react';
import {useI18n} from '../i18n';
export function AgentStart(){
 const {language}=useI18n(),en=language==='en';
 const skillUrl=new URL(`./skills/three-shape/${en?'SKILL.en.md':'SKILL.md'}`,window.location.href).href;
 const instruction=en?`Download and read the Three Shape Skill:\n${skillUrl}\nGuide me using text and Emoji. Check the wallet and contract connection first. If the real ABI is not connected, stop and explain what is missing. Preview every on-chain action and wait for my confirmation.\nIf the link is inaccessible, ask me to upload the downloaded Skill file.`:`请下载并阅读 Three Shape Skill：\n${skillUrl}\n按纯文字 + Emoji 流程带我玩。先查询钱包和合约接入状态；真实 ABI 未接入时停止操作并说明缺少的配置。任何链上操作先预览并等待我确认。\n如链接无法访问，请让我上传下载好的 Skill 文件。`;
 const [note,setNote]=useState(''),[copying,setCopying]=useState(false);
 useEffect(()=>{setNote('');},[language]);
 const copy=async()=>{setCopying(true);try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(instruction);setNote(en?'Copied. Paste it into your Agent.':'已复制，粘贴给你的 Agent 即可。');}catch{setNote(en?'Select and copy the instruction above.':'请长按或选中上方指令复制。');}finally{setCopying(false);}};
 return <section className="agent-start" aria-label={en?'Agent game instructions':'Agent 游戏指令'}><h2>{en?'Start here':'从这里开始'}</h2><textarea aria-label={en?'Instruction for your Agent':'复制给 Agent 的指令'} rows={6} readOnly value={instruction} onFocus={e=>e.currentTarget.select()}/><div className="agent-start-actions"><button disabled={copying} onClick={()=>void copy()}>{copying?(en?'Copying…':'正在复制…'):(en?'Copy for Agent':'复制给 Agent')}</button><a href={skillUrl} download={en?'SKILL.en.md':'SKILL.md'}>{en?'Download Skill':'下载 Skill'}</a></div>{note&&<p role="status">{note}</p>}</section>;
}
