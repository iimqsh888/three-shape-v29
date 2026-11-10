import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({base:'./',plugins:[react()],build:{rollupOptions:{output:{manualChunks:(id:string)=>id.includes('/node_modules/')&&(/ethers|@noble|@adraffy|aes-js/.test(id))?'wallet':undefined}}},test:{fileParallelism:false,environment:'jsdom',setupFiles:['./src/test/setup.ts']}});
