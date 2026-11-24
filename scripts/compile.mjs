import fs from 'node:fs';
import solc from 'solc';
const sources={};for(const file of ['contracts/ThreeShapeV29.sol','contracts/ThreeShapeDeploymentV29.sol','contracts/test/MocksV29.sol','contracts/test/SecurityV29.sol','contracts/ThreeShapeFruitMarketV29.sol','contracts/test/MarketActorsV29.sol'])sources[file]={content:fs.readFileSync(file,'utf8')};
const settings={optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object','evm.deployedBytecode.immutableReferences','storageLayout']}}};
const output=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources,settings}),{import:name=>{try{return{contents:fs.readFileSync('node_modules/'+name,'utf8')}}catch{return{error:'Missing '+name}}}}));
const errors=(output.errors??[]).filter(e=>e.severity==='error');if(errors.length)throw new Error(errors.map(e=>e.formattedMessage).join('\n'));
fs.rmSync('artifacts',{recursive:true,force:true});fs.mkdirSync('artifacts',{recursive:true});
for(const [file,contracts]of Object.entries(output.contracts))for(const [name,a]of Object.entries(contracts)){
 if(!file.startsWith('contracts/'))continue;
 const init=a.evm.bytecode.object.length/2,runtime=a.evm.deployedBytecode.object.length/2;
 if(init>49152||runtime>24576)throw new Error(name+' exceeds EVM bytecode size limits');
 if(init)console.log(name,`init=${init}, runtime=${runtime} bytes`);
 fs.writeFileSync(`artifacts/${name}.json`,JSON.stringify({abi:a.abi,bytecode:'0x'+a.evm.bytecode.object,deployedBytecode:'0x'+a.evm.deployedBytecode.object,immutableReferences:a.evm.deployedBytecode.immutableReferences,settings,compiler:solc.version()}));
}
fs.writeFileSync('artifacts/compiler-output.json',JSON.stringify(output));
