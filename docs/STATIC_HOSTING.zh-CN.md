# 自有服务器静态部署

## 构建和上传

构建环境使用 Node.js 24，运行：

```sh
npm ci
npm --prefix web ci
npm run package:static
```

把 `dist-static/` 里面的全部内容原样上传到 HTTPS 静态网站根目录。服务器只需提供文件，不需要模型 API、钱包登录服务、私钥、专属平台 SDK 或 Node 运行时。自己的域名准备好后解析到该服务器即可。

网站支持根目录或子路径，例如 `https://你的域名/game/`。保持目录结构，资源使用相对路径；目录入口应补齐末尾斜线。`SHA256SUMS` 可核对文件完整性。不要上传源码目录、密钥、环境文件、node_modules、历史报告或交易签名器。

## 公开资源

- `agent-manifest.json`：发现规则、Skill、能力与模块入口。
- `SKILL.md`、`skills/three-shape/SKILL.md`：同一通用 Skill。
- `SKILL.en.md`、`skills/three-shape/SKILL.en.md`：英文版。
- `api/rules.json`、`api/capabilities.json`：静态规则与能力声明。
- `contracts/abi/*.json`：本次编译得到的接口；不是已经部署的地址。
- `fruit-market.html`、`market.bundle.js`、`market-config.mjs`、`market.css`：市场页面与资源。

复制入口会根据当前网站 URL 生成 Skill 地址，不绑定预览域名。没有 HTTP 工具的 Agent 可由用户下载后导入文本；没有链上工具或用户签名能力时必须说明限制，不能声称完成交易。

## 网络与签名

默认构建保留正式未配置状态。配置主网前应核对真实部署、ABI 和用户钱包支持网络。需要现有测试网配置时，明确设置 `VITE_THREE_SHAPE_NETWORK=bsc-testnet` 再构建；测试身份不能当成官方身份。

市场配置由 `web/market-config.mjs` 提供，地址留空时只能看明确标注的布局示例。不得用游戏合约地址填充市场。水果迷阵保留入口和规则预览，页面跳转暂停。

每笔交易和授权都必须先预览、获得明确确认，再由用户钱包签名。静态服务器没有私钥或代签功能。钱包拒签、回执失败和未知交易结果不能改写成成功。

## Web 服务配置

为 `.js`、`.mjs` 提供 JavaScript MIME，为 `.json` 提供 JSON MIME，Markdown 可使用 text/markdown 或 text/plain。启用 HTTPS；不要把不存在的 API 路径统一重写成 HTML。纯静态站点没有动态 `/api/game` 或钱包授权接口，配置过的浏览器 Adapter 可直接读取 RPC。

Nginx 示例见 `deploy/nginx.conf.example`。将其目录与域名改为真实服务器配置；TLS 证书由服务器维护者配置。一般静态文件服务器亦可部署同一目录，不要求此示例。

如要增加只读状态聚合，可独立部署 `server/` 服务；网站、Skill 和签名不依赖该服务。服务上线后才能更新 dynamicApiHosted／liveApiHosted 标志，不能把静态 JSON 当成动态链上读取。

## 验证

`npm run test:static` 检查公开产物、同源路径、暂停跳转、未配置能力和资源引用；`npm run check:public` 检查源码与产物中的旧平台标识及预览域名。部署后应从真实域名检查 Skill 下载、模块资源与钱包网络。服务器尚未提供时，本地验证不代表实际服务器已经上线。
