import {test,expect} from '@playwright/test';
test('market page is reachable and fails closed without deployment addresses',async({page})=>{await page.goto('/fruit-market.html');await expect(page.getByRole('heading',{name:'水果交易市场',exact:true})).toBeVisible();await expect(page.getByRole('status')).toContainText('市场尚未部署配置');await expect(page.locator('#activation')).toHaveText('请连接钱包');await page.reload();await expect(page.getByRole('status')).toContainText('市场尚未部署配置');});
test('missing wallet is clearly reported',async({page})=>{await page.goto('/fruit-market.html');await page.locator('#connect').click();await expect(page.getByRole('status')).toContainText('未检测到钱包');});
test('BSC switching requests chain 56 from injected wallet',async({page})=>{await page.addInitScript(()=>{window.ethereum={on(){},async request(p){window.lastRequest=p;}};});await page.goto('/fruit-market.html');await page.locator('#network').click();await expect.poll(()=>page.evaluate(()=>window.lastRequest)).toEqual({method:'wallet_switchEthereumChain',params:[{chainId:'0x38'}]});});
for(const width of [390,1280])test(`layout fits viewport ${width}`,async({page})=>{await page.setViewportSize({width,height:900});await page.goto('/fruit-market.html');await expect(page.locator('#connect')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('#list')).toBeVisible();});
for(const width of [390,1280])test(`homepage market and season entries match dimensions at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.goto('/');
 const market=page.getByRole('button',{name:/水果交易市场/});
 const season=page.getByRole('button',{name:/九果迷阵 · 赛季赛/});
 await expect(market).toBeVisible();await expect(season).toBeVisible();
 const a=await market.boundingBox(),b=await season.boundingBox();
 expect(a.width).toBe(b.width);expect(a.height).toBe(b.height);expect(a.y+a.height).toBeLessThan(b.y);
 const properties=['borderRadius','backgroundColor','border','boxShadow','fontFamily','fontSize','padding'];
 const styles=async el=>el.evaluate((e,props)=>Object.fromEntries(props.map(p=>[p,getComputedStyle(e)[p]])),properties);
 expect(await styles(market)).toEqual(await styles(season));
 await market.click();await expect(page).toHaveURL(/fruit-market.html$/);await expect(page.locator('#activation')).toBeVisible();
});
