import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useShoppingList } from '../hooks/useShoppingList';
import type { ConfirmationRequest } from '../types';

interface ConfirmationModalProps {
  request: ConfirmationRequest | null;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ request }) => {
  const { items, confirmAction, cancelAction } = useShoppingList();

  if (!request) {
    return null;
  }

  const affectedItems = items.filter(item => request.itemIds.includes(item.id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={cancelAction}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
             <AlertTriangle className="h-6 w-6 text-yellow-500" />
             <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Confirm Action</h2>
          </div>
          <button onClick={cancelAction} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {request.question}
        </p>
        
        {affectedItems.length > 0 && (
            <div className="max-h-32 overflow-y-auto bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg mb-4">
                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                    {affectedItems.map(item => <li key={item.id}>{item.name}</li>)}
                </ul>
            </div>
        )}

        <div className="flex justify-end items-center space-x-3 mt-6">
          <button
            onClick={cancelAction}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none transition"
          >
            Cancel
          </button>
           <button
            onClick={confirmAction}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;