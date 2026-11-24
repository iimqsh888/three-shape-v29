# Three Shape V2.9

独立开放的链上游戏：原生 BNB 合约、React + TypeScript 游戏卡片、平台无关的双语文字 + Emoji Skill、可选只读服务。卡片保持手机尺寸及浅绿色风格；保留聊天宿主和 MCP Apps 扩展边界。

Star 起价 **0.01 BNB**，每售出 **1,000** 枚上涨 **0.005 BNB**，最后区间 0.505 BNB。每钱包累计最多六枚，总销售十万枚。80% Reserve / 20% Treasury；LP 为 3SHAPE/WBNB。详见 [经济模型](docs/RULES_AND_ECONOMICS.zh-CN.md) 和 [BNB 迁移说明](docs/BNB_CONTRACT_MIGRATION.zh-CN.md)。

## 本次源码新增：主网 .ai 身份约束

BSC 主网构造器仅接受官方 Registry `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`，并要求身份合约已部署。五个游戏写操作仍逐次检查调用钱包的 `balanceOf > 0`。无管理员替换或资格放行。详见 [.ai 身份与 Agent 接入](docs/AI_IDENTITY_AND_AGENT_UI.zh-CN.md)。本次源码尚未重新部署，以下测试网地址仍对应此前的售罄结算版本。

## 售罄结算

销售期间 20% 直接进固定 T、80% 进 Reserve。最后一笔购星的 LP 尝试结束后，任何人可调用 Reserve.settleToTreasury()，将剩余原生 BNB 全部结算给固定 T；最后 LP 失败的留存余额也纳入结算。T 拒收会回滚本次结算，资金留存，可重试。无需管理员，不支持改收款地址或指定提款金额。详见 [结算规则与验证](docs/RESERVE_FINAL_SETTLEMENT.zh-CN.md)。

此前售罄结算版本已重新部署到 BSC 测试网，并验证公开接口与隔离 Fork 售罄结算。新部署记录见 deployments/bsc-testnet-settlement/；原 bsc-testnet-bnb 部署保留为历史，不支持新增结算。

## BSC 测试网

Chain ID **97**，仅使用测试 BNB；主网未部署。

| 合约 | 地址 |
| --- | --- |
| Game | `0x7e67eF9Ef352c856b7497A325fa74e43eEBE44C7` |
| Token | `0x568c4dA7324F6Be81739F70458306b66Cf9B88b2` |
| NFT | `0x525F3fA24156734b53aAeEA815A225340FB56f15` |
| Reserve | `0x85E5623d1268152e93A42f0A3E1Ba0C13eCd5d8c` |
| Liquidity | `0x99E6184b07525Fc6b5A7f4fDb261eD2EF2E2009a` |
| Pair | `0xEFD6ebC03A0e039332BCE6c4D56470103ba55479` |

使用真实 PancakeSwap V2 测试网 Router / Factory / WBNB。身份 Registry 为**隔离测试夹具**，不是官方 Binance .ai Agent ID。[部署记录](deployments/bsc-testnet-settlement/deployment.json)保留地址、源码哈希和回执。旧 USDT 部署仅作为历史记录。

## BSC 自动源码验证

授权部署完成后自动冻结编译输入、真实构造参数和交易资料，逐个提交工厂及其子合约源码，支持 BSC 56／97。独立运行 `npm run verify:bsc -- --bundle <verification目录>` 可重试，无需重新部署。验证成功必须由 BscScan API V2 的已验证源码／ABI 确认，本地编译或 runtime 比对不等同于 Verified。详见 [源码验证说明](docs/BSC_SOURCE_VERIFICATION.zh-CN.md)。

GitHub Actions 从 Secrets 读取 ETHERSCAN_API_KEY；缺少 Key 时保留未验证状态及 Standard JSON 人工上传备用文件。本次没有部署主网或修改合约经济模型。

## 自有服务器静态部署

不启用托管平台专属部署。运行 `npm ci`、`npm --prefix web ci` 后执行 `npm run package:static`，将生成的 `dist-static/` 内容部署到自己的 HTTPS 静态服务器。详细步骤见 [静态部署说明](docs/STATIC_HOSTING.zh-CN.md)。Skill、规则、能力、ABI 和市场资源都从本站相对路径读取，无固定预览域名。

