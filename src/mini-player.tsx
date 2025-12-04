import React from 'react';
import ReactDOM from 'react-dom/client';
import MiniPlayerApp from './MiniPlayerApp';
import './polyfills';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MiniPlayerApp />
  </React.StrictMode>
);
