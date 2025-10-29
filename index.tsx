import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ShoppingListProvider } from './hooks/useShoppingList';
import { AuthProvider } from './providers/AuthProvider';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ShoppingListProvider>
        <App />
      </ShoppingListProvider>
    </AuthProvider>
  </React.StrictMode>
);