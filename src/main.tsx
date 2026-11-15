import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './components/ThemeContext.tsx';

// Suppress benign Vite WebSocket / HMR disconnection errors that are expected
// in the sandboxed preview environment where HMR is disabled.
if (typeof window !== 'undefined') {
  const ignorePatterns = [
    'websocket',
    'web socket',
    'closed without opened',
    'failed to connect to websocket',
    'vite'
  ];

  const shouldIgnore = (msg: string): boolean => {
    if (!msg) return false;
    const lower = msg.toLowerCase();
    return ignorePatterns.some(pattern => lower.includes(pattern));
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason) {
      const message = typeof reason === 'string' ? reason : (reason.message || '');
      if (shouldIgnore(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }, true);

  window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (shouldIgnore(message)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);

