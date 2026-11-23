# Fruit Market V2.9 — implementation and release blockers

## Repository audit

Base: `a2d67d02ce88137b18da749ea1e55d3d49460319` (`main`). This checkout contains core Solidity, small Agent presentation helpers and Node/EVM tests. It does **not** contain a homepage, season UI, frontend router, wallet integration or natural-language conversation dispatcher. There is no existing nine-fruit season implementation to regression-test. Therefore the requested homepage card placement/dimension comparison and conversation integration cannot be honestly delivered from this source tree. No replacement homepage or season rules were invented.

## Architecture

`ThreeShapeFruitMarketV29` is a standalone non-upgradeable contract with immutable NFT and payment-token addresses. It uses the existing `kind(uint256)` getter, standard ERC-721 transfers and OpenZeppelin SafeERC20/ReentrancyGuard. Constructor dependencies must have code; deployment operators must independently verify they are the intended Three Shape NFT/3SHAPE contracts. The contract cannot establish deployment provenance from an arbitrary address by itself.

`activate` takes an owned kind-9 NFT into permanent custody and permanently activates the caller. No administrator, withdrawal, rescue, cancellation of activation, fee, proxy or arbitrary execution path exists. `list` escrows owned kind-1–8 fruit at a positive price. `cancel` safely returns it to the seller. `buy` checks activation, expected price, order validity and distinct buyer/seller, transfers exactly the order price directly from buyer to seller, and safely transfers the NFT. All effects revert together on any failure. Terminal orders remain queryable. Listing IDs begin at 1; `tokenListing` prevents duplicate active custody.

Receiver acceptance is scoped to a pending market-initiated transfer: bound NFT contract, operator, source and token ID must match. Direct safe transfers and third-party NFTs are rejected. Standard ERC-721 **unsafe `transferFrom` cannot be intercepted by any receiver**: a user can force an NFT into this contract, but it cannot activate a wallet or create an order and cannot be rescued. Never transfer NFTs directly; use `activate`/`list`. This is an inherent ERC-721 limitation, not a recovery backdoor.

Core Game/Token/NFT/Reserve/Liquidity and deployment-factory source files are unchanged. Existing reward and season eligibility rules are not replaced by market activation.

## Static UI

`web/fruit-market.html` is a standalone static page with injected-wallet connection, BSC network check/switch, activation, owned Star/fruit selection, exact decimal pricing, per-token NFT approval, exact ERC-20 approval when needed, escrow listing, cancellation, purchases, confirmations, receipt waiting, balances and history refresh. It verifies that the configured market binds the configured NFT/token. Network/account changes invalidate cached data and require reconnecting.

Orders are read through bounded 100-order pages; ownership uses bounded 100-ID segments through the existing NFT's `nextId`/`ownerOf`/`kind` interface (burned IDs are skipped). No historical block scan, database or server is required at runtime. Filtering and bigint sorting operate on loaded pages. The displayed cheapest result explicitly covers **loaded orders only**; load all pages to compare the whole market. My-order history likewise covers loaded pages. A refresh resets pagination and reads live chain state.

No original UI/style system exists to reuse. Current CSS is a minimal responsive standalone surface; exact homepage card parity remains blocked pending the actual frontend source. No homepage was invented.

## Agent boundary

`agent/market.mjs` adds only presentation/confirmation helpers next to existing helpers. There is no AI backend, new conversation UI, key custody or autonomous transaction sender. The repository has no conversation dispatcher to extend. Consequently the six requested Chinese natural-language commands are **not wired or claimed supported**. Use the market page and wallet for basic trading. A future existing Agent consumer can call `marketPrompt` and direct the user to that same page; it must query chain state and obtain missing price/fruit/Star choices rather than guess them.

## Local build and static hosting

1. `npm install --no-audit --no-fund` (pinned dependency versions and lockfile supplied).
2. `npm run compile`; independently inspect ABI/bytecode, dependencies and deployed addresses before any deployment.
3. After an authorized deployment, set verified BSC market/NFT/token addresses in `web/market-config.mjs`. Addresses intentionally default to empty; no contract is deployed by this PR.
4. `npm run build:web`; host the contents of `web/` on GitHub Pages, including generated `market.bundle.js`, configuration module, HTML and CSS. No build output is committed and no Pages deployment is triggered by this change.
5. Browse `/fruit-market.html` relative to that directory. An actual existing homepage must link to it once its source is available.

## Validation

See the accompanying delivery report for executed results. Commands: `npm test`, `npm run compile`, `npm run test:evm`, `npm run test:market`, `npm run build:web`, `npm run test:ui`.

Original CLI compilation needs optimization to avoid a factory stack-depth error. The existing EVM test's compiler configuration enables viaIR to get past its stack-depth error without editing protected contracts. Original metadata assertions have not been weakened or removed.

## Release blockers and unverified items

- Actual homepage/season frontend source and Agent conversation entry point are absent.
- No verified deployed market/core addresses or authenticated BSC fork RPC were supplied; no BSC fork, live BSC wallet integration or mainnet deployment was performed.
- Browser wallet tests use an injected Ganache-backed EIP-1193 bridge, not a production wallet extension; production extensions and external RPC failure behaviour require further verification.
- No independent security audit has been performed. Permanent Star custody and accidental unsafe NFT transfers have no recovery path by design.
- Large-market pagination is bounded per request but comparing the entire market still requires loading all pages; no server index is introduced.
- Existing baseline failures block declaring the project fully green or release-ready. This PR must remain unmerged pending review and missing integration inputs.
