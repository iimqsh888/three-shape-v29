# Three Shape V2.9

原生 BNB 合约、React + TypeScript 游戏卡片、双语文字 + Emoji Skill、只读轻量服务。卡片保持手机尺寸及浅绿色风格；保留聊天宿主和 MCP Apps 扩展边界。

Star 起价 **0.01 BNB**，每售出 **1,000** 枚上涨 **0.005 BNB**，最后区间 0.505 BNB。每钱包累计最多六枚，总销售十万枚。80% Reserve / 20% Treasury；LP 为 3SHAPE/WBNB。详见 [经济模型](docs/RULES_AND_ECONOMICS.zh-CN.md) 和 [BNB 迁移说明](docs/BNB_CONTRACT_MIGRATION.zh-CN.md)。

## BSC 测试网

Chain ID **97**，仅使用测试 BNB；主网未部署。

| 合约 | 地址 |
| --- | --- |
| Game | `0x3A0Bc1D0a7982F0680e4C4F2dEAc00b945bdF17C` |
| Token | `0xB56fA7318a6A0b1b256a72F1336d0de1c6692680` |
| NFT | `0x2975a4D564c1058c51B693Ec7D11dA3cB72eC2FF` |
| Reserve | `0x4C051bb5d0b8408d2A16799d58115B45e7596ca4` |
| Liquidity | `0xfc2cbc087d48eB628274991E00839FF19104cf7D` |
| Pair | `0x5bAcd39c4aB30ef25B968F6dd021469a48D3C0B9` |

使用真实 PancakeSwap V2 测试网 Router / Factory / WBNB。身份 Registry 为**隔离测试夹具**，不是官方 Binance .ai Agent ID。[部署记录](deployments/bsc-testnet-bnb/deployment.json)保留地址、源码哈希和回执。旧 USDT 部署仅作为历史记录。

## 运行与验证

使用 Node.js 24。

```sh
npm ci
npm --prefix web ci
npm run compile
npm run test:evm
npm run test:security
npm run test:compatibility
npm test
npm run test:card
npm run build:card:testnet
npm run serve:testnet
```

`serve:testnet` 提供网站、双语 Skill、ABI 和真实状态只读 API。服务没有签名器，不接收交易或钱包授权。访问者使用自己的 EIP-1193 钱包签名，核对 chainId 97；测试身份由隔离夹具准备，不在网页提供改资格或补币按钮。

默认 `build:card` 保持正式未配置入口并禁用交易。`build:card:testnet` 在构建时接入上述测试网，无 URL／本地存储模拟开关。MockAdapter 仅在 `web/src/test/fixtures/`，不会进入正式资源。

链上测试脚本会花费测试币并改变状态，不能无检查重跑已有场景。部署脚本限定 chainId 97；复用部署记录时检查源码哈希，拒绝用新源码覆盖旧不可变部署记录。

## 组件与 ABI

```tsx
<ThreeShapeCard mode="live" adapter={adapter} onAction={handleAction} />
```

所有合约调用集中于 `web/src/contracts/adapter/`。EthersThreeShapeAdapter 接收部署配置、Provider 和用户 Signer 回调；InjectedWalletAdapter 管理标准钱包连接及账户／网络事件；ContractAdapter 可用于其他宿主。实际编译 ABI、地址、部署块和九种链上 JSON 元数据在 `web/src/contracts/config/bsc-testnet-bnb.json`。

- 购星使用 payable buyStars(quantity,maxPayment)，msg.value 精确等于确认报价，没有 ERC20 授权。gas 上限覆盖内部 LP 调用；购星和 LP 回执分别核实。
- 收藏索引 Transfer，复核 ownerOf、kind、tokenURI；已领取档位从 Claimed 恢复。历史索引先于一致区块快照，避免长期扫描使读取块过旧。
- 待核实交易按网络、部署和钱包隔离。拒签／明确未广播可重试，未知状态先恢复，禁止自动重发。
- .ai 转送须注入官方解析器。测试网解析未接通时阻止发送，不能虚构映射；底层 NFT 转移按真实 ABI 签名。
- RESULT 仅使用确认回执及链上元数据。已销毁 NFT 在新设备刷新后可能无法恢复历史 Emoji；此时不虚构结果，阶段和奖励仍可从合约恢复。完整历史展示需要索引器或归档节点。

## Agent 接入

下载 `skills/three-shape/SKILL.md` / `SKILL.en.md`。Agent 先核对网络、依赖、规则及当前用户钱包，再按用户确认准备操作。接口为 `/api/rules`、`/api/capabilities`、`/api/deployment.json`、`/api/game?address=…`。

官方 Agentic Wallet 当前文档未列出 chainId 97；普通测试钱包不等于官方 Agentic Wallet。官方 .ai 资格、.ai 解析和 AI Pro 内真实钱包执行仍待环境支持。未宣称币安已开放第三方 React 卡片渲染或 MCP 注册。

## 验证边界

见 [BNB 测试报告](reports/BNB_TESTNET_VALIDATION.zh-CN.md)。此前用户接受的首次加池储备污染限制保持原逻辑，不将接受风险说成修复；详见[历史安全报告](reports/CONTRACT_SECURITY_REVIEW.zh-CN.md)。测试不是独立安全审计，不能保证不存在未知问题。
