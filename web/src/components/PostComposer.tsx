import {useState} from 'react';
export function PostComposer({tier}:{tier:number}){
 const draft=(kind:string)=>`【Three Shape ${kind}】我正在参与第 ${tier} 档水果挑战，想${kind==='交换'?'交换':'收购'}同种水果 NFT 或 Star。请联系我核对 NFT 类型、数量和链上地址；具体条件协商，不承诺收益。`;
 const [text,setText]=useState(draft('交换')),[note,setNote]=useState('');
 return <details className="ts-post"><summary>生成交换帖／收购帖</summary><div className="ts-actions"><button onClick={()=>{setText(draft('交换'));setNote('');}}>交换帖</button><button onClick={()=>{setText(draft('收购'));setNote('');}}>收购帖</button></div><label>编辑帖子<textarea aria-label="编辑帖子" rows={5} value={text} onChange={e=>setText(e.target.value)}/></label><div className="ts-actions"><button onClick={()=>{void navigator.clipboard?.writeText(text).then(()=>setNote('已复制')).catch(()=>setNote('复制失败，请手动选择文本复制'));if(!navigator.clipboard)setNote('请手动选择文本复制');}}>复制帖子</button><button disabled={!navigator.share} onClick={()=>{void navigator.share({title:'Three Shape',text}).then(()=>setNote('已打开系统分享')).catch(()=>setNote('分享已取消或未完成'));}}>系统分享</button></div><p role="status">{note||'仅生成文本，由你选择分享对象并发送。'}</p></details>;
}
