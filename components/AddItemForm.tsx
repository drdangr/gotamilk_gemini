import React, { useState } from 'react';
import { useShoppingList } from '../hooks/useShoppingList';
import { Mic, Send } from 'lucide-react';

const AddItemForm: React.FC = () => {
  const [itemName, setItemName] = useState('');
  const { processTextCommand, loading } = useShoppingList();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (itemName.trim()) {
      processTextCommand(itemName.trim());
      setItemName('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Mic className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={itemName}
        onChange={(e) => setItemName(e.target.value)}
        placeholder="Say or type '2kg tomatoes' or 'remove bread'"
        className="w-full pl-10 pr-12 py-3 text-base bg-gray-100 dark:bg-gray-700 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        disabled={loading}
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
         <button
            type="submit"
            className="p-2 rounded-full text-indigo-500 hover:bg-indigo-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            disabled={loading || !itemName.trim()}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
};

export default AddItemForm;