默认产物为未配置正式入口，缺少可信 ABI／部署或用户钱包时不执行交易。测试网可在构建时明确选择，不把测试身份当作官方身份。水果迷阵保留入口和规则预览，页面跳转暂停。

## 运行与验证

使用 Node.js 24。

```sh
npm ci
npm --prefix web ci
npm run compile
npm run test:evm
npm run test:identity
npm run test:identity:fork
npm run test:security
npm run test:settlement
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

所有合约调用集中于 `web/src/contracts/adapter/`。EthersThreeShapeAdapter 接收部署配置、Provider 和用户 Signer 回调；InjectedWalletAdapter 管理标准钱包连接及账户／网络事件；ContractAdapter 可用于其他宿主。实际编译 ABI、地址、部署块和九种链上 JSON 元数据在 `web/src/contracts/config/bsc-testnet-settlement.json`。

- 购星使用 payable buyStars(quantity,maxPayment)，msg.value 精确等于确认报价，没有 ERC20 授权。gas 上限覆盖内部 LP 调用；购星和 LP 回执分别核实。
- 收藏索引 Transfer，复核 ownerOf、kind、tokenURI；已领取档位从 Claimed 恢复。历史索引先于一致区块快照，避免长期扫描使读取块过旧。
- 待核实交易按网络、部署和钱包隔离。拒签／明确未广播可重试，未知状态先恢复，禁止自动重发。
- .ai 转送须注入官方解析器。测试网解析未接通时阻止发送，不能虚构映射；底层 NFT 转移按真实 ABI 签名。
- RESULT 仅使用确认回执及链上元数据。已销毁 NFT 在新设备刷新后可能无法恢复历史 Emoji；此时不虚构结果，阶段和奖励仍可从合约恢复。完整历史展示需要索引器或归档节点。

## 水果交易市场

首页赛季入口上方恢复独立水果市场，访问 `./fruit-market.html`。市场前端来自 `feat/fruit-market-v29` 的 `f87459afc4c00bda3d7a082497e5902151c0fa74`，不再与交换帖入口混淆。市场页面、商铺列表、Star 永久激活说明及上架／购买／取消流程保持该模块原设计。独立市场合约原文件已纳入 contracts/ThreeShapeFruitMarketV29.sol 并做本地合约测试，不部署或修改其规则。

`web/market-config.mjs` 仍未配置市场地址；当前商铺／价格是明确标注的只读布局示例，不能交易，不使用原游戏地址冒充市场地址。主网市场需独立验证部署后配置。原游戏测试网与市场配置相互独立。

构建网站会先生成市场资源；开发入口也会同步生成。`npm run test:market` 验证市场合约、模型与身份显示；以本次实际报告为准。轻量静态服务支持市场配置 `.mjs`，保持只读。

## Agent 接入

下载 `skills/three-shape/SKILL.md` / `SKILL.en.md`。 中英文 Skill 包含自然语言意图转换、Emoji 状态与收藏面板、挑战补齐建议、购买／转赠／销毁／领奖确认、交易进度和恢复反馈。入口指令采用玩家口吻，可编辑自己的需求后复制；导入 Skill 不授予钱包权限。Agent 先核对网络、依赖、规则及当前用户钱包，再按用户确认准备操作。接口为 `/api/rules`、`/api/capabilities`、`/api/deployment.json`、`/api/game?address=…`。

任何支持 Skill 的 Agent 均可读取同一规则；实际查询与交易能力由宿主和用户钱包决定，不依赖特定模型账户或专属工具。缺少工具时只说明规则或准备操作，不伪造链上结果。每笔链上操作先预览并获得用户确认。

新增维护接口 getReserveState / settleReserve 与只读 /api/reserve；结算需单独钱包签名，没有新增卡片管理员按钮。

## 验证边界

本次见 [新版公开测试网报告](reports/SETTLEMENT_PUBLIC_TESTNET.zh-CN.md)；旧版报告仅作历史。此前用户接受的首次加池储备污染限制保持原逻辑，不将接受风险说成修复；详见[历史安全报告](reports/CONTRACT_SECURITY_REVIEW.zh-CN.md)。测试不是独立安全审计，不能保证不存在未知问题。
