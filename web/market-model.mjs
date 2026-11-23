import {parseUnits, formatUnits} from 'ethers';
export const FRUITS = ['','🍏 苹果','🍋 柠檬','🍇 葡萄','🍒 樱桃','🍓 草莓','🍐 梨','🥭 芒果','🍉 西瓜','🌟 Star'];
export function amount(value, decimals) {
  if (!/^\d+(\.\d+)?$/.test(value)) throw Error('请输入有效的 3SHAPE 金额');
  const result = parseUnits(value, decimals);
  if (result <= 0n) throw Error('价格必须大于零');
  return result;
}
export {formatUnits};
export function activeOrders(orders, kind='0') {
  return orders.filter(o=>Number(o.status)===1 && (kind==='0'||Number(o.kind)===Number(kind)))
    .sort((a,b)=>a.price<b.price?-1:a.price>b.price?1:0);
}
