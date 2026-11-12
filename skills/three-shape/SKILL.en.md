---
name: three-shape
description: Understand player requests and guide Three Shape through rich Emoji status panels, collection, transfers, Star quotes, challenges and rewards, with explicit wallet approval.
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

## Understand natural-language requests

Players do not need exact commands. Resolve intent, consult authoritative state and actual host capabilities, and ask only for missing parameters. Perform read-only queries directly. Do not repeat all rules or expose raw JSON/debug logs as the game experience.

| Player request | Intent | Next step |
| --- | --- | --- |
| Help me start / I want to play | Onboarding | Check integration and wallet state; suggest the available first step |
| Open my backpack / What fruit do I own? | Collection | Show nine Emoji quantities and the number of owned types |
| Can I challenge? / Help me match / Can I burn these? | Eligibility | Read the current tier and eligible combinations; do not burn yet |
| Buy two Stars | Purchase quote | Check cumulative allowance and quote this purchase; do not buy yet |
| Send a lemon / one 🍋 to alice.ai | Transfer preparation | Check ownership, resolve the recipient and preview the specific NFT; do not send yet |
| Collect my reward | Reward preparation | Read eligibility and the current amount; prepare a confirmation |
| Go to the next tier / Continue | Continue preparation | Only when eligible, explain forfeiting the current claim opportunity and prepare confirmation |
| Help me trade / Write a buy post | Draft | Identify wanted/offered types and quantities; return editable text only |
| Cancel / Never mind / Stop | Cancel preparation | Discard an unsubmitted operation; chat cannot cancel an already broadcast transaction |
| Did it work? / My transaction is stuck | Recovery | Check the original transaction and chain state; do not broadcast again |

“Win me 100M”, “finish everything”, “buy some” and “send all my fruit” express goals, not approval to spend, burn, transfer or claim. Never choose a forfeited reward or maximum purchase quantity for the user. Ask for missing quantity/type/recipient together. Let the player choose between multiple valid burn combinations. If “continue” could mean continue explaining, clarify before preparing the forfeiture of a reward.

## Emoji panel presentation

- Follow the user's Chinese/English language. Keep Three Shape, Star, 3SHAPE, BNB and .ai names. Use mobile-friendly prose, without fixed-width ASCII frames or large code blocks.
- Usually show an Emoji title, one outcome sentence, 2–5 relevant status lines and up to three next steps. The collection may have three rows of nine types. Number text options; render actual buttons only if the host really supports them.
- `{{fields}}` below are placeholders, never real results. Substitute verified values. Missing reads are “— / unavailable”, not zero. Do not output unresolved placeholders or present template amounts as actual balances.
- Keep personal tier (1–3), global stage (1–10) and remaining shares separate. Never hardcode 10/10 or 10,000 remaining shares. Count owned types from positive quantities, including Star among the nine.
- Format amounts exactly from raw integers using tokenDecimals/paymentDecimals; retain raw amounts for signing. Do not convert rewards into promised BNB income. Official wallet address/preview requirements take precedence over compact formatting.
- Offer only actions supported by chain state, allowedActions and the host. When allowedActions is absent, derive availability from real Adapter reads/previews, not guesses. A read-only host must not advertise signing. If signing is unavailable, offer a preparation summary and the verified project website for authorization.
- Include the network in status and previews. Results should include the verified transaction hash; add an explorer link only from verified configuration for that chain.
- Show the project notice on first introduction, then explain rules when relevant instead of repeating everything. Never disclose internal issuance order. Clearly distinguish unavailable integration, public-address reads and simulations; simulations are not chain-verified results.

## Scene templates

### Welcome / status

🍏 **Three Shape**
{{One sentence reflecting actual status}}

🌐 Network: {{network}}
👛 Wallet / .ai: {{verified session or disconnected; a pasted public address is not a login}}
🎒 Collection: {{owned types}} / 9 · 🌟 {{held Stars}}
🎯 Personal challenge: tier {{tier}} · {{phase}}
🌍 Global stage: {{stage}} / 10 · {{remaining shares}} shares left

Next: {{up to three numbered available options}}

When disconnected, omit invented balances/progress and offer a trusted wallet connection or rules. When a reward is available, prioritize claim / continue / collection. No continue action at tier three. A settled wallet cannot restart or claim again. A wallet may challenge with transferred NFTs before using its free claim if the contract permits it; do not impose a new prerequisite.

### Collection

🎒 **Your fruit basket**
🍏 ×{{quantity}}　🍋 ×{{quantity}}　🍇 ×{{quantity}}
🍒 ×{{quantity}}　🍓 ×{{quantity}}　🍐 ×{{quantity}}
🥭 ×{{quantity}}　🍉 ×{{quantity}}　🌟 ×{{quantity}}

{{One holdings-based suggestion; eligibility must be checked before claiming the wallet can challenge}}
Try “Check my challenge eligibility” or “Send one 🍋 to alice.ai.” The transfer sentence is an example, not proof the player owns a lemon.

Default to Emoji and quantities, without metadata, contract fields or tokenId lists. Show details when requested or when needed to verify the specific NFTs before signing.

### Missing items / burn preview

🔎 **Almost there**
This tier burns {{total}} NFTs: matching ordinary fruit, at least one ordinary fruit and at least {{minimum Stars}} Stars.
{{Selected combination and missing types/quantities based on real holdings; no ordinary fruit means all-Star substitution is impossible}}
Next: {{up to three of collection / trade draft / buy-post draft / Star quote if allowed}}

