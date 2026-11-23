# 游戏逻辑／合约／前端接口匹配核对（2026-11-09）

**结论：核心规则可匹配；本地编译 ABI 已逐项校验，但真实链上绑定尚未完成，当前网站不能直接执行真实游戏。**

本轮不改生产 Solidity、奖励、定价或 LP。用户已明确接受既有 LP 初始化取舍，要求保留第一笔购星触发首次加池；不再因该项建议改变流程。

## 本轮已核实一致

- 三档分别烧毁 3／6／9 枚；普通水果同种且至少一枚；第一档允许 Star，后两档至少 1／3 Star。
- 每钱包只领一档；继续不兑现上一档；份额只在领奖时消耗。
- 全局十阶段、总份额 55,000；第一档 100 万，第二／三档随阶段递减。
- Star 每 1,000 枚涨价 2 USDT、总销售 100,000、每钱包累计购买 6 枚。
- NFT 类型、Token 的 18 位精度及 USDT 必须按实际 decimals / usdtUnit 处理。
- 五个游戏写操作检查当前 .ai 持有余额；Meta/收藏只读数据不构成钱包授权。

验证依据：local-interface-map.json 的每个读／写函数和事件都在实际 solc 产物 ABI 中找到；Ganache 实读核对十个阶段与三档奖励、全局额度和价格边界。该 JSON 是本地源码映射表，不是最终网络 ABI，也没有被用来启用网站 Live。

## 调用映射

| 前端业务方法 | 当前源码实际接口 | 接入要求 |
| --- | --- | --- |
| connectWallet | 无 Solidity 方法 | 官方用户钱包会话，核对地址与 chainId=56；不伪造连接 |
| getGameState | state / freeClaimed / ended / remainingShares / currentStage / starsSold / starsBought；Registry.balanceOf | 同一链、同一钱包和一致区块上下文 |
| play | claimFree() 或 burnForTier(uint256[]) | 依据准备操作 kind 决定；链上没有 play() |
| preparePlay | 收藏索引、ownerOf / kind / canBurn | 先只读验证，确认后烧毁；canBurn 对无效 ID 可能回退 |
| getRewardState | Choice 状态 + currentReward(tier)；Settled 查 Claimed | ended 后 currentReward 会回退，不能继续无条件查询 |
| claimReward | claimReward(uint256 minAmount) | 传入用户看到并确认的原始整数金额，不默认用 0 跳过保护 |
| continueChallenge | continueChallenge() | 只允许 Choice1／Choice2；不自动烧下一档 NFT |
| quoteStars | quoteStars(quantity) | 纯读报价，不进行签名或资金授权；钱包额度／身份资格须另查 |
| buyStars | USDT.allowance／必要时 approve，再 buyStars(quantity,maxPayment) | 授权与购星按官方钱包流程；等待实际所需交易确认 |
| getCollection | NFT Transfer 日志 + ownerOf／kind／tokenURI | 非 ERC721Enumerable，不能调用不存在的 tokenOfOwnerByIndex |
| getTokenBalance | Token.balanceOf(address) | 大整数不转浮点数 |
| transferNFT | safeTransferFrom(from,to,tokenId) | 官方 .ai 解析、收件确认、当前所有权与钱包签名 |

Matched、Claimed、StarsPurchased、LPAttemptFailed、Liquidity.Added 和 NFT.Transfer 已按本地实际 ABI 核对。解析时必须同时核对日志发出地址、当前链、玩家、交易及部署范围，不能只按事件名认领结果。

## 关键数据出入与处理

### 1. Settled 不保留最终奖励档位

合约 State 为：0 Ready1、1 Choice1、2 Ready2、3 Choice2、4 Ready3、5 Choice3、6 Settled。进入 6 后，单靠 state(address) 无法知道领取了第几档。

Adapter 必须用该玩家的确认 Claimed 事件恢复 tier／stage／amount，不能把所有 Settled 都当第三档。否则“第三档领奖后关闭购星”和个人进度会出错。新增 decodeGameState 辅助函数：Settled 缺少可靠 tier 时直接拒绝推断。

实际链上还允许玩家先收到他人转来的水果、未免费领取便挑战／领奖。已通过虚拟链验证此路径；前端主按钮现在优先处理 choice／settled，避免被 freeClaimed=false 错误覆盖。免费领取次数与个人奖励状态是两个维度，UI 顺序不能当作链上限制。

### 2. 收藏没有内置所有权枚举

NFT 继承普通 ERC721。getCollection 需要从部署块开始索引 Transfer（包括 mint、用户转移和 burn），按当前所有权复核，并解析链上 Base64 JSON。可由 Adapter 内的索引器／只读服务器提供。当前轻量服务没有实现该索引，不能用 UI 的九个静态占位图标代替链上持仓。

