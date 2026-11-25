import {BrowserProvider, JsonRpcProvider, Contract, getAddress} from 'ethers';
import {config} from './market-config.mjs';
import {shopName} from './market-identity.mjs';
import {FRUITS, amount, formatUnits, activeOrders} from './market-model.mjs';
const $=id=>document.getElementById(id);
const marketABI=['function nft() view returns(address)','function paymentToken() view returns(address)','function activated(address) view returns(bool)','function lockedStar(address) view returns(uint256)','function nextListingId() view returns(uint256)','function getListings(uint256,uint256) view returns(tuple(address seller,uint256 tokenId,uint256 price,uint8 status,address buyer)[],uint256)','function activate(uint256)','function list(uint256,uint256) returns(uint256)','function cancel(uint256)','function buy(uint256,uint256)'];
const nftABI=['function nextId() view returns(uint256)','function kind(uint256) view returns(uint8)','function ownerOf(uint256) view returns(address)','function getApproved(uint256) view returns(address)','function isApprovedForAll(address,address) view returns(bool)','function approve(address,uint256)'];
const tokenABI=['function decimals() view returns(uint8)','function balanceOf(address) view returns(uint256)','function allowance(address,address) view returns(uint256)','function approve(address,uint256)'];
let provider,signer,account,market,nft,token,decimals,activated=false,busy=false,epoch=0;
const demo=!config.market;let demoCount=10;let names=new Map();
let orders=[],owned=[],orderCursor=1n,nftCursor=1n,orderEnd=1n,nftEnd=1n;
function message(s){$('message').textContent=s;}
function option(select,value,label){const e=document.createElement('option');e.value=value;e.textContent=label;select.append(e);}
for(let k=1;k<=8;k++)option($('filter'),k,FRUITS[k]);
function confirmation(text){return new Promise(resolve=>{ $('confirmation').textContent=text;$('confirm').showModal();$('yes').onclick=()=>{$('confirm').close();resolve(true);};$('no').onclick=()=>{$('confirm').close();resolve(false);};$('confirm').oncancel=()=>resolve(false);$('confirm').onclose=()=>resolve(false); });}
async function valid(){if(!account||!market||!signer)throw Error('当前钱包无法签署市场交易'); const chain=await window.ethereum.request({method:'eth_chainId'});const accounts=await window.ethereum.request({method:'eth_accounts'});if(Number(chain)!==config.chainId||accounts[0]?.toLowerCase()!==account.toLowerCase())throw Error('钱包或网络已变化，请重新连接');}
async function tx(promise){const t=await promise;message('交易已提交，等待链上确认：'+t.hash);const receipt=await t.wait();if(receipt.status!==1)throw Error('交易失败');}
async function approveNFT(id){if((await nft.getApproved(id)).toLowerCase()!==config.market.toLowerCase()&&!await nft.isApprovedForAll(account,config.market))await tx(nft.approve(config.market,id));}
async function action(text,fn){if(busy)return;busy=true;message('请核对并确认交易');const current=epoch;try{await valid();if(!await confirmation(text))return;await valid();await fn();if(current===epoch){await refresh();message('交易成功，已刷新链上状态');}}catch(e){message('操作失败：'+(e.shortMessage||e.message));}finally{busy=false;}}
async function restoreWallet(){
 const current=++epoch;
 try{
  let address;
  const response=await fetch('./api/agentic-wallet/pairing',{credentials:'same-origin',cache:'no-store'}).catch(()=>null);
  if(response?.ok){
   const session=await response.json();
   if(session.status==='authorized')address=getAddress(session.address);
  }
  const wallet=window.ethereum;
  const accounts=await wallet?.request({method:'eth_accounts'}).catch(()=>[])??[];
  const chain=await wallet?.request({method:'eth_chainId'}).catch(()=>null);
  const available=Number(chain)===config.chainId&&accounts[0]?getAddress(accounts[0]):null;
  address??=available;
  if(current!==epoch)return;
  if(!address){
   $('connect').hidden=false;
   $('activation').textContent='请先在首页完成钱包授权';
   return;
  }
  const browser=available===address?new BrowserProvider(wallet):null;
  const runner=browser?await browser.getSigner(address):null;
  const reader=browser??new JsonRpcProvider('https://bsc-dataseed.bnbchain.org',config.chainId);
  const m=new Contract(getAddress(config.market),marketABI,runner??reader);
  const [boundNFT,boundToken]=await Promise.all([m.nft(),m.paymentToken()]);
  if(getAddress(boundNFT)!==getAddress(config.nft)||getAddress(boundToken)!==getAddress(config.token)){
   throw Error('市场绑定地址不匹配');
  }
  const payment=new Contract(config.token,tokenABI,runner??reader);
  const precision=Number(await payment.decimals());
  if(current!==epoch)return;
  provider=reader;signer=runner;account=address;market=m;
  nft=new Contract(config.nft,nftABI,runner??reader);token=payment;decimals=precision;
  $('connect').hidden=true;
  await refresh();
  if(current===epoch)message(signer?'':'已复用首页授权。当前可查询市场状态，锁定 Star 和交易需要同一钱包的签名能力。');
 }catch(e){
  if(current===epoch)message('无法读取市场：'+(e.shortMessage||e.message));
 }
}
async function loadOrders(){if(!activated)return;const current=epoch;const start=orderCursor;if(start>=orderEnd)return;const [page,next]=await market.getListings(start,100);const rows=await Promise.all(page.map(async(o,i)=>({id:start+BigInt(i),seller:o.seller,tokenId:o.tokenId,price:o.price,status:o.status,buyer:o.buyer,kind:await nft.kind(o.tokenId)})));if(current!==epoch)return;orders.push(...rows);orderCursor=next;await resolveNames(rows.filter(o=>Number(o.status)===1).map(o=>o.seller),current);if(current!==epoch)return;render();}
async function loadNFTs(){const current=epoch;const end=nftCursor+100n<nftEnd?nftCursor+100n:nftEnd;const ids=[];for(let id=nftCursor;id<end;id++)ids.push(id);const rows=await Promise.all(ids.map(async id=>{try{const owner=await nft.ownerOf(id);return owner.toLowerCase()===account.toLowerCase()?{id,kind:Number(await nft.kind(id))}:null;}catch(e){ // Burned IDs are absent; RPC failures must still surface.
try{if(Number(await nft.kind(id))===0)return null;}catch{}throw e;}}));if(current!==epoch)return;owned.push(...rows.filter(Boolean));nftCursor=end;render();}
async function refresh(){if(!account||!market)throw Error('请先在首页完成钱包授权');const current=epoch;const [a,b,end,nEnd]=await Promise.all([market.activated(account),token.balanceOf(account),market.nextListingId(),nft.nextId()]);if(current!==epoch)return;activated=a;render();names=new Map();$('myShopName').textContent=await shopName(provider,account,config.chainId);if(current!==epoch)return;orders=[];owned=[];orderCursor=1n;nftCursor=1n;orderEnd=end;nftEnd=nEnd;$('wallet').textContent=account+' · '+formatUnits(b,decimals)+' 3SHAPE';$('activation').textContent=a?'已激活：永久交易权限':'未激活：需永久锁定一枚 Star，无法赎回';await loadOrders();await loadNFTs();render();}
function row(text){const e=document.createElement('div');e.className='order';e.textContent=text;return e;}
function button(parent,text,fn){const b=document.createElement('button');b.textContent=text;b.onclick=fn;parent.append(b);}
async function resolveNames(sellers,current){await Promise.all([...new Set(sellers)].map(async seller=>{if(names.has(seller.toLowerCase()))return;const name=await shopName(provider,seller,config.chainId);if(current===epoch)names.set(seller.toLowerCase(),name);}));}
function span(className,text){const e=document.createElement('span');e.className=className;e.textContent=text;return e;}
function demoOrders(){return Array.from({length:demoCount},(_,i)=>({id:BigInt(i+1),seller:'demo-'+i,tokenId:BigInt(100+i),kind:(i%8)+1,price:BigInt((i+1)*1000000)*10n**18n,status:1}));}
function render(){
 $('stars').replaceChildren();$('fruits').replaceChildren();for(const o of owned)option($(o.kind===9?'stars':'fruits'),o.id,FRUITS[o.kind]+' #'+o.id);
 $('marketGate').hidden=demo||activated;$('marketContent').hidden=!demo&&!activated;
 $('activate').disabled=!signer||activated||!owned.some(o=>o.kind===9);$('moreStars').disabled=!account||nftCursor>=nftEnd;$('moreOrders').disabled=!demo&&orderCursor>=orderEnd;$('moreNFTs').disabled=nftCursor>=nftEnd;
 $('orders').replaceChildren();$('mine').replaceChildren();const visible=activeOrders(demo?demoOrders():orders,$('filter').value);
 $('cheapest').textContent=visible.length?(demo?'示例单价':'已加载最低单价')+'：'+formatUnits(visible[0].price,decimals??18)+' 3SHAPE · 店铺按最低单价排列':'暂无有效订单';
 const shops=new Map();for(const o of visible){if(!shops.has(o.seller))shops.set(o.seller,[]);shops.get(o.seller).push(o);}
 for(const [seller,items] of shops){const shop=document.createElement('div');shop.className='shop';const head=document.createElement('div');head.className='shop-head';const name=demo?['orchard.ai','lemon.ai','berry.ai','summer.ai','grape.ai','mango.ai','garden.ai','pear.ai','cherry.ai','melon.ai'][Number(items[0].id-1n)%10]:(names.get(seller.toLowerCase())||'身份名称暂不可用');head.append(span('shop-name',name));const note=document.createElement('small');note.textContent=demo?'示例商铺':seller.slice(0,6)+'…'+seller.slice(-4);note.title=demo?'只读示例':seller;head.append(note);shop.append(head);button(head,'进入商铺',()=>{if(account&&seller.toLowerCase()===account.toLowerCase()){openMyShop();return;}$('storeTitle').textContent=name;$('storeItems').replaceChildren();for(const strip of shop.querySelectorAll('.fruit-strip')){const copy=strip.cloneNode(true);copy.querySelector('button').onclick=()=>{$('storePanel').close();strip.querySelector('button').click();};$('storeItems').append(copy);}$('storePanel').showModal();});
 for(const o of items){const strip=document.createElement('div');strip.className='fruit-strip';const fruit=span('fruit-name',FRUITS[Number(o.kind)]);const id=document.createElement('small');id.textContent=demo?'示例':'#'+o.tokenId;fruit.append(id);const price=span('fruit-price',formatUnits(o.price,decimals??18).replace(/\.0$/,''));const unit=document.createElement('small');unit.textContent='3SHAPE / 枚';price.append(unit);strip.append(fruit,price);button(strip,demo?'示例':account&&seller.toLowerCase()===account.toLowerCase()?'管理':'购买',()=>{if(account&&seller.toLowerCase()===account.toLowerCase()){openMyShop();return;}return action(`向 ${name} 购买 ${FRUITS[Number(o.kind)]} #${o.tokenId}，单价 ${formatUnits(o.price,decimals)} 3SHAPE，卖家 ${seller}`,async()=>{if(!activated)throw Error('请先激活市场');if(await token.allowance(account,config.market)<o.price)await tx(token.approve(config.market,o.price));await valid();await tx(market.buy(o.id,o.price));});});if(demo||!signer)strip.querySelector('button').disabled=true;shop.append(strip);}
 $('orders').append(shop);}
 if(account)for(const o of orders){if(o.seller.toLowerCase()===account.toLowerCase()||o.buyer.toLowerCase()===account.toLowerCase()){const text=`${FRUITS[Number(o.kind)]||'水果'} #${o.tokenId} · ${formatUnits(o.price,decimals)} 3SHAPE`;const e=row(text+' · '+['不存在','上架中','已取消','已成交'][Number(o.status)]);if(signer&&Number(o.status)===1&&o.seller.toLowerCase()===account.toLowerCase())button(e,'取消上架',()=>action('取消 '+text,()=>tx(market.cancel(o.id))));$('mine').append(e);}}
 $('feedState').textContent=demo?'只读布局示例 · 上滑加载更多':orderCursor>=orderEnd?'已加载全部订单':'上滑加载更多店铺';
}
$('network').onclick=async()=>{try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x38'}]});}catch(e){message(e.message);}};
for(const [id,fn] of [['refresh',refreshFeed],['moreOrders',nextFeed],['moreNFTs',loadNFTs],['moreStars',loadNFTs]])$(id).onclick=async()=>{if(busy)return;busy=true;try{await fn();}catch(e){message('查询失败：'+(e.shortMessage||e.message));}finally{busy=false;}};
$('filter').onchange=render;
$('activate').onclick=()=>{const id=$('stars').value;if(!id)return message('请选择已加载的 Star');action('永久锁定 Star #'+id+'。无法赎回或取回。',async()=>{await approveNFT(id);await valid();await tx(market.activate(id));});};
$('list').onclick=()=>{try{const id=$('fruits').value;if(!id)throw Error('请选择水果');const price=amount($('price').value,decimals);action('上架水果 #'+id+'，售价 '+formatUnits(price,decimals)+' 3SHAPE，水果转入市场托管。',async()=>{if(!activated)throw Error('请先激活市场');await approveNFT(id);await valid();await tx(market.list(id,price));});}catch(e){message(e.message);}};
function invalidate(){epoch++;names.clear();$('myShopName').textContent='连接钱包后显示 .ai ID';account=null;signer=null;market=null;orders=[];owned=[];activated=false;render();$('wallet').textContent='钱包或网络已变化，请重新连接';$('activation').textContent='请重新连接';$('orders').replaceChildren();$('mine').replaceChildren();$('stars').replaceChildren();$('fruits').replaceChildren();$('confirm').close();$('shopPanel').close();$('storePanel').close();message('钱包或网络已变化');if(!demo)void restoreWallet();}
window.ethereum?.on('accountsChanged',invalidate);window.ethereum?.on('chainChanged',invalidate);
message(config.market?'请连接钱包读取链上状态':'市场尚未部署配置。请由项目维护者填写 market-config.mjs 并构建静态页面。');

async function refreshFeed(){if(demo){demoCount=10;render();message('布局示例已刷新 · 非真实挂单');}else await refresh();}
async function nextFeed(){if(demo){demoCount=Math.min(demoCount+10,100);render();}else await loadOrders();}
const feed=$('marketFeed');let previousScroll=0,startY=null,pull=0;
feed.addEventListener('scroll',async()=>{const down=feed.scrollTop>previousScroll;previousScroll=feed.scrollTop;if(!down||busy||feed.scrollTop+feed.clientHeight<feed.scrollHeight-70)return;busy=true;try{await nextFeed();}catch(e){message('加载失败，请重试：'+(e.shortMessage||e.message));}finally{busy=false;}},{passive:true});
feed.addEventListener('touchstart',e=>{startY=feed.scrollTop<=0?e.touches[0].clientY:null;pull=0;},{passive:true});
feed.addEventListener('touchmove',e=>{if(startY===null)return;pull=Math.max(0,e.touches[0].clientY-startY);$('pullHint').textContent=pull>=60?'松开刷新店铺':'继续下拉刷新';},{passive:true});
feed.addEventListener('touchend',async()=>{const shouldRefresh=pull>=60;startY=null;pull=0;$('pullHint').textContent='下拉刷新 · 上滑浏览更多店铺';if(!shouldRefresh||busy)return;busy=true;try{await refreshFeed();}catch(e){message('刷新失败，请重试：'+(e.shortMessage||e.message));}finally{busy=false;}},{passive:true});
$('demoNotice').hidden=!demo;render();if(!demo)void restoreWallet();
function openMyShop(){if(!demo&&!activated)return;if(demo){$('myShopName').textContent='你的 .ai 商铺 · 只读布局示例';$('fruits').replaceChildren();for(let k=1;k<=8;k++)option($('fruits'),k,FRUITS[k]+'（示例）');$('activate').disabled=true;}$('list').disabled=demo||!signer;$('shopPanel').showModal();}
$('openMyShop').onclick=openMyShop;$('closeMyShop').onclick=()=>$('shopPanel').close();$('closeStore').onclick=()=>$('storePanel').close();
