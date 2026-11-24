# BSC 自动源码验证

本模块不改动任何 Solidity 经济规则、权限或九果迷阵。当前 Solidity 文件未包含中文注释；编译时检查注释并拒绝新增中文注释，不删除 Emoji／Unicode 字符串。已有字节码比对不是浏览器源码验证，不能据此标记 Verified。

## 编译与永久记录

`npm run compile` 使用现有 solc 0.8.24、optimizer enabled/runs=200、Shanghai，保存：

- artifacts/standard-input.json：所有项目源码及实际导入的依赖内容，完整 Standard JSON Input。
- artifacts/build-info.json：完整 compiler 版本、API 版本、优化／EVM 参数、源码与产物哈希。
- 每个合约的 ABI、构造 ABI、creation/runtime bytecode、immutable 范围及全限定合约名。

部署开始前把编译输入和产物冻结到部署目录 verification/build；后续重试不使用最新 artifacts 代替旧编译。确认部署后，保存 bundle.json、交易哈希、部署地址、区块、从链上 immutable getter 读取的真实构造参数及 ABI 编码。直接部署还逐字节检查创建交易 input；工厂子合约共享其实际创建交易哈希，逐个保存独立地址和构造参数。

自动覆盖 Token、NFT、Game、Reserve、Liquidity Manager、Fruit Market、实际 Deployment Factory，以及该工厂的 Codebook 和五个创建字节码存储合约。未部署的角色明确列入 notDeployed，不虚构市场地址。外部 DEX Router、Pair 或身份 Registry 不会被冒充成项目源码验证目标。

## 人工授权部署后的自动步骤

现有 chain 97 部署工具确认后自动调用 `afterAuthorizedDeployment`。默认仍只执行原部署范围，不额外创建市场。只有维护者明确设置 `THREE_SHAPE_DEPLOY_MARKET=1` 才把独立市场部署纳入本次测试网部署；本次开发测试没有运行该部署命令。

授权部署工具可以复用以下通用回调，支持 chain 56 或 97：

```js
await afterAuthorizedDeployment({manifest, directory, provider});
```

manifest 至少包括 chainId、实际 contracts 地址及 confirmed creation transaction hashes。项目五合约采用已有 `deploy five immutable production contracts` 交易；直接部署采用 `deploy deploymentFactory`、`deploy market` 记录。其他部署程序可使用 contractTransactions 对象明确提供每个角色的交易哈希，market 支持独立地址与交易。不得用待确认或失败交易生成成功部署记录。

部署与源码验证互相独立。验证失败不回滚已完成部署，不触发重新部署。缺 API Key 时保留 ApiKeyMissing 报告及人工上传资料；部署本身仍是已确认状态。

## 独立准备和重试

```sh
npm run prepare:verification -- --manifest deployments/your-release/deployment.json --out deployments/your-release/verification --artifacts original-artifacts
npm run verify:bsc -- --bundle deployments/your-release/verification --chain-id 97
```

通过环境变量设置 ETHERSCAN_API_KEY，勿写入仓库或把密钥放在命令行参数中。可选 BSC_RPC_URL 提供自己的只读 RPC；没有该变量时使用既有 BSC 公开只读节点。代理环境可按 Node.js 标准配置 HTTP 代理。网络必须与保存的 chainId 一致。

`--explorer bscscan` 和 `--explorer etherscan-v2` 都使用官方统一 V2 API：`https://api.etherscan.io/v2/api`，chainid 为 56／97。BscScan 的独立旧 V1 API 不作为回退，旧 BscScan API Key 不能代替 Etherscan V2 Key。API 套餐／链权限问题按真实响应报告，不能声称任何 Key 一定可用。

旧部署如果没有完整输入，必须恢复原始编译资料。当前源码、构造签名或依赖与旧部署不一致时，准备程序会拒绝提交；不能用新代码重新编译后宣称旧部署已验证。不得改动真实历史记录来绕过检查。

## Verified 判定

1. 当前网络和部署 runtime 必须与冻结记录一致。
2. 提交 Standard JSON、全限定名、精确 compiler tag、optimizer、EVM 设置和真实 ABI 构造参数。
3. 轮询 GUID；pending、失败、限流、无效 Key 和套餐问题均保留明确状态。请求和轮询有上限，GUID 可用于下次恢复，已失败 GUID 可重新提交。
4. 即使 checkverifystatus 返回 Pass - Verified 或提示重复验证，仍须 getsourcecode 返回已验证源码和 ABI，且合约名、编译器、optimizer、构造参数及 ABI 匹配，才记为 Verified。只有 similar-match 或空源码不会通过。

不会因本地编译、部署成功、runtime match、API 接受提交、等待超时或 UI 显示完成而记为 Verified。API Key 不写入报告。注入的测试 API 会明确标为 injected-client-test，不能作为真实已验证地址发布。单个合约失败不会阻止其他合约生成结果。

## 输出及人工上传

verification/report.json 与 report.md 保存地址、BscScan 链接、交易哈希和状态。所有实际合约已验证与全部必需角色已验证是两个不同汇总；市场尚未部署时，不会宣称全部必需角色 Verified。

verification/standard-input.json 可直接供 BscScan 的 Solidity Standard JSON Input 方式人工上传。manual/*.json 提供每个地址对应的合约名、编译器、构造参数和验证页面；GUI 的构造参数不含 0x 前缀。冻结资料不可因注释或依赖升级而覆盖。

verification/public/contracts.json 和 public/abi/ 只包含已由浏览器确认的地址／ABI。编译得到但未验证的 ABI 不会被此目录标为 Verified。构建自有静态网站时可设置 THREE_SHAPE_VERIFICATION_DIR 指向完整验证目录，将这份已确认清单发布到 verification/；缺省不会发布已验证地址声明。

## GitHub Actions

`.github/workflows/verify-bsc.yml` 支持手动触发及 workflow_call，从 Secrets 读取 ETHERSCAN_API_KEY，可选 BSC_RPC_URL。它只读链并向验证 API 提交源码，不部署、不签交易、不读取钱包私钥。

可直接验证当前 revision 中保存的 bundle，或通过 deployment_run_id 下载人工授权部署流程上传的 bsc-source-verification artifact。输入 bundle_directory 与 chain_id 必须匹配实际记录。无论结果如何，上传报告及人工备用资料供独立重试；CI 普通测试使用本地模拟 Explorer API，不依赖真实 Key。

## 验证边界

`npm run test:verification` 在隔离 chain 97 Ganache 中真实创建工厂子合约和市场，并通过本地 HTTP 模拟验证 API 测试提交、限流、失败、重复、GUID 恢复和防误标。主网 chainid=56 仅做请求格式测试，不产生主网交易。这不等于已经取得真实 BscScan Verified；真实 Key 和人工授权部署资料准备后才能执行线上验证。

官方参考：[BscScan API](https://bscscan.com/api)、[提交源码](https://docs.etherscan.io/api-reference/endpoint/verifysourcecode)、[查询验证任务](https://docs.etherscan.io/api-reference/endpoint/checkverifystatus)、[查询已验证源码](https://docs.etherscan.io/api-reference/endpoint/getsourcecode)。
