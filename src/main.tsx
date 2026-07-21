import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Najwyżej jak się da: błąd w dowolnym miejscu drzewa ma dać komunikat
        i drogę wyjścia, a nie białą stronę w środku partii. */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
