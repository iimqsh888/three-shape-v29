import path from 'node:path';
import {captureDeployment} from './records.mjs';
import {verifyBundle} from './verify.mjs';
/** Called only after the caller has independently authorized and confirmed deployment. */
export async function afterAuthorizedDeployment({manifest,directory,provider,artifactsDirectory='artifacts',apiKey=process.env.ETHERSCAN_API_KEY}){
 const verificationDirectory=path.join(directory,'verification');
 await captureDeployment({manifest,directory:verificationDirectory,provider,artifactsDirectory});
 return verifyBundle({directory:verificationDirectory,provider,apiKey});
}
