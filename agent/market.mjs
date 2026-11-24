// Helpers for the existing Agent consumer. No router, service, key storage or execution.
export function marketPrompt({action, tokenId, listingId, price, activated}) {
  if(!['activate','list','cancel','buy','browse'].includes(action))throw new RangeError('invalid market action');
  if(!activated && ['list','buy'].includes(action))return {allowed:false,requiresConfirmation:true,url:'web/fruit-market.html',message:'请先在水果市场永久锁定一枚 Star 激活交易资格。'};
  return {allowed:true,action,tokenId,listingId,price,requiresConfirmation:action!=='browse',url:'web/fruit-market.html',message:action==='activate'?'Star 永久锁定，无法赎回；请确认钱包交易。':'请在市场页面核对链上订单及 3SHAPE 金额，并确认钱包交易。'};
}
