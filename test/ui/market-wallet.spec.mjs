import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import solc from 'solc';
import ganache from 'ganache';
import {ethers} from 'ethers';
test('wallet activation, escrow listing and 3SHAPE purchase restore after refresh',async({page})=>{
 test.setTimeout(120000);
 const rpc=ganache.provider({chain:{chainId:56},logging:{quiet:true}});
 try {
 const provider=new ethers.BrowserProvider(rpc,undefined,{cacheTimeout:-1});provider.pollingInterval=10;
 const seller=await provider.getSigner(0),buyer=await provider.getSigner(1);const s=await seller.getAddress(),b=await buyer.getAddress();let wallet=s;
 const paths=['contracts/ThreeShapeV29.sol','contracts/ThreeShapeFruitMarketV29.sol'];
 const output=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:Object.fromEntries(paths.map(p=>[p,{content:fs.readFileSync(p,'utf8')}])),settings:{optimizer:{enabled:true,runs:200},outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}}),{import:p=>({contents:fs.readFileSync('node_modules/'+p,'utf8')})}));
 async function deploy(file,name,args){const a=output.contracts[file][name];const c=await new ethers.ContractFactory(a.abi,a.evm.bytecode.object,seller).deploy(...args);await c.waitForDeployment();return c;}
 const nft=await deploy(paths[0],'ThreeShapeNFTV29',[s]);const token=await deploy(paths[0],'ThreeShapeTokenV29',[s,s]);const market=await deploy(paths[1],'ThreeShapeFruitMarketV29',[nft.target,token.target]);
 const send=async p=>(await p).wait();await send(nft.mintTo(s,9));await send(nft.mintTo(s,1));await send(nft.mintTo(b,9));await send(token.mintPlayer(b,ethers.parseEther('100')));
 await page.route('**/market-config.mjs',route=>route.fulfill({contentType:'text/javascript',body:`export const config=${JSON.stringify({chainId:56,market:market.target,nft:nft.target,token:token.target})};`}));
 await page.exposeFunction('walletRPC',async p=>{
 if(p.method==='eth_requestAccounts'||p.method==='eth_accounts')return [wallet];
 return rpc.request(p);
 });
 await page.addInitScript(()=>{window.ethereum={listeners:{},on(event,fn){this.listeners[event]=fn;},request(p){return window.walletRPC(p);}};});
 await page.goto('/fruit-market.html');await page.locator('#connect').click();await page.locator('#openMyShop').click();await expect(page.locator('#activation')).toContainText('未激活');
 await expect(page.locator('#stars option')).toHaveCount(1);await page.locator('#activate').click();await expect(page.locator('#confirmation')).toContainText('无法赎回');await page.locator('#yes').click();await expect(page.locator('#activation')).toContainText('已激活',{timeout:20000});
 await page.locator('#price').fill('12.000000000000000001');await page.locator('#list').click();await expect(page.locator('#confirmation')).toContainText('12.000000000000000001');await page.locator('#yes').click();await expect(page.locator('#orders')).toContainText('12.000000000000000001',{timeout:20000});
 expect(await nft.ownerOf(2)).toBe(market.target);
 wallet=b;await page.evaluate(()=>window.ethereum.listeners.accountsChanged([]));await page.locator('#connect').click();await page.locator('#openMyShop').click();await expect(page.locator('#activation')).toContainText('未激活');await expect(page.locator('#stars option')).toHaveCount(1);await page.locator('#activate').click();await page.locator('#yes').click();await expect(page.locator('#activation')).toContainText('已激活',{timeout:20000});
 await page.locator('#closeMyShop').click();await page.locator('#orders').getByRole('button',{name:'购买',exact:true}).click();await expect(page.locator('#confirmation')).toContainText('3SHAPE');await page.locator('#yes').click();await expect(page.getByRole('status')).toContainText('交易成功',{timeout:20000});expect(await nft.ownerOf(2)).toBe(b);expect(await token.balanceOf(s)).toBe(ethers.parseEther('12.000000000000000001'));
 await page.reload();await page.locator('#connect').click();await page.locator('#openMyShop').click();await expect(page.locator('#activation')).toContainText('已激活');await expect(page.locator('#orders .order')).toHaveCount(0);await expect(page.locator('#mine')).toContainText('已成交');
 } finally {await rpc.disconnect();}
});
