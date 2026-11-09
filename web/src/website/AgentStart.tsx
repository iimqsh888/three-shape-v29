import {useState} from 'react';
export function AgentStart(){
 const skillUrl=new URL('./skills/three-shape/SKILL.md',window.location.href).href;
 const instruction=`请下载并阅读 Three Shape Skill：\n${skillUrl}\n按纯文字 + Emoji 流程带我玩。先查询钱包和合约状态；任何链上操作先预览并等待我确认。未接入真实合约时，只使用明确标记的模拟模式。\n如链接无法访问，请让我上传下载好的 SKILL.md。`;
 const [note,setNote]=useState(''),[copying,setCopying]=useState(false);
 const copy=async()=>{setCopying(true);try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(instruction);setNote('已复制，粘贴给你的 Agent 即可。');}catch{setNote('请长按或选中上方指令复制。');}finally{setCopying(false);}};
 return <section className="agent-start" aria-label="Agent 游戏指令"><h2>从这里开始</h2><textarea aria-label="复制给 Agent 的指令" rows={6} readOnly value={instruction} onFocus={e=>e.currentTarget.select()}/><div className="agent-start-actions"><button disabled={copying} onClick={()=>void copy()}>{copying?'正在复制…':'复制给 Agent'}</button><a href={skillUrl} download="SKILL.md">下载 Skill</a></div>{note&&<p role="status">{note}</p>}</section>;
}
