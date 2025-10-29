import React, { useState } from 'react';
import { X } from 'lucide-react';

interface GroupProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (aliasName: string) => void;
  selectedCount: number;
}

const GroupProductsModal: React.FC<GroupProductsModalProps> = ({ isOpen, onClose, onConfirm, selectedCount }) => {
  const [aliasName, setAliasName] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    if (aliasName.trim()) {
      onConfirm(aliasName.trim());
      setAliasName(''); // Reset for next time
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Group {selectedCount} Products</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Enter a new group name (alias) for the selected products. If the name already exists, they will be added to that group.
        </p>
        <div>
          <label htmlFor="aliasName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Group Name
          </label>
          <input
            id="aliasName"
            type="text"
            value={aliasName}
            onChange={(e) => setAliasName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Cucumbers, Dairy Products"
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
        </div>
        <div className="flex justify-end items-center space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none transition"
          >
            Cancel
          </button>
           <button
            onClick={handleConfirm}
            disabled={!aliasName.trim()}
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Group Products
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupProductsModal;