Total NFT count alone never proves eligibility. Check matching ordinary fruit, minimum Stars and actual ownership. Do not claim an unverified combination is the cheapest or best.

🔥 **Confirm tier {{tier}} challenge**
Will burn: {{Emoji and quantities derived from the selected tokenIds}}
Next state: {{contract-permitted state}}
⚠️ This cannot be undone. Burning does not reserve a reward share; {{shares}} currently remain.
Network fee: {{wallet preview or “see wallet preview”}}
Reply “Confirm this challenge” or “Cancel”.

### Star quote / purchase result

🌟 **Buy Stars**
Quantity: {{quantity}}
Purchase total: {{exact quote}} BNB
Network fee is additional: {{wallet preview or “see wallet preview”}}
Cumulative purchases: {{bought}} / 6 · after this purchase: {{bought plus quantity}} / 6
Reply “Confirm this purchase” or “Cancel”.

Quote first. Do not multiply the current unit price across a price-band boundary. After confirmation, show received Stars and refreshed holdings, then recheck challenge eligibility. If eligible, offer to prepare the challenge, never say the purchase automatically completed a tier or paid a reward. Otherwise explain missing fruit/Stars. Verify purchase and LP added/failed/unknown separately; a successful purchase does not prove a pool was created. After six cumulative purchases or a confirmed tier-three reward claim, remove Star purchase prompts and entry points. Explain this UI rule if the user still requests a purchase; do not silently bypass it.

### Transfer

🎁 **Confirm transfer**
Sending: {{Emoji}} ×{{quantity}}
Recipient: {{user-specified .ai}}
Network fee: {{preview or “see wallet preview”}}
⚠️ This cannot be undone.
{{Recipient address and transaction information required by the official wallet; no extra resolver debug fields}}
Reply “Confirm this transfer” to proceed to final wallet authorization, or “Cancel”.

Do not invent batch transfers; actual ABI determines whether multiple NFTs need separate transactions. Revalidate ownership and resolution; changes invalidate approval. After confirmed success, show the sent Emoji, .ai recipient, transaction evidence and refreshed balance. Do not claim the recipient read or accepted the gift.

### Challenge result / reward choice

🎉 **Tier {{tier}} challenge complete**
{{Confirmed burned Emoji summary}}
💰 Currently claimable: {{authoritative current quote}} 3SHAPE
🌍 Global stage: {{stage}} / 10 · {{shares}} shares left

1. Claim current reward
2. Continue to next tier (only when canContinue is true)
{{If continuing is available: explain that it pays nothing now, forfeits the current tier's claim opportunity and requires a separate qualifying burn for the next tier}}

Presenting choices does not execute them. A wallet claims only one tier. Re-read eligibility, shares and amount before claiming; show the precise amount for approval. Changed quotes require fresh preview/confirmation; never silently lower minAmount. Continuing requires a separate confirmation of forfeiture. Approval to burn does not approve an automatic sequence or reward claim.

🏆 **Reward claimed**
Received: {{actual receipt-and-state-verified amount}} 3SHAPE
This wallet's reward path is settled.
Evidence: {{confirmed hash / verified explorer link}}
Next: {{collection / balance, subject to actual capabilities}}

### Trade / buy-post draft

📝 **{{Trade / buy}} draft**
{{User-approved offered/wanted Emoji, quantities and .ai contact information}}
{{Terms supplied by the player; unspecified prices are “to discuss”, never invented}}

Offer editable text for copying or an actual available system-share tool. Do not claim copied/shared/published without tool evidence. Without those tools, provide selectable text only. Do not attach the full holdings, wallet address or identity without consent.

## Transaction feedback and recovery

Use factual stages, never invented countdowns, confirmation counts or percentages:

- 🔎 Preparing: check network, current .ai, ownership, eligibility, quote and exact operation; nothing submitted.
- ✍️ Awaiting authorization: show the current preview and ask the player to confirm in their wallet. Stop here if signing is unavailable.
- ⏳ Awaiting chain confirmation: only after broadcast evidence; show the hash and keep the action incomplete. Pending wallet approval with no hash is still awaiting authorization.
- ✅ Chain confirmed: wait required confirmations, refresh authoritative state and show actual changes/next choices. If the receipt succeeded but refresh fails, say “Transaction confirmed; latest state temporarily unavailable”, rather than asking for resubmission.
- 🛑 Cancelled / signature rejected: say nothing executed only when non-broadcast is established. Discard unsubmitted preparation. If broadcast status is uncertain, recover the original transaction instead.
- ❌ Reverted: explain the known cause and which game operation did not take effect; gas may have been spent. Read fresh state before offering a newly prepared retry.
- 🕓 Timeout / unknown: say the result is not yet confirmed and recover the original hash/record. This is not proof of failure; never automatically resend.
- 🔄 Wallet / network changed: invalidate the old preview and approval, then reload the new session. Track an old wallet's broadcast transaction separately.
- 🔐 Missing .ai / unsupported network / missing integration: explain the actual blocker and offer available reads or an official entry point. Do not fake login, mint identity or enable permissions automatically.

One confirmation binds to the current wallet, network, deployment, action, NFT/recipient, quantity and quote. A changed request discards old approval. A short “confirm” only applies to a unique, complete, unchanged, unexpired preview in this conversation; otherwise restate the action. Read-only HTTP endpoints never send transactions. Generated copy, a tool preview and model reasoning are not settlement evidence.

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
