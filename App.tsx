import React, { useState } from 'react';
import { useShoppingList } from './hooks/useShoppingList';
import Header from './components/Header';
import ShoppingListView from './components/ShoppingListView';
import AddItemForm from './components/AddItemForm';
import ShareModal from './components/ShareModal';
import ProductDatabaseView from './components/ProductDatabaseView';
import ConfirmationModal from './components/ConfirmationModal';
import { List, Database } from 'lucide-react';

type ActiveView = 'list' | 'database';

const App: React.FC = () => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const { confirmationRequest } = useShoppingList();

  const renderActiveView = () => {
    switch (activeView) {
      case 'list':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Add or Manage Items</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                You can add multiple items (e.g., "2L milk, 1 loaf of bread") or manage your list (e.g., "remove all dairy").
              </p>
              <AddItemForm />
            </div>
            <ShoppingListView />
          </div>
        );
      case 'database':
        return <ProductDatabaseView />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-300">
        <Header onShareClick={() => setIsShareModalOpen(true)} />
        <main className="container mx-auto p-4 md:p-6 lg:p-8 max-w-4xl">
          <div className="mb-6">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveView('list')}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeView === 'list'
                    ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <List className="h-5 w-5" />
                <span>Shopping List</span>
              </button>
              <button
                onClick={() => setActiveView('database')}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeView === 'database'
                    ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Database className="h-5 w-5" />
                <span>Product Database</span>
              </button>
            </div>
          </div>
          {renderActiveView()}
        </main>
        <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
      </div>
      <ConfirmationModal request={confirmationRequest} />
    </>
  );
};

export default App;
