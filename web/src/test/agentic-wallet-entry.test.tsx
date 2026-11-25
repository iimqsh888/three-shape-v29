import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {AgenticWalletEntry} from '../website/AgenticWalletEntry';
import {LanguageContext} from '../i18n';

afterEach(()=>{
 cleanup();
 vi.unstubAllEnvs();
 vi.unstubAllGlobals();
});

function renderEntry(){
 render(<LanguageContext.Provider value="zh"><AgenticWalletEntry/></LanguageContext.Provider>);
 return screen.getByRole('button',{name:'连接 Agentic Wallet'});
}

it('does not start pairing on a static site without the authorization service',()=>{
 vi.stubEnv('VITE_THREE_SHAPE_AGENTIC_PAIRING','');
 expect(renderEntry()).toBeDisabled();
});

it.each([
 'https://web3.binance.com/en/agent-login?url=example%2Bvalue',
 'https://app.binance.com/uni-qr/Example123',
])('preserves the exact official pairing URL %s',async urlForWeb=>{
 vi.stubEnv('VITE_THREE_SHAPE_AGENTIC_PAIRING','enabled');
 const fetcher=vi.fn(async (_url,options)=>new Response(JSON.stringify(options.method==='POST'
  ? {urlForWeb,pairingCode:'012345',expireAt:String(Date.now()+60_000)}
  : {status:'pending'})));
 vi.stubGlobal('fetch',fetcher);
 fireEvent.click(renderEntry());
 expect(await screen.findByRole('link',{name:'打开币安授权'})).toHaveAttribute('href',urlForWeb);
 expect(screen.getByText('012345')).toBeVisible();
 expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/api/agentic-wallet/pairing'),expect.objectContaining({method:'POST',credentials:'same-origin'}));
});

it('rejects authorization links outside the official hostname',async()=>{
 vi.stubEnv('VITE_THREE_SHAPE_AGENTIC_PAIRING','enabled');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({
  urlForWeb:'https://web3.binance.com.example.org/en/agent-login',
  pairingCode:'012345',expireAt:Date.now()+60_000,
 }))));
 fireEvent.click(renderEntry());
 await screen.findByRole('alert');
 expect(screen.queryByRole('link')).toBeNull();
});

it('shows successful wallet authorization when the page regains focus',async()=>{
 vi.stubEnv('VITE_THREE_SHAPE_AGENTIC_PAIRING','enabled');
 const address='0x1111111111111111111111111111111111111111';
 let authorized=false;
 vi.stubGlobal('fetch',vi.fn(async (_url,options)=>new Response(JSON.stringify(options.method==='POST'
  ? {urlForWeb:'https://app.binance.com/uni-qr/Example123',pairingCode:'012345',expireAt:Date.now()+60_000}
  : authorized?{status:'authorized',address}:{status:'pending'}))));
 fireEvent.click(renderEntry());
 await screen.findByText('等待币安 App 确认');
 authorized=true;
 fireEvent.focus(window);
 expect(await screen.findByText(/钱包授权成功/)).toBeVisible();
 expect(screen.getByText(address)).toBeVisible();
 expect(screen.queryByRole('link',{name:'打开币安授权'})).toBeNull();
});
