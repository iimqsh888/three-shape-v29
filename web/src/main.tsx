import React from 'react';
import {createRoot} from 'react-dom/client';
import {Website} from './website/Website';
import './style.css';
import './website/website.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Website/></React.StrictMode>);
