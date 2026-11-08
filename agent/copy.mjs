// User-facing copy only. Execution and eligibility must still come from contracts.
export const gameIntroduction = Object.freeze({
  title: 'Three Shape',
  intro: '持有 .ai Agent ID，免费领取 3 枚水果 NFT；凑齐符合条件的 NFT 后逐档挑战，最高可领取 1 亿 3SHAPE。',
  eligibility: '免费领取、销毁挑战、继续挑战、领取奖励及购买 Star，每一步均须由当前持有 .ai Agent ID 的钱包签名。',
  challenge: '三档分别独立销毁 3、6、9 枚 NFT；第一档允许 Star 补齐，第二档至少含 1 枚 Star，第三档至少含 3 枚 Star，普通水果须同种且至少有 1 枚。',
  reward: '每钱包仅能领取一档奖励。继续不兑现上一档；实际金额随全局领取阶段变化，以合约报价为准。',
  shares: '销毁不可撤销，销毁不预留奖励份额，成功领取才消耗一份。领取前可能被其他钱包用完剩余份额。',
  stars: 'Star 起价 10 USDT，每累计售出 1,000 枚上涨 2 USDT，总量 100,000 枚，最后价格区间为 208 USDT，每钱包累计最多购买 6 枚。',
  split: '购星款 80% 进入 Reserve、20% 进入 Treasury。',
  liquidity: '每售出 1 枚 Star，本笔最多解锁 1,430 万 3SHAPE 的 LP 铸币额度；未用额度立即过期，未用 USDT 保留在 Reserve。购星和 LP 结果分别以链上回执为准。',
  disclaimer: '本项目围绕 Binance Agent ID 的一项长期链上实验，由第三方独立发起，与 Binance 无任何隶属或合作关系。3Shape没有任何实际用途，也不承诺任何价值或收益。',
  fees: '免费领取不收 USDT，链上操作仍需支付 gas。',
});
