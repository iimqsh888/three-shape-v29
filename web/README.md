# Three Shape · Agent 聊天卡片预览

这是可以嵌入 Agent 消息列表的 React + TypeScript 组件，不是独立跳转的游戏流程。Demo 只有本地固定回复，没有连接语言模型。

## 运行

```sh
npm ci
npm run dev
npm run build
npm test
```

在仓库根目录也可运行 `npm run dev:card`，首次先执行 `npm --prefix web ci`。

## 模拟体验

1. 在卡片中点击「连接钱包」，使用本地模拟钱包，无需真实钱包扩展。
2. 点击「免费领取水果」，在卡片中确认，等待 PENDING → CONFIRMING → RESULT。
3. 在卡片下方的「模拟工具」点击「补齐本档 NFT」。这是测试 fixture，不是游戏额外奖励。
4. 回到卡片点击「开始挑战」，确认销毁 ID，选择领取或继续。
5. 要体验下一档，再补齐测试 NFT。第三档只显示领取按钮；领取不叠加。
6. 「查看收藏」展示九种 NFT，已持有项可点开本地 JSON 元数据；「查看奖励」显示当前全局阶段报价。
7. 模拟工具支持拒签、回执失败、切换钱包、撤销 .ai 资格、全局十阶段切换、Star 销售边界、补充模拟 USDT 与重置。
8. 可模拟购星，价格每售出 1,000 枚上涨 2 USDT。只改变演示余额和收藏，不进行真实授权或 LP。

每个模拟操作都不产生真实资产、gas 或主网交易，结果未经链上验证。已确认的演示状态按钱包保存于浏览器 localStorage，刷新后重新连接同一钱包恢复；刷新中断尚未完成的模拟操作不结算。

## 嵌入 Agent 消息

```tsx
import {ThreeShapeCard, MockAdapter} from './web/src';
const adapter = new MockAdapter(); // 在 React 中通过 useMemo 保持实例稳定

<ThreeShapeCard
  mode="mock"
  adapter={adapter}
  walletAddress={address}
  onAction={handleAction}
/>
```

宿主将组件挂载在稳定的消息 ID 下，不要因为新增对话消息而重建它。onAction 是用户意图通知，不是交易成功，也不赋予 Agent 代签权限。walletAddress 应与 Adapter 的当前钱包会话一致。

`src/contracts/types/` 定义业务接口；所有模拟数据和交互集中于 MockAdapter。`ContractAdapter` 仅为真实绑定入口骨架，未传真实实现时拒绝 Live 操作，不会用 Mock 结果冒充链上数据。实际 Live 模式仍需按最终 ABI 接入钱包、元数据、回执、账户/网络订阅及待处理交易恢复。

公开玩法和 UI 不展示内部发放顺序，不作随机中奖承诺。NFT 英文名称和 Emoji 来自本地 JSON fixture；真实模式应来自链上 JSON。MysteryPortal 只有占位。

## 验证

构建与 19 项 Adapter/React 组件测试通过。测试覆盖三档流程、只领取一次、资格撤销、星星千枚边界、九种收藏、签名前确认、等待、失败、恢复、钱包切换与 Live 缺配置。

CSS 包含窄屏布局、键盘焦点与减少动画偏好。当前托管环境缺少浏览器控制工具，未进行真实浏览器视觉或真机验证；DOM 组件测试不等于视觉验收。