### 结果 Emoji 需要真实交易上下文

Game 没有随机开奖函数，也没有携带水果列表的 Result 事件。免费领取的结果可根据确认回执中的 NFT.Transfer 铸造日志与 tokenURI 恢复；销毁结果则要结合已确认 burnForTier 交易参数、Transfer 到零地址及 Matched 事件核实。

burnMatch 会删除 kind，已销毁 tokenURI 也会回退。因此不能在销毁后再读这些 token 的当前元数据来生成结果。Adapter 需要保留准备时的链上元数据快照并在回执后验证，或使用相关历史记录；刷新恢复也需要这套上下文。动画不能补造结果。卡片三个展示槽与一档实际销毁 3／6／9 枚的清单是不同展示维度，不能漏记实际销毁数量。

### 3. 领奖最低金额参数原先没有向下传递

现为业务接口增加兼容的可选 minAmount，卡片和文字状态管理在点击领奖时传入快照中的 reward.amount，ContractAdapter 原样转交绑定。真实 ABI 绑定必须将它用于 claimReward(uint256)，不得自行改成 0 或用未重新确认的新报价替换。

### 4. 购星与 LP 回执需要分开

buyStars 的交易 status=1 只代表购星交易成功。LP 可单独成功、失败或尚未核实。

已增加 TransactionReceipt.liquidity='added'|'failed'|'unknown'，前端分别展示，刷新恢复也保留该结果；不因 LP 未完成而回滚已经确认的购星状态。真实绑定仍需从实际 Game／Liquidity 日志解析该字段；本轮没有把本地测试结果当成 Live 解析实现。

### 5. 确认后读取失败不保留旧的可操作状态

已确认交易改变状态、随后 RPC 刷新失败时，前端会清空旧快照并保留确认回执，不继续用旧余额／旧资格开放操作；刷新只重新读取，不重发交易。

### 6. 已补齐前端的额度边界

- 全局 sold=100000 后关闭购星及结构化 buyStars 动作。
- 数量选项按 min(钱包剩余购买额度，全局剩余销售量) 收紧。
- 保留用户指定的“累计购满 6 枚或第三档领奖后关闭入口”；这是展示策略，不新增链上限制。
- 全局奖励份额耗尽与 Star 售罄是独立条件，不错误地把奖励结束当成 Star 售罄。

## 真实接入仍缺少的部分

1. ContractAdapter 仍是业务绑定转发器，没有 ethers/viem 合约实例或官方钱包桥。网站 readiness=unconfigured 与禁用按钮符合当前真实状态。
2. 需要最终 ABI、Game/NFT/Token/Reserve/Liquidity/Pair 的部署地址及部署块，并复核 Game 的依赖地址与各合约的 immutable 关联、Registry／Treasury／USDT／Router 配置一致；root config 目前只有网络与 Registry／Treasury／USDT／Router 公开依赖。
3. 需要 NFT 事件索引、Claimed 最终档位恢复、领取／销毁结果快照恢复、LP 独立结果解析、真实 metadata 解析。上面的函数名经本地 ABI 验证，不等于真实网络绑定已实现。
4. 需要实际 USDT allowance／approve 流程、用户钱包签名、拒签与必要确认处理。绑定需区分明确拒签、已挖出的 status=0 回执与 RPC 结果未知，不能把所有库异常当成同一种失败。接口允许 Adapter 内按真实流程编排，不由 UI 猜测交易数量。
5. 需要在每次准备／提交前验证钱包和链；当前 subscribe 会使准备状态失效，但链号核验仍要由真实绑定实现。持久化待核实交易当前按钱包地址标记，正式接入时还需限定网络与部署上下文，避免跨网络／跨版本混淆。
6. getGameState／getCollection／getRewardState／balance 应使用一致区块快照或明确的一致性策略；不能把互相矛盾的跨块结果拼成一份权威快照。
7. 官方 .ai 解析与 NFT 签名流程仍未接通；服务器只读接口也没有注入实际链上 reader。MCP Apps 只读扩展边界保留，不代表 Binance 当前开放 UI 扩展。

因此，当前结论是“接口设计可适配、主要数据边界已补齐”，不是“只放入 ABI 文件就自动完成真实游戏”。后续补绑定与索引即可复用卡片，无需重做 UI。

## 本轮验证

- 本地 ABI／链上接口核对：3/3。
- 前端／Adapter／双语／匹配与回执回归：63/63。
- TypeScript、Vite、生产资源隔离检查：通过。
- 生产 Solidity SHA-256 未变；本轮没有部署／发送真实交易，没有重复已完成的安全或 BSC Fork 检查。
- 真实钱包、真实网络 ABI 对接和跨网络恢复验收：未完成。网页保持待接入状态，不恢复模拟工具或虚构结果。
