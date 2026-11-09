# Three Shape 网站与可嵌入卡片

网站只保留语言切换、游戏卡片、Agent 指令和 Skill 下载。浅绿色底色与既定字体／按钮风格保持不变。卡片最大宽度固定 384px，桌面不放大；更窄屏幕按可用宽度适配。

## 当前接入状态

网站只实例化 ContractAdapter。缺少真实 ABI、合约地址和用户钱包绑定时，显示“待接入 / Coming soon”，游戏主按钮禁用，收藏数量／奖励显示未知，不创建虚拟钱包或本地游戏进度。不把不可用状态标为已上链。

测试工具已从网站与业务入口移除；MockAdapter 移至 src/test/fixtures/，仅供单元测试注入。src/index.ts 不导出 MockAdapter。构建时额外检查正式 JavaScript 不包含补 NFT、改资格、场景切换、旧模拟持久化键或模拟 .ai 地址。

## 运行

```sh
npm --prefix web ci
npm run dev:card
npm run build:card
npm run test:card
```

根目录 npm run serve 可运行网站与只读 HTTP 服务。现有在线 Site 为静态托管；真实读写／官方钱包尚未接入，不执行主网交易。

## 组件与 ABI

```tsx
import {ThreeShapeCard,ContractAdapter} from './src';
<ThreeShapeCard mode="live" adapter={new ContractAdapter(bindings)} />
```

bindings 由宿主根据最终 ABI 和官方钱包流程实现；所有读写仍集中在 Adapter，不猜测 Solidity 方法。未传绑定的 ContractAdapter.readiness 为 unconfigured。真实交易必须等待确认再刷新状态；恢复返回 null 或超时不能当作未发送，保留等待标记并阻止重发。

## 双语与品牌

顶部中文 / EN 切换界面、标签、提示、规则与 Agent 指令；只持久化语言偏好。English 下载 SKILL.en.md，中文下载 SKILL.md；两份技能都要求 ABI 未配置时停止操作，不生成模拟结果。可通过 LanguageContext 为嵌入的卡片指定语言。

three-shape-logo-v2.jpg 为用户提供的最新原图，同时用于项目、代币展示与站点图标。NFT 继续使用 Emoji，不添加外部图片元数据。

## 保留的扩展

- src/game/presentation.ts：结构化 three-shape.game.v1 结果与文字渲染。
- TextGamePanel：文字指令组件源码保留，当前网站不展示额外入口。
- src/integrations/mcp-apps/：独立、只读的传输适配边界；不声称 Binance 当前支持 MCP Apps。
- MysteryPortal：占位，无新链上逻辑。

生产合约、奖励、定价、LP 和 Treasury 未因本次 UI 调整而修改。构建／DOM 与 Adapter 测试不等同于浏览器视觉、真机、BSC Fork 或独立安全审计。


## 接口匹配补充

local-interface-map.json 仅记录本地源码 ABI 对应关系，不是最终网络 ABI。decodeGameState 要求 Settled 使用确认 Claimed 事件提供最终档位。claimReward(minAmount?) 从用户已看到的快照传递最低金额；TransactionReceipt.liquidity 区分购星与加池结果。全局售罄和钱包剩余额度影响购买入口／数量。真实绑定仍未完成，详见 ../reports/INTERFACE_COMPATIBILITY.zh-CN.md。
