import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import 'katex/dist/katex.min.css';
import './index.css';

// Import your publishable key (Vercel sometimes blocks VITE_ prefix, so we allow PUBLIC_ and CLERK_ as well)
const PUBLISHABLE_KEY = 
  (import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY || 
  (import.meta as any).env.PUBLIC_CLERK_PUBLISHABLE_KEY || 
  (import.meta as any).env.CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key. Please add PUBLIC_CLERK_PUBLISHABLE_KEY to your Vercel Environment Variables.");
}

import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <HelmetProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </HelmetProvider>
      </ClerkProvider>
    </ErrorBoundary>
  </StrictMode>,
);
