# 售罄结算版：公开测试网与交互接口验证

新版已部署到 BSC Testnet（chainId 97），主网未部署。

| 合约 | 地址 |
| --- | --- |
| Game | `0x7e67eF9Ef352c856b7497A325fa74e43eEBE44C7` |
| Reserve | `0x85E5623d1268152e93A42f0A3E1Ba0C13eCd5d8c` |
| Token | `0x568c4dA7324F6Be81739F70458306b66Cf9B88b2` |
| NFT | `0x525F3fA24156734b53aAeEA815A225340FB56f15` |
| Liquidity | `0x99E6184b07525Fc6b5A7f4fDb261eD2EF2E2009a` |
| Pair | `0xEFD6ebC03A0e039332BCE6c4D56470103ba55479` |

T 仍固定为 `0x19a00449a5af7a51279b401dfe3bf92cb90a2751`。Router、Factory 和 WBNB 为真实 PancakeSwap V2 测试网依赖；身份 Registry 是隔离测试合约，不是官方 .ai ID。

## 验证结果

| 检查 | 通过 | 失败 |
| --- | ---: | ---: |
| 公开链玩家与经济场景组 | 13 | 0 |
| 公开链 Adapter 场景组 | 9 | 0 |
| 已部署代码的隔离 Fork 结算与 Adapter | 4 | 0 |
| 真实链只读 HTTP API | 1 | 0 |
| React／钱包／恢复／双语回归 | 68 | 0 |
| 基础与 HTTP 单元回归 | 27 | 0 |

TypeScript、Vite 构建和生产资源隔离检查通过。七个部署合约的运行字节码与实际编译产物一致，复核了 Reserve / Game / Liquidity / Treasury 的 immutable 关联。未将字节码比对称为 BscScan 源码认证。

公开链测试覆盖免费领取、九种链上 JSON 元数据、NFT 转移、所有权和身份检查、3/6/9 销毁、三档分别领奖、继续不兑现、价格和数量保护、真实初次与后续 LP、钱包切换拒绝旧准备、确认与刷新恢复。维护接口 getReserveState 返回固定 T、余额、关闭标记及结算资格；未售罄调用 settleReserve 在预检阶段被拒绝，没有广播交易。只读 /api/reserve 与部署 ABI 均已核对，HTTP 服务不提供签名或交易提交入口。

Fork 使用已部署合约和真实路由，所有上游 RPC 限为只读；售罄状态、Pair 故障和 T 拒收只注入本地 Ganache：正常最后 LP 后结算、LP 失败后结算、T 拒收后资金保留与重试，以及 Adapter 读取／签名／确认／恢复均通过。**公开链没有真实售出十万枚，也没有在公开链触发售罄结算。**

Fork 扩展测试首次遇到地址校验和大小写断言差异，改为地址不区分大小写比较后四项全部通过；原始尝试记录保留，没有修改合约来绕过断言。

## 测试币账目

- 开始：0.200289655208767 测试 BNB。
- 结束：0.116700266588767 测试 BNB。
- 主钱包净流出：0.08358938862 测试 BNB，包含给受控测试钱包的资金转移。
- 部署实际 gas 费用：0.0014242567 测试 BNB。
- 本轮实际购星支付：0.08 测试 BNB。
- 未超过 0.10 的计划净支出；Fork 不消耗公开测试网钱包资金。

最终公开状态：8 枚 Star、4 次领奖、54,996 份剩余、玩家铸币 1.12 亿、LP 铸币 1.144 亿、Reserve 余额 0、starSalesClosed=false。

## 安全与未验证边界

本轮未发现新增结算权限绕过或重入问题，但不能据此保证“无漏洞”。安全回归通过也可能表示已知问题成功复现，不表示问题消除。

此前用户接受的首次加池储备污染限制仍保留：空 Pair 预先接收 WBNB 并 sync，可能阻断初次 LP；购星仍可成功。当前售罄规则也明确允许最后 LP 失败后余款结算至 T，关闭标记不代表最后 LP 一定成功。

官方 .ai 身份、官方 .ai 名称解析、Agent 宿主 / Agentic Wallet 在 chainId 97 的实际执行未验证；不能把隔离测试 EOA 或 Registry 冒充官方接入。未完成独立安全审计或形式化证明。历史静态托管 托管环境缺少必需的 宿主浏览器工具，浏览器扩展和移动端视觉验收未验证，未绕过其工作流启动替代预览。

部署和回执：`deployments/bsc-testnet-settlement/`。资金账目：`final-state-and-budget.json`。来源及测试日志：`reports/logs/settlement-public-*.log`。
