import {useEffect,useState} from 'react';
import {useI18n} from '../i18n';
export function PostComposer({tier}:{tier:number}){
 const {language,t}=useI18n();
 const draft=(buy=false)=>language==='en'?`[Three Shape ${buy?'Buy':'Trade'}] I am working on challenge tier ${tier} and would like to ${buy?'buy':'trade'} matching fruit NFTs or Stars. Contact me to verify NFT types, quantities and on-chain addresses. Terms are negotiable; no returns are promised.`:`【Three Shape ${buy?'收购':'交换'}】我正在参与第 ${tier} 档水果挑战，想${buy?'收购':'交换'}同种水果 NFT 或 Star。请联系我核对 NFT 类型、数量和链上地址；具体条件协商，不承诺收益。`;
 const [text,setText]=useState(draft()),[note,setNote]=useState('');
 useEffect(()=>{setText(draft());setNote('');},[language,tier]);
 return <details className="ts-post"><summary>{t('生成交换帖／收购帖')}</summary><div className="ts-actions"><button onClick={()=>{setText(draft());setNote('');}}>{t('交换帖')}</button><button onClick={()=>{setText(draft(true));setNote('');}}>{t('收购帖')}</button></div><label>{t('编辑帖子')}<textarea aria-label={t('编辑帖子')} rows={5} value={text} onChange={e=>setText(e.target.value)}/></label><div className="ts-actions"><button onClick={()=>{void navigator.clipboard?.writeText(text).then(()=>setNote(t('已复制'))).catch(()=>setNote(t('复制失败，请手动选择文本复制')));if(!navigator.clipboard)setNote(t('请手动选择文本复制'));}}>{t('复制帖子')}</button><button disabled={!navigator.share} onClick={()=>{void navigator.share({title:'Three Shape',text}).then(()=>setNote(t('已打开系统分享'))).catch(()=>setNote(t('分享已取消或未完成')));}}>{t('系统分享')}</button></div><p role="status">{note||t('仅生成文本，由你选择分享对象并发送。')}</p></details>;
}
