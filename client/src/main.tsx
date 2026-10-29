import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { Toaster } from '@/components/ui/sonner';
import './styles/globals.css';
import './app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>
);
