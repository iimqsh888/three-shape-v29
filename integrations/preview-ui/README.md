# Existing Sites preview integration

Source identified from the user's preview URL through Sites, project `appgprj_6aefbcb1e6348191ab4e466f37b80ab2`, published version 24, source commit `1325028d50238026b09b1c562aec90daa0f7dea1`. This is a **separate repository** from `iimqsh888/three-shape-v29`; its core economy includes different BNB rules. Do not import those core contracts, server or economic rules into this PR.

`fruit-market.patch` is the bounded UI integration against that exact source: adds `FruitMarketPortal`, inserts it immediately before `MysteryPortal`, and adds a component regression test. The existing season component and CSS are untouched. Both entries use the same `ts-mystery` button class, three spans and small subtitle, preserving width, height, rounding, background, border, shadow and typography. Only a 12px gap is added above the existing season entry. The market uses `window.location.href='./fruit-market.html'`, without a new navigation framework.

Apply in the matching preview checkout using `git apply --check /path/to/fruit-market.patch`, then `git apply /path/to/fruit-market.patch`. In this GitHub checkout run `npm run build:web`, then copy `web/fruit-market.html`, `web/market.css`, `web/market-config.mjs` and generated `web/market.bundle.js` into the preview checkout's `web/public/`. Configure **verified** market/NFT/3SHAPE addresses before rebuilding the bundle if needed. The configuration module is loaded separately at runtime.

The market styling now uses the preview's #233e30 text, #2f5e41 green, #fffef9 cards, 22px rounding and original border/shadow colors. Star activation explicitly states the NFT is transferred, remains in the contract permanently, is not burned, and has no extraction or redemption path.

No live preview deployment, Sites source push, core-contract replacement or main-branch merge is performed by this integration patch. The existing preview must remain unchanged until the reviewed source is integrated. The Agent start section in the preview copies a Skill instruction; it is not a natural-language command dispatcher. Six-command routing is still not implemented by this patch.
