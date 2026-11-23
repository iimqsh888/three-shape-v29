# 规则修订验证记录

日期：2026-11-07。基于 GitHub main 快照 a2d67d02ce88137b18da749ea1e55d3d49460319，按本次对话已确认的规则修改。

## 已实施

1. Star 起价仍为 10 USDT，每累计售出 1,000 枚上涨 2 USDT。销售上限仍为 100,000 枚，共 100 个价格区间，最后单价 208 USDT。
2. claimFree、burnForTier、continueChallenge、claimReward、buyStars 均由 onlyAgent 在执行时检查 registry.balanceOf(msg.sender)>0；canBurn 同步反映持有资格。继续挑战加入重入保护。只读查询及 NFT/ERC20 自身的标准操作不被宣称为 Game 资格门控。
3. NFT name 加入英文类型与编号，保留 Unicode Emoji 和链上 JSON 属性。
4. agent/copy.mjs 和玩法文档不披露内部发放顺序，不使用随机抽奖承诺；花费、奖励、份额、LP、身份门控及风险继续说明。
5. Token 两部分上限、55,000 份额、100,000 星星总量、每钱包累计购星 6 枚、奖励梯度、USDT 80/20 分账、LP 1430万/Star 单次额度与不结转机制未修改。
6. 为恢复可编译性并满足真实 EVM 大小限制，部署工厂使用不可变创建代码存储，预测业务合约地址对应工厂 CREATE nonce 2..6；仅创建者能初始化一次，未添加游戏管理员能力。

## 执行结果

| 检查 | 结果 |
| --- | --- |
| npm run compile | 通过；solc 0.8.24、optimizer 200、Shanghai |
| EVM 代码大小 | 所有产物通过 runtime 24,576 / initcode 49,152 字节限制 |
| npm test | 23/23 通过，含公开文案检查 |
| npm run test:evm | 4/4 通过，正常代码大小限制，未使用 unlimited size |

EVM 覆盖五个入口在无 ID 时拒绝、持有者正常领取和购星、销毁后撤销身份时继续/领奖拒绝且不发奖励、身份恢复后继续、三档分别领取/继续分支、跨千枚报价、末端价格、销售上限、售罄总收入测算、九种元数据实际解码。

价格跨区间测试通过编译器 storageLayout 获取 starsSold 槽位，在隔离定价 fixture 中设置测试边界；它不代表真实卖出了 100,000 枚 Star。三档测试使用 evm_snapshot/revert 分别测试第二档领取与继续，不代表同一钱包可以叠加领取。

工厂 initcode 32,033 bytes、runtime 2,782 bytes。不可变代码簿 initcode 29,090 bytes。所有 ABI/bytecode 均来自本次真实 Solidity 构建，未使用模拟 ABI 替代。

## 收入测算

全售罄总收入 10,900,000 USDT，Reserve 累计流入 8,720,000，Treasury 累计流入 2,180,000。流入不等于 Reserve 期末余额，实际加池按储备比例计算。未使用 USDT 可能在售罄后留存，现有合约没有管理员提取或手动补 LP 入口。

## 限制

- 逐步持有校验不等于按 Agent ID 唯一绑定，也不是完整多钱包防刷保证。
- 省略玩法文案中的发放细节，不会让公开源码或链上状态变得不可分析。
- 当前仓库未包含 React 卡片源码，公开文案模块尚不能代替实际 UI 集成验收。
- 此轮未进行新版 BSC Fork、独立安全审计或主网部署；未广播任何主网交易。
- GitHub main 是否更新、分支发布或 CI 是否通过，应以实际远程记录为准。
