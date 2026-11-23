import {useState} from 'react';
import {SponsorTokenNotice} from './SponsorTokenNotice';
import {useI18n} from '../i18n';
import {makeToken,parseAmount,displayAmount,type Season,type TokenReward} from '../game/seasonDeck';
export function SeasonSponsorForm({season,onFund}:{season:Season;onFund:(title:string,token:TokenReward|null)=>void}){
 const {language}=useI18n(),L=(zh:string,en:string)=>language==='en'?en:zh;
 const [title,setTitle]=useState(''),[enabled,setEnabled]=useState(false),[address,setAddress]=useState(''),[checked,setChecked]=useState(''),[amount,setAmount]=useState(''),[error,setError]=useState('');
 const token=enabled&&checked===address?makeToken(address,amount):null,valid=!!title.trim()&&(!enabled||!!token),paid=season.paidAt!==null;
 const inputChange=()=>{setError('');};
 const check=()=>{if(!/^0x[0-9a-fA-F]{40}$/.test(address)||/^0x0{40}$/i.test(address)){setError(L('请输入有效的非零 BSC 代币合约地址。','Enter a valid nonzero BSC token contract address.'));setChecked('');return;}setChecked(address);setError('');};
 const amountValue=parseAmount(amount),total=amountValue!==null&&amountValue*90n<=(1n<<256n)-1n?displayAmount(amountValue*90n):'—';
 if(paid)return <div className="nf-pool"><strong>{season.title}</strong><p>{L('本季唯一冠名席位已占用，奖励设置已锁定。','This season is sponsored; reward settings are locked.')}</p>{season.token&&<div className="nf-token-summary"><strong>{L('第 11–100 名附加奖励','Extra rewards for ranks 11–100')}</strong><p>{L('每人','Each')}: {season.token.perPerson} {season.token.symbol}</p><p>{L('已存入总量 · 模拟','Deposited total · Demo')}: {season.token.total} {season.token.symbol}</p><p className="nf-address">BSC · {season.token.address}</p><SponsorTokenNotice/></div>}</div>;
 return <form className="nf-sponsor-form" onSubmit={e=>{e.preventDefault();if(valid&&!paid)onFund(title.trim(),token);}}>
 <label>{L('冠名标题','Season title')}<input required value={title} onChange={e=>{setTitle(Array.from(e.target.value).slice(0,16).join(''));inputChange();}} placeholder={L('最多 16 个字符','Up to 16 characters')}/></label><p className="nf-caption">{Array.from(title).length}/16</p>
 <SponsorTokenNotice/><label className="nf-toggle"><input type="checkbox" checked={enabled} onChange={e=>{setEnabled(e.target.checked);inputChange();}}/><span>{L('附加赞助代币奖励 · 可选','Add sponsored token rewards · Optional')}</span></label>
 {enabled&&<div className="nf-token-fields"><div className="nf-row"><strong>{L('第 11–100 名','Ranks 11–100')}</strong><span className="nf-tag">BSC · {L('一种代币','One token')}</span></div><p className="nf-caption">{L('90 个名额，每人相同数量；赞助时提前足额存入。','90 recipients, a fixed amount each; deposit the full total in advance.')}</p>
 <label>{L('代币合约地址（BSC）','Token contract address (BSC)')}<input value={address} onChange={e=>{setAddress(e.target.value.trim());setChecked('');inputChange();}} placeholder="0x…" autoComplete="off" spellCheck={false}/></label><button type="button" onClick={check}>{L('模拟兼容性检查','Simulate compatibility check')}</button>
 {checked===address&&checked&&<p className="nf-caption">{L('检查通过 · 模拟：标准 ERC-20，18 位小数，符号 DEMO。未读取 BSC 链上状态。','Passed · Demo: standard ERC-20, 18 decimals, symbol DEMO. No BSC state was queried.')}</p>}
 <label>{L('每人领取数量','Tokens per recipient')}<input inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);inputChange();}} placeholder="1000"/></label>
 <div className="nf-ad-preview"><div className="nf-row"><span>{L('名额','Recipients')}</span><strong>90</strong></div><div className="nf-row"><span>{L('需存入代币总量','Total token deposit')}</span><strong>{total} DEMO</strong></div><p>{L('计算：每人数量 × 90，使用精确整数换算。','Per-person amount × 90, using exact integer arithmetic.')}</p></div><p className="nf-caption">{L('正式版仅允许兼容名单中的 BSC 代币；先授权，再核验足额到账。这里不执行真实检查或转账。','Live funding will allow approved BSC tokens only, with approval and full-receipt checks. No real checks or transfers here.')}</p></div>}
 <div className="nf-ad-preview"><span className="nf-caption">{L('冠名预览','Title preview')}</span><strong>S{season.id} · {title.trim()||L('你的冠名标题','Your season title')}</strong><p>{L('BNB 奖池','BNB pool')}: {season.id} BNB</p>{enabled&&<p>{L('附加代币总量','Extra token total')}: {total} DEMO</p>}</div>
 {error&&<p role="alert" className="nf-dead">{error}</p>}
 <button className="ts-primary" disabled={!valid}>{L(`支付并冠名 · ${season.id} BNB`,`Fund and sponsor · ${season.id} BNB`)}</button>
 <p className="nf-caption">{L('同一笔交易足额存入 BNB 与可选代币；任一失败整笔回滚。成功后锁定冠名与奖励设置，等待管理者发布棋盘开赛，8 小时后未发布则继续等待。本次仅模拟。','Deposit BNB and optional tokens in full atomically; any failure reverts funding. Success locks the title and rewards until admin publication. After 8 hours, continue waiting. Simulation only.')}</p>
 </form>;
}
