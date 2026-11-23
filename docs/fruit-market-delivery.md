# 水果市场交付报告（开发分支，禁止直接主网上线）

## 交付范围

独立市场合约、静态市场页面、钱包操作、链上分页查询、现有 Agent 辅助函数扩展、自动化测试及 CI 已实现。首页原入口和 Agent 对话路由在实际仓库缺失，因此不能声称完整满足首页尺寸一致或自然语言交易接入。详见 [架构与阻碍](fruit-market.md)。

## 文件清单

新增：
- `contracts/ThreeShapeFruitMarketV29.sol`：无管理员、不可升级的独立市场。
- `contracts/test/MarketActorsV29.sol`：拒收 NFT 与重入攻击测试钱包。
- `web/fruit-market.html`、`web/market.css`、`web/market.mjs`：静态页面及钱包流程。
- `web/market-config.mjs`：待填写的已验证部署地址；默认不允许交易。
- `web/market-model.mjs`：精确金额及筛选排序。
- `agent/market.mjs`：复用页面与钱包流程的确认提示辅助函数，无新 Agent 系统。
- `test/market.evm.test.mjs`、`test/market.model.test.mjs`：市场专属 EVM 和数据模型测试。
- `test/ui/market.spec.mjs`、`test/ui/market-wallet.spec.mjs`：浏览器测试。
- `playwright.config.mjs`、`package-lock.json`：测试配置与依赖锁定。
- `docs/fruit-market.md`、本报告。

修改：
- `package.json`：市场编译、测试、浏览器测试及静态构建命令；添加构建与测试依赖；CLI 开启优化。
- `.github/workflows/ci.yml`：市场测试、浏览器测试与静态预览 artifact；前面步骤失败仍继续收集后续检查，整体任务仍然失败。
- `.gitignore`：忽略生成的 bundle 和测试输出。
- `test/evm.integration.test.mjs`：仅编译配置启用 viaIR，未删除或放宽原有断言。

原有两个核心 Solidity 源文件与原 Agent 函数均未修改。未部署任何网络、未合并主分支。

## 实际验证结果

| 命令 | 结果 |
| --- | --- |
| `npm run compile` | 通过，solc 0.8.24，优化编译核心、部署工厂及市场 |
| `npm run build:web` | 通过，生成静态 ESM bundle |
| `npm run test:market` | Node 报告 26 通过、0 失败：21 个 EVM 子测试、1 个父测试及 4 个模型/Agent 辅助函数测试 |
| `npm test` | 原有 Node 测试 20 通过、1 失败 |
| `npm run test:evm` | 原有 EVM 集成测试 0 通过、1 失败；执行到 NFT metadata 名称断言失败 |
| `npm run test:ui` | 6 通过、0 失败，包含本地链上的激活→上架→切换钱包→购买→刷新恢复，以及移动/桌面布局 |
| `git diff --check` | 通过 |

市场测试覆盖激活/锁定、权限、审批、重复上架、八种水果交易、金额、取消、过期订单状态、自买、expectedPrice、余额/授权不足、原子结算、拒收回滚、重入与并发购买。测试使用现有真实 NFT 和 Token 合约，不以替代 NFT 假设兼容性。

浏览器测试使用本地 Ganache 钱包桥接，不等于真实 BSC 钱包扩展测试。Ganache 的 µWS 原生模块与当前 Node 版本不匹配，回退 JS 实现；市场测试仍实际运行通过。

## 失败原因及未验证项

原有 `NFT metadata name includes human-readable fruit name` 断言要求名称拼接水果名称，但受保护 NFT 合约实际返回 `Three Shape #编号`。原 EVM 测试同样要求 Star 名称包含 `Star`。这些断言在市场开发前的核心实现上已经不匹配；未为通过测试而修改核心 NFT 或弱化断言。原 EVM 测试在此失败后，后续 Game 场景没有执行，不能宣称完整回归通过。

CLI 原始未优化编译存在工厂 Stack too deep；开启优化后通过。原 EVM standard-JSON 编译也出现栈深度问题，启用 viaIR 后执行到上述断言。

未验证：真实 BSC Fork（无指定 RPC 和验证后的部署地址）、生产钱包扩展、真实部署 ABI/地址、九果迷阵赛季回归（代码不存在）、原首页入口位置/尺寸（代码不存在）、六条中文 Agent 指令的端到端路由（路由不存在）、独立安全审计。当前不应声明可主网上线。

## 安全及部署阻碍

部署时必须绑定已验证的现有 NFT 与 3SHAPE 地址。页面也核对市场绑定地址；默认配置为空，不会猜测地址。只有标准 ERC-721 safeTransfer 回调可阻止意外入账；用户直接使用不安全的 transferFrom 强制转入 NFT 无法由接收合约拒绝，也不会获得资格或订单，且无法找回。Star 永久锁定没有任何救援接口。

无手续费、无管理员、无升级代理、无后端、无私钥托管。订单分页最多 100 条，最便宜和历史仅针对已加载订单，加载全部分页才代表全市场。原首页和对话层需在获得真实源代码后完成接入。

## Pull Request

待推送功能分支后记录链接；保持 Draft，不合并。
