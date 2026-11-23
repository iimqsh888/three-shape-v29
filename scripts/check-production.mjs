import {readdir,readFile} from 'node:fs/promises';
const directory=new URL('../web/dist/assets/',import.meta.url);
const files=(await readdir(directory)).filter(name=>name.endsWith('.js'));
const bundle=(await Promise.all(files.map(name=>readFile(new URL(name,directory),'utf8')))).join('\n');
for(const forbidden of ['supplyNextTier','setEligibility','setStage(','setSold(','MockAdapter','three-shape-preview-v4','alice.ai','bob.ai'])if(bundle.includes(forbidden))throw new Error(`Development fixture found in production assets: ${forbidden}`);
if(!files.length)throw new Error('No production JavaScript assets');
console.log('Production assets contain no development scenario controls or simulated wallet fixtures.');
