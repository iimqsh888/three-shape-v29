# Three Shape 水果挑战 · V2.9

Three Shape 是一款部署在 BNB Smart Chain 上的水果 NFT 收藏与组合挑战游戏。游戏合约使用 `.ai` Agent ID 验证参与资格。玩家可以领取初始水果、收集同种水果或用 Star 补位，并在完成挑战后选择领取本档奖励或继续晋级。

[官网与交互演示](https://3shape.cc/) · [X @3shapecc](https://x.com/3shapecc?s=11) · [BSC 主网开发分支](https://github.com/iimqsh888/three-shape-v29/tree/feat/bsc-source-verification)

## 现在可以体验什么

- **官网演示**　点击「内嵌卡片交互」，在首页卡片里体验模拟登录、领取、收藏转赠、购星、三档挑战、领奖选择与水果市场。演示使用示例数据，无需连接钱包。
- **链上游戏**　主网合约支持初始领取、购星、销毁组合、晋级和领取奖励。五项操作均由游戏合约检查调用钱包是否持有官方 `.ai` Agent ID。
- **Agent 入口**　从官网点「复制给 Agent」，在支持 BSC 合约查询和钱包签名的 Agent 中粘贴玩法指令。实际交易以用户确认和链上回执为准。公开网页的扫码配对接口已关闭。
- **Agent Mini Apps**　计划探索将收藏、挑战进度和游戏卡片嵌入对话。当前官网提供独立的交互演示。

## 玩法与奖励

每个合资格钱包可免费领取一次初始水果，每次 **3 枚 NFT**，仍需支付网络费。普通水果可以互相交换或通过市场交易，Star 可按档位规则补位。同一档提交的普通水果必须同种，且至少包含 1 枚普通水果。

| 档位 | 本档消耗 | Star 规则 | 奖励 |
| --- | ---: | --- | ---: |
| 第一档 | 3 枚 NFT | 可选 | 100 万 3SHAPE |
| 第二档 | 6 枚 NFT | 至少 1 枚 | 100 万至 1,000 万 3SHAPE |
| 第三档 | 9 枚 NFT | 至少 3 枚 | 1,000 万至 1 亿 3SHAPE |

完成最高档累计消耗 18 枚 NFT。提交挑战会永久销毁所选 NFT，每个钱包最多领取一档奖励。晋级会放弃本档领奖机会。第二、三档奖励随全局阶段变化，实际金额和剩余份额以合约为准。

Star 以 BNB 购买，起价 0.01 BNB，每售出 1,000 枚涨价 0.005 BNB。每钱包累计限购 6 枚，全局最多售出 100,000 枚。[经济模型](https://github.com/iimqsh888/three-shape-v29/blob/feat/bsc-source-verification/docs/RULES_AND_ECONOMICS.zh-CN.md)

### 水果交易市场

市场合约已部署。钱包永久锁定 **1 枚 Star** 后才能上架或购买水果，Star 留在市场合约内且无法取回。买卖普通水果 NFT 使用 **3SHAPE** 结算。官网演示包含市场开通说明，实际操作需要支持相应合约调用的钱包。

### 九果迷阵 · 赛季赛（规划中）

水果迷阵是计划中的独立游戏模块，官网目前展示赛季入口。计划探索复用现有水果 NFT 和 Star，让水果收藏可参与新的迷阵玩法。玩法、赛季规则、奖励和合约方案仍待设计和验证。

## BSC 主网合约

网络为 BNB Smart Chain，Chain ID **56**。

| 合约 | 地址 |
| --- | --- |
| 游戏 | [0xDd127f91943C8a406A1e6577a9313526D950b99E](https://bscscan.com/address/0xDd127f91943C8a406A1e6577a9313526D950b99E#code) |
| 3SHAPE | [0xb347a0D45c84f485dA649cda973b88b1267AF4B2](https://bscscan.com/address/0xb347a0D45c84f485dA649cda973b88b1267AF4B2#code) |
| 3FRUIT NFT | [0xcC819bFcD4F649A425705c6a0219Cd78920fC952](https://bscscan.com/address/0xcC819bFcD4F649A425705c6a0219Cd78920fC952#code) |
| 水果市场 | [0x542B3564794216Eaf5D1f607Aa9E09725D417799](https://bscscan.com/address/0x542B3564794216Eaf5D1f607Aa9E09725D417799#code) |
| SPACE ID Agent ID 注册合约 | [0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F](https://bscscan.com/address/0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F#code) |

主网地址与 ABI 见 [部署配置](https://github.com/iimqsh888/three-shape-v29/blob/feat/bsc-source-verification/web/src/contracts/config/bsc-mainnet.json)。3SHAPE 的玩家奖励与自动加池各由部署时固定的合约限额铸币。Reserve 的最终结算规则见[售罄结算说明](https://github.com/iimqsh888/three-shape-v29/blob/feat/bsc-source-verification/docs/RESERVE_FINAL_SETTLEMENT.zh-CN.md)。

## 一次添加 MCP，在 Agent 内玩

远程服务部署后，官网「复制 MCP 地址」会复制 `https://3shape.cc/mcp`。在支持远程 MCP 的客户端添加该地址一次，再对 Agent 说「打开 Three Shape 游戏卡片」，并提供 BSC 公开钱包地址。支持 MCP Apps 的客户端可显示互动卡片，其他兼容客户端可使用文字工具。

在 Codex 中也可注册该入口：

```sh
codex mcp add three-shape --url https://3shape.cc/mcp
```

MCP 提供链上查询和未签名交易预览。实际交易需由兼容钱包签名并经用户确认。如果客户端没有第三方 MCP 接入入口，可用官网「复制给 Agent」将玩法指令粘贴进对话。

## 本地开发

建议使用 Node.js 24。主网配置和对应测试位于 [`feat/bsc-source-verification`](https://github.com/iimqsh888/three-shape-v29/tree/feat/bsc-source-verification)。

```sh
git switch feat/bsc-source-verification
npm ci
npm --prefix web ci
npm run compile
npm run test:card
npm run test:market
npm --prefix web run dev
```

源码入口为 `contracts/`、`web/` 和 `agent/`。历史测试网使用 Chain ID **97** 和隔离身份合约，详见[测试网部署记录](https://github.com/iimqsh888/three-shape-v29/blob/feat/bsc-source-verification/deployments/bsc-testnet-settlement/deployment.json)。

Three Shape 是独立项目。使用 Agent ID 作为链上身份依赖。
