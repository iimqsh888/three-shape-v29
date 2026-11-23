# 水果市场交付报告 — Sites 最终基线

用户已明确指定 Sites 源码为最终版本。基线是预览项目 `appgprj_6aefbcb1e6348191ab4e466f37b80ab2` 的 v24，源码提交 `1325028d50238026b09b1c562aec90daa0f7dea1`。PR #2 直接以未经修改的 `sites-v24-baseline` 为对照，只展示独立市场与最小前端接入差异；整套源码同步不属于这个 PR 的差异。

**不修改其他合约和规则。** 原有 Game、Token、NFT、Reserve、Liquidity、部署工厂、季赛合约和谜题规则的差异为零。逐字节比对的 20 个既有 contracts/puzzle 文件全部一致。GitHub main 和 Sites 源码 main 均未修改或合并。

## 文件与架构

完整清单见 `fruit-market-files.json`；仅列出相对未经修改 Sites 基线的市场修改。

新增市场文件：
- `contracts/ThreeShapeFruitMarketV29.sol`：永久 Star 激活、托管上架、取消及 3SHAPE 原子结算。
- `contracts/test/MarketActorsV29.sol`：恶意接收与重入测试钱包。
- `web/fruit-market.html`、`web/market.mjs`、`web/market.css`、`web/market-model.mjs`、`web/market-config.mjs`：静态市场页面、钱包交互、精确金额与有界分页。
- `web/src/components/FruitMarketPortal.tsx`：正式复用原首页季赛入口样式的市场按钮。
- `web/src/test/fruit-market-portal.test.tsx`、`test/market.evm.test.mjs`、`test/market.model.test.mjs`、`test/ui/market*.spec.mjs`、`playwright.config.mjs`：测试。
- `scripts/build-market.mjs`、`scripts/package-static.mjs`：构建市场资源并打包原静态网站。
- `agent/market.mjs`：提示辅助函数，没有新 Agent 系统。
- 本报告、架构文档、文件/验证清单和 `reports/fruit-market/` 中当前执行记录。

修改：
- 原 `ThreeShapeCard.tsx`：仅新增市场入口 import 和插入位置；`MysteryPortal`、季赛组件及其 CSS 未改。
- 原 `AgentStart.tsx`、中英文 `skills/three-shape/SKILL*.md`：复用复制指令及下载 Skill 流程，补充市场操作、缺价询问与确认要求。
- `web/src/test/language.test.tsx`：把九种 NFT 的数量断言限定在原收藏网格内，防止新增市场按钮中的 Star 文案被误算为收藏按钮；保留九种 NFT 断言。
- `scripts/compile.mjs`：在原编译工具中添加市场和市场测试合约，不改变原编译配置。
- 根/前端 `package.json`、依赖锁文件、`.gitignore` 和 CI：新增市场构建、测试、静态产物；原 CI 工作流保留。

无管理员、手续费、升级代理、救援接口或新中心化服务。Star 激活时实际转入市场，永久保留且不可提取，不属于销毁。购买只用绑定 3SHAPE，付款与 NFT 交付失败时整体回滚。

## 首页与 Agent

市场入口位于九果迷阵正上方，复用相同 `ts-mystery` 类及三段 span/副标题结构，原入口样式不改。浏览器实际检查在 390px 和 1280px 下宽高完全一致，圆角、背景、边框、阴影、字体和 padding 一致，且跳转成功。市场页面沿用预览的浅色卡片与绿色体系。

现有 Agent 是复制指令及 Skill 的宿主接入方式，没有本站自然语言后端。中文 Skill 已覆盖六条需求例句，并指明先查询、补齐参数、展示信息再由钱包确认；没有可靠宿主能力时直接使用市场页面。外部宿主的自然语言端到端执行仍未验证，不声称本站新增了自动路由。

## 实际运行结果

以下仅记录本次在 Sites 最终源码上实际执行的结果；旧 GitHub 基线的 20/1 元数据失败结论已被替换，不适用于当前源码。

| 检查 | 当前结果 |
| --- | --- |
| `npm test` | 27 通过，0 失败 |
| `npm run compile` | 通过，原编译配置；包括市场，检查字节码大小限制 |
| `npm run build:web` | 通过，原 React 网站和市场生成到 `web/dist` |
| `npm run test:market` | 26 通过，0 失败；包含 21 个 EVM 子测试、父测试和 4 个模型/Agent helper 测试 |
| `npm run test:card` | 93 通过，0 失败，11 个文件 |
| `npm run test:ui` | 8 通过，0 失败；包括钱包完整交易流程、入口实际尺寸与跳转、移动及桌面布局 |
| EVM / 安全 / Reserve / 身份 / ABI 兼容 | 28 通过，0 失败 |
| 九果迷阵 gravity / season | 正在收集最终结果 |
| `npm run test:season:fork` | 失败；官方 registry 与真实持有者资格检查通过后发生 `could not coalesce error`，后续检查未通过；公开链发送交易数 0 |
| 核心文件基线比对 | 20 个现有 contracts/puzzle 文件逐字节一致 |

首次前端回归曾因新增按钮含 Star 文案触发宽泛选择器而失败，已按收藏网格收紧测试范围并完整重跑至 93 项通过；没有放宽产品行为断言。Ganache 在当前 Node 环境回退 JS µWS 实现，测试仍实际执行。

## 未验证与阻碍

- Fork 只完成上述一项检查，完整 Fork 未通过；失败记录见 `reports/fruit-market/season-bsc-fork.json`，不能把导入的旧报告作为本次通过证据。
- 市场没有部署；`web/market-config.mjs` 的 NFT/3SHAPE/market 地址留空，需独立验证并在授权部署后配置。未部署 BSC 主网，也不要求重部署原合约。
- 浏览器交易使用本地 Ganache EIP-1193 桥，不等于生产钱包扩展或真实 BSC 市场测试。
- 未进行独立安全审计。标准 ERC-721 不安全 `transferFrom` 无法由接收方拒绝；直接强制转入不会激活或创建订单，也无法取回。正常安全转入均严格校验。
- 最低价/历史只覆盖已加载分页；完整市场比较需加载全部页面。
- 线上 Sites 预览保持原发布版本；此交付是功能分支和 PR，未向 Sites 源码主分支推送或发布，未合并 GitHub main。

[Draft PR #2](https://github.com/iimqsh888/three-shape-v29/pull/2)。远程 CI 已接入，结果需以实际 Actions 为准，不能用本地结果代替。
