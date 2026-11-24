import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {captureDeployment} from './verification/records.mjs';
import {readProvider} from './verification/provider.mjs';
const {values}=parseArgs({options:{manifest:{type:'string'},out:{type:'string'},artifacts:{type:'string',default:'artifacts'}}});
if(!values.manifest)throw Error('Usage: --manifest path/to/deployment.json [--out directory] [--artifacts original-build-directory]');
const manifest=JSON.parse(fs.readFileSync(values.manifest)),directory=path.resolve(values.out??path.join(path.dirname(values.manifest),'verification'));
const provider=readProvider(manifest.chainId);
try{const bundle=await captureDeployment({manifest,directory,provider,artifactsDirectory:values.artifacts});console.log('Saved source verification bundle:',directory,'contracts:',bundle.records.length);}
catch(error){console.error(error.code?'Unable to prepare verification bundle; check the RPC and saved compiler input.':error.message);process.exitCode=1;}
finally{provider.destroy();}
