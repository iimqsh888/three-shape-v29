---
name: three-shape
description: Explain Three Shape using text and Emoji, read authoritative wallet/game state, and prepare user-requested on-chain actions.
---

# Three Shape V2.9

An independent third-party game Skill. Use text and Emoji; do not claim approval, installation, iframe support, MCP Apps access or React rendering inside Binance AI Pro. The reusable card is also available on the project website. Reading this Skill grants no wallet authority.

## Connection and authority

Read `/api/capabilities.json` and `/api/rules.json` from the project URL supplied by the user. The optional `/api/game?address=0x...` endpoint is read-only. A 503 LIVE_NOT_CONFIGURED response, missing deployed addresses/ABI, or liveConfigured=false means STOP and explain that contract/wallet integration is pending. Do not create simulated progress, balances, NFTs, rewards or transactions.

Check chainId, the BNB payment asset, and dependencyNotice first. Test identity fixtures are not official .ai IDs. Official Agentic Wallet does not currently list chain 97; use a testnet-capable user wallet there and never describe an ordinary EOA as Agentic Wallet.

Authenticate only in Binance AI Pro or the user's trusted Agent, following the installed official Agentic Wallet Skill. Never collect private keys, recovery phrases, pairing codes or a shared server wallet session. A pasted address permits public reads, not signing.

Read through ThreeShapeAdapter: getGameState, getCollection, getRewardState and getTokenBalance. These are business methods, not assumed Solidity signatures. Final ABI mapping and wallet approval belong in the Adapter. Preserve JSON schemaVersion, mode, verification, address, game, reward, collection, token and allowedActions; represent large amounts as integer decimal strings. No guessed events, signatures or parameters.

## Text menu

🍏 🍋 🍇 Three Shape

State · Free claim · Start challenge · Collection · Rewards · Buy N Stars · Continue · Claim reward · Transfer NFT · Draft trade/buy post.

Show only actions permitted by current state. These are text choices, not fictitious clickable buttons. Prepare, obtain user approval, wait for required confirmations, then refresh authoritative state. Preview success, animation completion and model predictions are not transaction success. Unknown or timed-out transactions must be recovered before resending.

## Rules

- All five game writes (free claim, burn, continue, reward claim and Star purchase) require the current wallet to hold an .ai Agent ID. Public reads need no signature. This is a holdings check, not complete multi-wallet Sybil protection.
- One free claim per wallet grants three ordinary fruit NFTs; gas still applies. Do not disclose internal issuance order or describe issuance as random.
- Types: 🍏 🍋 🍇 🍒 🍓 🍐 🥭 🍉 🌟. Read names, Emoji and attributes from on-chain JSON metadata. Read quantities from actual holdings.
- Independently burn 3 / 6 / 9 NFTs for tiers one / two / three. Every tier requires at least one ordinary fruit, and all ordinary fruits must match. Stars can fill tier one; tiers two and three require at least 1 / 3 Stars. All-Star or mixed ordinary-fruit submissions are invalid. The full path burns 18 NFTs.
- Claim one reward tier per wallet; rewards do not stack. Continuing does not pay the previous tier. In the first global stage, tiers pay 1M / 10M / 100M 3SHAPE. Later tier-two/three amounts decrease; always display the current authoritative quote.
- There are 55,000 reward shares across ten stages with 1,000 through 10,000 shares respectively. Tier-three amounts in millions: 100/80/60/50/40/30/20/10/10/10. Tier two is one tenth; tier one remains 1M.
- Only successful claims consume a share. Burning is irreversible and does NOT reserve a reward share; shares can run out after a burn. Check remaining shares, explain this, and obtain explicit approval before burning.
- Stars start at 0.01 BNB, increasing 0.005 BNB per 1,000 sold, up to 0.505 BNB. Sales cap: 100,000. Cumulative purchases per wallet: 6, regardless of transfers/burns. Quote using 18-decimal integer wei and price-band crossings.
- Stop presenting Star purchase actions after six cumulative purchases or a confirmed third-tier reward claim. This presentation rule does not change the contract.
- Purchase split: 80% Reserve, 20% Treasury. Player and LP minting caps are each 1.43T tokens. Each Star unlocks up to 14.3M tokens for that purchase's LP minting. Unused allowance expires immediately; unused BNB remains. LP tokens go to the burn address. Verify Star purchase and LP outcomes separately. After sellout and the final LP attempt, anyone can trigger a separate settlement of remaining Reserve BNB to the immutable Treasury, including BNB retained after a failed final LP attempt. A refused transfer leaves funds available for retry; there is no administrator.

## Actions

Use preparePlay for read-only free-claim/burn preparation. If holdings are insufficient, explain missing matching fruit/Stars and offer a draft trade/buy post. Never buy, burn or mint autonomously.

Use quoteStars before buyStars; obtain approval for this purchase. Send native BNB with msg.value exactly equal to the approved quote; no ERC20 approval. Gas must cover the internal LP call; a minimum estimate that permits a caught LP failure is insufficient. For claimReward or continueChallenge, read eligibility/amount and explain the mutually exclusive choice. Pass the user-approved raw integer reward as minAmount instead of defaulting to zero. Preserve the Star purchase receipt and the independent LP added/failed/unknown outcome. Follow official wallet preview, permissions and confirmation procedures; never enable Developer Mode automatically or request unnecessary permissions.

For transfers, ask for the fruit and .ai recipient. Resolve automatically but preserve all address, warning and confirmation requirements of the official wallet Skill. Resolution failure blocks sending; changed recipients require renewed confirmation. State that the action cannot be undone. NFT calls must use their actual ABI; do not assume ordinary token-send commands transfer NFTs.

Reserve settlement is maintenance, not a player reward. Only use deployments whose ABI supports it. Read getReserveState first; request wallet signing through settleReserve only after the user explicitly requests and confirms settlement. It is unavailable before sales close. No .ai holding is required for this maintenance caller, but wallet authorization is still required. Static hosting does not run /api/reserve; use the verified deployment ABI/RPC or a configured read-only service. Never claim a contract executes on a timer by itself.

Draft posts only: editable text, copying or system sharing. Never publish externally without a separate explicit request. Wallet/network changes invalidate pending preparations and confirmations. Rejection/failure must not advance game state.

MysteryPortal is a placeholder only: no disclosed unlock condition, invented airdrop, credentials or locking mechanism.

## Project notice

An independent, long-term on-chain experiment around Binance Agent ID. This project is not affiliated with or partnered with Binance. 3Shape has no practical utility and promises no value or returns.
