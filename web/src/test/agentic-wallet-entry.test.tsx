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

it('shows the pairing code with the exact official URL returned by the service',async()=>{
 vi.stubEnv('VITE_THREE_SHAPE_AGENTIC_PAIRING','enabled');
 const urlForWeb='https://web3.binance.com/en/agent-login?url=example%2Bvalue';
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({
  urlForWeb,pairingCode:'012345',expireAt:Date.now()+60_000,
 })));
 vi.stubGlobal('fetch',fetcher);
 fireEvent.click(renderEntry());
 expect(await screen.findByRole('link',{name:'打开币安授权页'})).toHaveAttribute('href',urlForWeb);
 expect(screen.getByRole('status')).toHaveTextContent('012345');
 expect(fetcher).toHaveBeenCalledWith(expect.objectContaining({
  pathname:'/api/agentic-wallet/pairing',
 }),expect.objectContaining({method:'POST',credentials:'same-origin'}));
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
