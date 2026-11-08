// Local JSON fixtures for MOCK only. Live bindings must read chain JSON metadata.
export const metadata=[
 {name:'Green Apple',symbol:'🍏',kind:1},{name:'Lemon',symbol:'🍋',kind:2},
 {name:'Grapes',symbol:'🍇',kind:3},{name:'Cherries',symbol:'🍒',kind:4},
 {name:'Strawberry',symbol:'🍓',kind:5},{name:'Pear',symbol:'🍐',kind:6},
 {name:'Mango',symbol:'🥭',kind:7},{name:'Watermelon',symbol:'🍉',kind:8},
 {name:'Star',symbol:'🌟',kind:9},
];
export const unit=10n**18n;
export function formatAmount(value:bigint,decimals=18){const div=10n**BigInt(decimals),whole=new Intl.NumberFormat('zh-CN').format(value/div),fraction=decimals?String(value%div).padStart(decimals,'0').replace(/0+$/,''):'';return whole+(fraction?'.'+fraction:'');}
