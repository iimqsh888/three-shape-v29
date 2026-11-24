# .ai 身份与通用 Agent 交互

## 身份规则

BSC 主网 chainId 56 固定使用官方 Agent ID Registry：`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`。Game 构造器检查 Registry 地址和字节码；该依赖 immutable，无管理员替换或资格放行。

免费领取、购星、挑战销毁、继续和领奖逐次验证 `balanceOf(msg.sender) > 0`。验证的是实际调用钱包持有身份，不是模型品牌、网站登录或某个会话里粘贴的地址。智能账户执行时，该账户自身必须满足资格。

原有 NFT 自由交换、奖励、价格、LP、固定 T 结算及权限保持不变。其他网络的隔离测试 Registry 不代表官方身份。官方身份说明见 [SPACE ID Agent ID](https://docs.space.id/agent-id)。

## 平台无关交互

- Skill 使用通用 Markdown 与名称／描述元数据，兼容能够读取该规范的不同 Agent。
- 默认文字 + Emoji，包括自然语言意图、收藏、挑战、报价、确认、等待、结果及恢复提示。
- 不支持 HTTP／RPC 时只解释规则；缺钱包时只读或准备，不声称交易完成。
- 标准 EIP-1193 或宿主用户 Signer 可作为钱包桥；用户每次确认和钱包签名仍必需。
- 自己控制的聊天界面可嵌入复用卡片；其他宿主按其真实能力显示文字或标准富 UI，不猜测私有 API。
- 可选标准 MCP 适配与主游戏分离。没有它也能使用网站、Skill 和 Adapter；不把工具可用等同于内嵌 UI 可用。

## 验证与部署

`npm run test:identity` 验证构造器约束及失败关闭；`npm run test:identity:fork` 只读获取主网状态，在隔离 Fork 内验证真实 Registry，不向主网广播。测试不会升级已经部署的不可变合约。

Skill 和静态资源通过项目自己的服务器同源发布。部署说明见 STATIC_HOSTING.zh-CN.md，主网／测试网配置必须按实际部署区分。
