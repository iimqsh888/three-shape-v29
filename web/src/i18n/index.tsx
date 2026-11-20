import {createContext,useContext} from 'react';
export type Language='zh'|'en';
export const LanguageContext=createContext<Language>('zh');
const english:Record<string,string>={
 '售罄后，Reserve 余款可单独结算给固定 T；最后 LP 失败的余额也包含在内。T 拒收则留存，可重试。':'After sellout, remaining Reserve BNB can be settled separately to the fixed Treasury, including funds retained after the final LP attempt fails. A refused transfer leaves funds available for retry.',
 '此钱包未持有 .ai ID':'This wallet does not hold an .ai ID','待处理交易结果尚未确认，请核实后重试；不会自动重发':'The pending transaction is unresolved. Verify it before retrying; it will not be resent automatically.','请先恢复待核实交易':'Recover the pending transaction first',
 '本钱包已完成领奖，不能重复领取。':'This wallet has already claimed its reward.','奖励份额已耗尽。':'All reward shares have been claimed.','免费领取 3 枚水果，收集后开启挑战。':'Claim 3 free fruit NFTs, then build your challenge collection.','已满足当前档条件，点击开始挑战查看销毁清单；确认后才执行。':'You meet this tier’s requirements. Start a challenge to review and confirm the burn list.','尚未凑齐：普通水果需同种，至少 1 枚；可用 Star 补齐，或生成交换／收购帖。':'Not enough matching NFTs. Keep at least one ordinary fruit; add Stars or create a trade/buy post.','销毁不可撤销；当前查询和销毁都不预留奖励份额。领奖前份额可能被其他钱包用完。':'Burning is irreversible and does not reserve reward shares. Other wallets may claim the remaining shares first.',
 '购星已确认；本次 LP 已完成':'Star purchase confirmed; liquidity added','购星已确认；本次 LP 未完成':'Star purchase confirmed; liquidity was not added','购星已确认；LP 状态待核实':'Star purchase confirmed; liquidity status unresolved',
 '枚 Star · 最高':' Stars · maximum ',
 '第':'Tier ', '档 · 当前可领取':' · Available now','将 1 枚':'Send 1','转赠给':'to','Token 余额：':'Token balance: ',
 'Three Shape 游戏卡片':'Three Shape game card','卡片导航':'Game navigation','开始游戏':'Play','查看收藏':'Collection','查看奖励':'Rewards',
 '等待合约接入':'Awaiting contract','等待真实 ABI 与钱包接入':'Contract and wallet connection coming soon','待接入':'Coming soon','链上':'On-chain',
 '连接钱包开始 →':'Connect wallet →','免费领取水果 →':'Claim free fruit →','本次挑战已完成':'Challenge completed','请选择领取或继续':'Claim or continue','开始挑战 →':'Start challenge →',
 '已持有':'Verified','待验证':'Unverified','好事，凑成三。':'Good things come in threes.','免费领取水果 NFT，挑战最高':'Collect free fruit NFTs. Challenge for up to','1 亿代币':'100M tokens',
 '等待交易确认':'Awaiting confirmation','NFT 展示':'NFT display','等待授权与确认':'Awaiting approval and confirmation','奖励已领取':'Reward claimed','收集你的下一份惊喜':'Collect your next surprise','正在处理…':'Processing…',
 '确认销毁 NFT':'Confirm NFT burn','确认模拟领取':'Confirm simulated claim','确认领取水果':'Confirm fruit claim','取消':'Cancel','确认并继续':'Confirm and continue','确认并请求钱包签名':'Confirm in wallet',
 'NFT ID：':'NFT IDs: ','当前剩余份额：':'Remaining shares: ','领取奖励':'Claim reward','继续挑战 →':'Continue →','继续不兑现旧档奖励；领奖时才消耗份额。':'Continuing forfeits the previous reward. A share is consumed only when claiming.',
 '✓ NFT 已满足本档条件；开始挑战后核对销毁清单。':'✓ NFTs meet this tier’s requirements. Review the burn list before confirming.',
 '点击开始挑战验证当前收藏。若不足，可购买 Star 补齐，或与其他玩家交换。':'Start a challenge to check your collection. Add Stars or trade with other players if needed.',
 '点击开始挑战验证当前收藏。可使用已持有的 Star 补齐，或与其他玩家交换。':'Check your collection. Use Stars you already own, or trade with other players.',
 '用 Star 补齐':'Add Stars','✓ 已领取 · 余额':'✓ Claimed · Balance ','个人挑战':'Your challenge','全局阶段':'Global stage','剩余份额':'Remaining shares',
 '我的水果收藏':'My fruit collection','每一种水果，都是一份小惊喜。':'A little surprise in every fruit.','数量待查询 · —':'Balance pending · —','关闭 NFT 详情':'Close NFT details',
 '每一步，更近一点。':'One step closer.','个全局阶段，金额随成功领奖次数变化。':'; rewards change with successful claims.','当前第':'Global stage ',
 '3 枚 NFT · 至少 1 枚同种水果':'3 NFTs · at least 1 matching fruit','6 枚 NFT · 至少 1 枚 Star':'6 NFTs · at least 1 Star','9 枚 NFT · 至少 3 枚 Star':'9 NFTs · at least 3 Stars',
 '每钱包仅领取一档，奖励不叠加。销毁不预留份额。':'One reward tier per wallet. Rewards do not stack. Burning does not reserve a share.','模拟 Token 余额：':'Simulated token balance: ',
 '🌟 购买 Star':'🌟 Buy Stars','点亮下一档挑战':'Light up your next challenge','0.01 BNB 起，每售出 1,000 枚上涨 0.005 BNB。每钱包累计最多购买 6 枚。':'Starts at 0.01 BNB, rising by 0.005 BNB per 1,000 sold. Up to 6 purchases per wallet.',
 '购买数量':'Quantity','购买 Star 数量':'Star quantity','查看报价':'Get quote','本次仅模拟余额与收藏，不执行真实授权或 LP。':'Simulated balances only; no real approval or liquidity transaction.',
 '操作需用户钱包签名，以链上回执确认结果。':'Wallet approval is required. Results depend on confirmed on-chain receipts.','确认模拟购买':'Confirm simulated purchase','确认购买并请求钱包签名':'Confirm purchase in wallet',
 '操作未完成':'Operation not completed','重试 / 刷新状态':'Retry / refresh','模拟交易':'Simulated transaction','交易':'Transaction','刷新状态':'Refresh',
 '查看玩法与费用':'Rules and fees','免费领取、销毁、继续、领奖和购星均需持有 .ai ID。免费领取仍有 gas 成本。':'An .ai ID is required to claim fruit, burn, continue, claim rewards or buy Stars. Free claims still cost gas.',
 '三档独立销毁 3 / 6 / 9 枚 NFT。第一档允许 Star 补齐，三档都至少含 1 枚普通水果且普通水果必须同种；后两档分别至少含 1 / 3 枚 Star。走完三档共销毁 18 枚 NFT。':'Burn 3 / 6 / 9 NFTs independently. Stars may substitute in tier one. Every tier requires at least one ordinary fruit, and all ordinary fruits must match. Tiers two and three require at least 1 / 3 Stars. The full path burns 18 NFTs.',
 '总奖励份额 55,000；实际领奖金额随全局十阶段变化。成功销毁后仍可能因份额耗尽无法领奖。':'There are 55,000 reward shares across ten global stages. Rewards vary by stage. Shares may run out even after a successful burn.',
 'Token 玩家与 LP 铸币上限各 1.43 万亿。Star 总量 100,000，最高价格 0.505 BNB。':'Player and LP minting caps are 1.43 trillion tokens each. Star sales are capped at 100,000, with a final price of 0.505 BNB.',
 '每枚 Star 本笔最多解锁 1,430 万 Token 的 LP 额度；未用额度立即过期，未用 BNB 保留。购星和 LP 结果应分别核实；LP 凭证发送至销毁地址。':'Each Star unlocks up to 14.3M tokens for that purchase’s LP minting. Unused allowance expires; unused BNB remains. Verify purchases and liquidity separately. LP tokens go to the burn address.',
 '本项目围绕 Binance Agent ID 的一项长期链上实验，由第三方独立发起，与 Binance 无任何隶属或合作关系。3Shape没有任何实际用途，也不承诺任何价值或收益。':'An independent, long-term on-chain experiment around Binance Agent ID. This project is not affiliated with or partnered with Binance. 3Shape has no practical utility and promises no value or returns.',
 "九果迷阵 · 赛季赛":"Nine-Fruit Maze · Seasonal Challenge",
 "待开启":"Coming soon",
 "九果迷阵 · 赛季赛 V1 规则":"Nine-Fruit Maze · Seasonal Challenge V1 Rules",
 "规则预览，赛季尚未开启。":"Rules preview. The season is not open yet.",
 "固定障碍 🌟，不可移动、不可消除。":"Fixed 🌟 obstacles cannot be moved or cleared.",
 "有限步数，开启前预锁代币。":"Moves are limited. Tokens are locked before starting.",
 "每次有效移动消耗 1 枚 3SHAPE。":"Each valid move costs 1 3SHAPE.",
 "游戏期间步数累计，结束统一链上结算并转入币安cz地址。":"Moves accumulate during the game. At the end, settlement takes place on-chain and the tokens are transferred to Binance CZ’s address.",
 "前 10名有效通关者获得 BNB。":"The first 10 players with valid completions receive BNB.",
 "冠军独得 30%，第 2–10名平分 70%。":"The champion receives 30%; places 2–10 share the remaining 70% equally.",
 "赛季奖池 S1 为 1 BNB，S2 为 2 BNB，依次递增。":"The season prize pool is 1 BNB for S1, 2 BNB for S2, increasing by 1 BNB each season.",
 "九种收藏始终是入场门槛。":"All nine collectible types remain an entry requirement.",
 "上赛季通关勋章作为下一赛季资格。":"The previous season’s completion medal qualifies a player for the next season.",
 "所有通关者获得不可转让勋章。":"All players who complete the maze receive a non-transferable medal.",
 "Agent 负责解题交互，合约负责验证结果。":"The Agent handles puzzle-solving interaction; the contract verifies the result.",
 '接收方 .ai 名称':'Recipient .ai name','输入 .ai':'Enter .ai name','正在识别接收方…':'Resolving recipient…','接收方已就绪':'Recipient ready','转赠':'Send','转赠二次确认':'Confirm NFT transfer','此操作不可撤回':'This action cannot be undone','确认转赠':'Confirm transfer',
 '请输入有效的 .ai 名称':'Enter a valid .ai name','尚未配置官方 .ai 解析接口':'Official .ai resolution is not connected','接收方尚未绑定有效钱包':'No valid wallet is bound to this recipient','接收方信息已变化，请重新输入 .ai 名称后确认':'Recipient changed. Enter the .ai name again and reconfirm.',
 '生成交换帖／收购帖':'Create a trade / buy post','交换帖':'Trade post','收购帖':'Buy post','编辑帖子':'Edit post','复制帖子':'Copy post','系统分享':'Share','已复制':'Copied','复制失败，请手动选择文本复制':'Copy failed. Select and copy the text manually.','请手动选择文本复制':'Select and copy the text manually.','已打开系统分享':'Sharing opened','分享已取消或未完成':'Sharing cancelled or incomplete','仅生成文本，由你选择分享对象并发送。':'Text only. You choose where to share it.',
 'ⓘ 以链上状态为准 · 交易须用户钱包签名':'ⓘ On-chain state is authoritative · Wallet approval required',
 'ⓘ 本地模拟 · 无真实资产 · 未经链上验证':'ⓘ Local simulation · No real assets · Not verified on-chain','● 模拟模式':'● Simulation'
};
export function translate(text:string,language:Language){
 if(language==='zh')return text;
 if(english[text])return english[text];
 return text.replace(/，选择领取或继续。/g,'. Claim or continue.').replace(/第 (\d+) 档匹配已确认/g,'Tier $1 match confirmed').replace(/第 (\d+) 档 · 当前可领取/g,'Tier $1 · Available now').replace(/已收藏 · ×(\d+)/g,'Collected · ×$1').replace(/未收藏 · ×0/g,'Not collected · ×0').replace(/ · 断开/g,' · Disconnect').replace(/^转赠 /,'Send ').replace(/^将 1 枚 (.+) 转赠给 /,'Send 1 $1 to ').replace(/ 枚 Star · 最高 /,' Stars · maximum ');
}
export function useI18n(){const language=useContext(LanguageContext);return {language,t:(text:string)=>translate(text,language)};}
