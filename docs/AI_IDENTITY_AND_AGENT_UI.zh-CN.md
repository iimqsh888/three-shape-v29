# .ai 身份与 Agent 卡片接入边界

## 合约资格

BSC 主网（chainId 56）固定使用 SPACE ID 官方 Binance Agent ID Registry：`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`。构造器拒绝其他 Registry，且要求目标已有字节码。Registry 是 immutable，没有管理员替换入口。其他网络仍可显式配置隔离测试 Registry，不能将其描述为官方身份。

免费领取、购买 Star、销毁挑战、继续挑战、领取奖励，五个游戏写操作每次直接检查 `registry.balanceOf(msg.sender) > 0`，不依赖网站登录状态、Agent 自述、前端缓存、tx.origin 或用户输入的其他钱包地址。查询数据无需身份。NFT 仍遵循原 ERC721 自由转让规则；售罄后的固定 T 结算仍为独立、公开的维护操作，不改变原有权限。

身份校验验证的是调用钱包持有指定 .ai NFT，不是网站登录，也不判断模型品牌。Agent 使用智能账户执行时，实际调用 Game 的智能账户自身必须持有该身份；服务器中转不能冒用终端用户资格。没有新增代签权限、私钥存储、身份铸造或管理员放行。

官方文档将该身份描述为 soulbound、永久注册。游戏不绑定 tokenId、不锁定身份 NFT，也不增加用户未要求的新资格条件。

## 自建 Grok Agent

如果聊天界面由项目控制，可在消息渲染器中嵌入现有 React ThreeShapeCard。Grok 通过工具调用获取结构化链上状态，界面将其展示成卡片；按钮调用现有 Adapter，交易交给当前用户的钱包授权，等待确认后再刷新结果。不能把模型输出的文字或 JSON 直接当作已结算结果。

如果所谓自建 Agent 只有模型 API、CLI 或第三方消息平台的机器人，则需要对应宿主的 UI 能力。Telegram 可用消息内按钮或独立 Mini App；这不等于任意消息都能渲染 React。使用 Grok 模型本身不会自动提供卡片容器。

## Codex

Codex CLI 可使用 Skill、工具和文字 + Emoji 流程；终端不会渲染本项目 React 卡片。OpenAI 官方 MCP quickstart 将共享工具与可选 ChatGPT UI 分开说明。Codex App Server 源码已有 MCP App UI 的资源和显示偏好字段，但不能由此推断所有已发布 Codex 客户端都开放第三方内嵌 UI。

在支持 MCP Apps 的具体客户端可继续适配现有卡片；需要核实客户端版本、功能开关、UI 资源加载和钱包签名能力。当前保留的 MCP Apps 边界不是已完成注册、托管、钱包桥或端到端验收的声明。未支持的宿主使用文字 + Emoji / 网站卡片入口。

## 验证命令与边界

- `npm run test:identity`：本地构造器约束、无字节码 Registry、五项操作失败关闭。
- `npm run test:identity:fork`：只读获取 BSC 主网状态，在隔离 Ganache 内使用真实 Registry，验证持有者和无身份钱包、五项游戏操作，以及官方身份不可转让。持有者仅在本地被 impersonate；没有真实用户授权或主网交易。DEX 使用本地夹具，本测试不替代真实 DEX Fork 测试。
- 本次修改不升级已部署、不可变的测试网合约。旧部署记录及 ABI 配置继续描述其原始字节码；本次源码需要新部署才能生效。

## 官方来源

- SPACE ID：[Agent ID](https://docs.space.id/agent-id)
- xAI：[工具调用](https://docs.x.ai/developers/tools/overview)
- OpenAI：[MCP server and UI quickstart](https://developers.openai.com/plugins/build/app-quickstart)
- OpenAI Codex：[App Server 的 MCP App UI](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md#mcp-app-ui)
