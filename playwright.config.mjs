import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'test/ui',use:{baseURL:'http://127.0.0.1:4173'},webServer:{command:'python3 -m http.server 4173 --directory web --bind 127.0.0.1',url:'http://127.0.0.1:4173/fruit-market.html',reuseExistingServer:false}});
