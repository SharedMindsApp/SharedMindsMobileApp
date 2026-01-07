// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 👉 Import Supabase and expose it for debugging
import { supabase } from './lib/supabase';

// Make Supabase available in browser devtools:
// Run: supabase.auth.getUser().then(console.log)
(window as any).supabase = supabase;

// ---- Mount App ----
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("❌ Root element #root not found in index.html");
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
