import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = '<div style="padding: 20px; color: red; font-family: monospace;">Error: Root element not found</div>';
  throw new Error('Root element (#root) not found in DOM');
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('✅ React app initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize React app:', error);
  rootElement.innerHTML = `<div style="padding: 20px; background: #fee; color: #c33; font-family: monospace;"><strong>App Initialization Error:</strong><pre>${error.message}</pre></div>`;
  throw error;
}
