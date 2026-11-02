import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { initApi, isNativeApp } from '@/lib/api-config';

import './index.css';

// Point every /api request at the right backend (same-origin on the web,
// the deployed server inside the Android app) before anything renders.
initApi();
if (isNativeApp()) document.documentElement.dataset.native = '1';

// Belt and braces: Clerk's "Development mode" ribbon is switched off in the appearance options,
// and anything that still slips through is hidden here.
const hideDevBadge = () => {
  document.querySelectorAll<HTMLElement>('[class*="cl-"] *').forEach(el => {
    if (el.children.length === 0 && el.textContent?.trim() === 'Development mode') {
      let target: HTMLElement = el;
      while (target.parentElement && target.parentElement.textContent?.trim() === 'Development mode') target = target.parentElement;
      target.style.display = 'none';
    }
  });
};
new MutationObserver(hideDevBadge).observe(document.body, { childList: true, subtree: true });

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
