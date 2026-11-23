# Fruit Market — authoritative Sites baseline

The user selected the existing Sites source as the final project version. Baseline: Sites project `appgprj_6aefbcb1e6348191ab4e466f37b80ab2`, published version 24, commit `1325028d50238026b09b1c562aec90daa0f7dea1`. PR #2 compares the market feature branch directly against `sites-v24-baseline`, an unmodified snapshot of that source. Only market additions and minimal existing-frontend integration are in the review diff. No original core contract or rule is changed, and neither GitHub main nor Sites source main is merged or updated.

## Preserved core

Game, Token, NFT, Reserve, Liquidity, deployment factory, season contracts, puzzle rules and original reward distribution are copied unchanged from the selected Sites commit. The market is an independent extension; it cannot mint/burn core assets, modify rewards, update season rules or administer those contracts. No core redeployment is required. Existing server sources come from the selected baseline; the market adds no server and requires none at runtime.

## Contract

`ThreeShapeFruitMarketV29` binds immutable existing NFT and 3SHAPE ERC-20 addresses. Deployment operators must independently verify addresses; code-length validation does not establish provenance. OpenZeppelin SafeERC20, ReentrancyGuard and strict ERC-721 receiver validation protect transfers.

Activation verifies ownership and kind=9, actually transfers Star into the market, then records permanent wallet qualification. Star continues to exist in contract custody: **not burned, not redeemable, no extraction or admin rescue**. Duplicate activation fails. Qualification is independent of season NFT holdings.

Only kinds 1–8 may be escrow-listed at positive seller-defined 3SHAPE minimum-unit prices. Seller-only cancellation safely returns the fruit. `buy(listingId,expectedPrice)` checks active buyer/order, exact price and distinct buyer/seller; transfers exactly that price directly to the seller and safely transfers fruit to the buyer atomically. Any callback/payment failure reverts the entire operation. No fee, administrator, proxy, auction or price-edit API exists.

Safe receipt requires the bound NFT contract, market operator, expected sender and token ID within a pending transfer. Ordinary safe transfers cannot activate or create orders. ERC-721 **unsafe transferFrom is not interceptable**: it can force an NFT into any receiver, but creates no qualification/order and here has no rescue path. Never send NFTs directly.

## Existing frontend integration

`FruitMarketPortal` appears immediately above the unchanged `MysteryPortal` season entry inside `ThreeShapeCard`. Both buttons share `ts-mystery`, three spans and a small subtitle. Existing season CSS is untouched. A 12px gap separates the entries. Clicking navigates to `./fruit-market.html`; no new navigation framework is added.

The market page adopts the selected preview's colors, card rounding, borders and shadows. It uses the same injected wallet via EIP-1193, displays activation and owned NFT choices, prepares per-token NFT approval and exact ERC-20 approvals, confirms each action, waits for receipts, and refreshes balance/ownership/orders. Network/account changes invalidate cached data and require reconnecting.

`getListings(start,limit)` returns at most 100 orders including final states. The UI displays active orders, filters fruit and sorts bigint prices. Ownership reads `nextId`/`ownerOf`/`kind` in 100-ID segments and handles burned IDs. There is no historical block scan or database. Cheapest/history displays explicitly cover loaded pages; load all pages to compare the full market. Large markets may warrant a future active-order index; none is introduced here.

## Existing Agent compatibility

The selected source uses `AgentStart` to copy instructions and download `skills/three-shape/SKILL.md` / `SKILL.en.md`. That existing entry and both Skills now explain market activation, listing, cancellation, cheapest-fruit queries and wallet confirmation. The Chinese Skill covers all six requested examples, including missing-price clarification and exact conversion of 500 万 to 5,000,000 tokens.

No new AI router/backend/service, Agent contract, private-key custody or autonomous execution is added. The host Agent must possess reliable chain-query/wallet tools; otherwise the Skill directs users to the market page. Natural-language execution depends on that external host and has not been tested end to end. `agent/market.mjs` is only a presentation helper.

## Build and delivery

- `npm install --no-audit --no-fund`; `npm --prefix web ci --ignore-scripts`.
- `npm run compile`: selected baseline compiler plus standalone market.
- `npm run build:web` or `npm run build:card`: build market assets into `web/public`, export existing Skills, then build the existing React website into `web/dist`. `build:web` also packages the same static output into root `dist`, matching the existing Sites hosting manifest.
- Publish the contents of `web/dist` to GitHub Pages if desired. Runtime remains static.
- `web/market-config.mjs` intentionally contains no guessed addresses. Set independently verified market/NFT/3SHAPE addresses and correct network, then rebuild. No deployment is performed by the build.
- Review remains in [Draft PR #2](https://github.com/iimqsh888/three-shape-v29/pull/2). No GitHub main merge, Sites source-main push or mainnet deployment is performed. The published Sites preview is not proof that this feature branch is live.

See `fruit-market-delivery.md` for current-source validation results and unresolved limits. Historical imported reports are not rerun results for this change.
