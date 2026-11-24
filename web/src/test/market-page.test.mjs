import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import page from '../../fruit-market.html?raw';

beforeEach(()=>{
 vi.resetModules();
 document.body.innerHTML=page.match(/<main>[\s\S]*<\/main>/)[0];
 Object.defineProperty(window,'ethereum',{value:undefined,configurable:true});
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:vi.fn(function(){this.setAttribute('open','');})});
});
afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks();});

it('the restored market runs its shop page and disables example purchases when unconfigured',async()=>{
 await import('../../market.mjs');
 expect(document.querySelector('#message')).toHaveTextContent('市场尚未部署配置');
 expect(document.querySelector('#demoNotice')).not.toHaveAttribute('hidden');
 expect(document.querySelectorAll('.shop')).toHaveLength(10);
 for(const button of document.querySelectorAll('.fruit-strip button'))expect(button).toBeDisabled();
 document.querySelector('.shop-head button').click();
 expect(document.querySelector('#storePanel')).toHaveAttribute('open');
 expect(document.querySelector('#storeTitle')).toHaveTextContent('orchard.ai');
 document.querySelector('#openMyShop').click();
 expect(document.querySelector('#shopPanel')).toHaveAttribute('open');
 expect(document.querySelector('#list')).toBeDisabled();
 expect(document.querySelector('#activate')).toBeDisabled();
});
it('an unavailable wallet cannot be reported as connected or execute a market transaction',async()=>{
 await import('../../market.mjs');
 document.querySelector('#connect').click();
 await vi.waitFor(()=>expect(document.querySelector('#message')).toHaveTextContent('未检测到钱包'));
 expect(document.querySelector('#activation')).toHaveTextContent('请连接钱包');
});
