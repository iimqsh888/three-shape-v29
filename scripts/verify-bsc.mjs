import path from 'node:path';
import {parseArgs} from 'node:util';
import {loadBundle} from './verification/records.mjs';
import {verifyBundle} from './verification/verify.mjs';
import {readProvider} from './verification/provider.mjs';
const {values}=parseArgs({options:{bundle:{type:'string'},'chain-id':{type:'string'},explorer:{type:'string',default:'bscscan'}}});
if(!values.bundle||!['bscscan','etherscan-v2'].includes(values.explorer))throw Error('Usage: --bundle saved-verification-directory [--chain-id 56|97] [--explorer bscscan|etherscan-v2]');
const directory=path.resolve(values.bundle),{bundle}=loadBundle(directory),provider=readProvider(bundle.chainId);
try{const report=await verifyBundle({directory,provider,chainId:values['chain-id']});console.log('BscScan source verification:',report.contracts.map(r=>`${r.id}=${r.status}`).join(', '));if(!report.allRequiredContractsVerified)process.exitCode=1;}
catch(error){console.error(error.code?'Source verification could not complete; retry the saved bundle without redeploying.':error.message);process.exitCode=1;}
finally{provider.destroy();}
